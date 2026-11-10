/**
 * Serves product images from the private bucket behind stable, cacheable URLs.
 *
 * Two modes:
 *
 *  - GET /api/v1/images/products/IMG_7837.jpeg?w=320
 *      Returns a resized WebP directly (no redirect), generated once and cached
 *      in memory, in the bucket and in the browser/CDN for a year. This is what
 *      the storefront uses; it is the fast path.
 *
 *  - GET /api/v1/images/products/IMG_7837.jpeg
 *      302 redirect to a short-lived presigned URL of the original file. Kept
 *      for full-size viewing, social previews and backwards compatibility.
 */
import crypto from 'crypto'
import { GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { s3, BUCKET } from '../utils/s3Client.js'
import { OBJECT_PREFIX } from '../utils/imageUrl.js'
import { getVariant, normalizeWidth, VARIANT_VERSION } from '../utils/imageVariants.js'

/** Lifetime of the generated presigned URL, in seconds. */
const SIGNED_URL_TTL = Number(process.env.PRESIGNED_URL_EXPIRATION_SECONDS) || 3600

/**
 * How long browsers/CDNs may cache the redirect itself. Kept below the signature
 * lifetime so a cached redirect can never outlive the URL it points to.
 */
const REDIRECT_MAX_AGE = Math.max(60, Math.floor(SIGNED_URL_TTL / 2))

/** Variants never change for a given key + width + version, so cache them for a year. */
const VARIANT_CACHE_CONTROL = 'public, max-age=31536000, immutable'

function parseKey(req) {
  let rawKey
  try {
    rawKey = decodeURIComponent(String(req.params[0] || ''))
  } catch {
    return { error: 'Invalid image key' }
  }
  if (!rawKey) return { error: 'Image key is required' }

  // Only allow keys inside the products/ prefix, and reject traversal
  // attempts so this route can never read outside that folder.
  if (!rawKey.startsWith(OBJECT_PREFIX) || rawKey.includes('..')) {
    return { error: 'Invalid image key' }
  }
  return { key: rawKey }
}

async function sendVariant(req, res, key, width) {
  const buffer = await getVariant(key, width)
  if (!buffer) return res.status(404).json({ message: 'Image not found' })

  const etag = `"${VARIANT_VERSION}-${width}-${crypto.createHash('sha1').update(buffer).digest('base64url').slice(0, 16)}"`

  res.set({
    'Content-Type': 'image/webp',
    'Cache-Control': VARIANT_CACHE_CONTROL,
    ETag: etag,
    // Images are embedded from the storefront domain.
    'Cross-Origin-Resource-Policy': 'cross-origin',
  })

  if (req.headers['if-none-match'] === etag) return res.status(304).end()

  res.set('Content-Length', String(buffer.length))
  return res.status(200).end(buffer)
}

export async function serveImage(req, res) {
  try {
    const { key, error } = parseKey(req)
    if (error) return res.status(400).json({ message: error })

    if (!BUCKET) {
      return res.status(500).json({ message: 'Bucket is not configured' })
    }

    const width = normalizeWidth(req.query.w)
    if (width) return await sendVariant(req, res, key, width)

    const signedUrl = await getSignedUrl(
      s3,
      new GetObjectCommand({ Bucket: BUCKET, Key: key }),
      { expiresIn: SIGNED_URL_TTL }
    )

    res.set('Cache-Control', `public, max-age=${REDIRECT_MAX_AGE}`)
    return res.redirect(302, signedUrl)
  } catch (err) {
    console.error('serveImage error:', err)
    return res.status(500).json({ message: 'Error resolving image' })
  }
}
