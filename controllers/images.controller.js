/**
 * Serves product images from the private bucket behind stable, cacheable URLs.
 *
 * A request for /api/v1/images/products/IMG_7837.jpeg is answered with a 302
 * redirect to a short-lived presigned URL. The public URL never changes, so it
 * can be stored in the database, indexed by search engines and shared on social
 * networks, while the bucket itself stays private.
 */
import { GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { s3, BUCKET } from '../utils/s3Client.js'
import { OBJECT_PREFIX } from '../utils/imageUrl.js'

/** Lifetime of the generated presigned URL, in seconds. */
const SIGNED_URL_TTL = Number(process.env.PRESIGNED_URL_EXPIRATION_SECONDS) || 3600

/**
 * How long browsers/CDNs may cache the redirect itself. Kept below the signature
 * lifetime so a cached redirect can never outlive the URL it points to.
 */
const REDIRECT_MAX_AGE = Math.max(60, Math.floor(SIGNED_URL_TTL / 2))

export async function serveImage(req, res) {
  try {
    // Everything after /api/v1/images/ is the object key.
    const rawKey = decodeURIComponent(String(req.params[0] || ''))

    if (!rawKey) {
      return res.status(400).json({ message: 'Image key is required' })
    }

    // Only allow keys inside the products/ prefix, and reject traversal
    // attempts so this route can never read outside that folder.
    if (!rawKey.startsWith(OBJECT_PREFIX) || rawKey.includes('..')) {
      return res.status(400).json({ message: 'Invalid image key' })
    }

    if (!BUCKET) {
      return res.status(500).json({ message: 'Bucket is not configured' })
    }

    const signedUrl = await getSignedUrl(
      s3,
      new GetObjectCommand({ Bucket: BUCKET, Key: rawKey }),
      { expiresIn: SIGNED_URL_TTL }
    )

    res.set('Cache-Control', `public, max-age=${REDIRECT_MAX_AGE}`)
    return res.redirect(302, signedUrl)
  } catch (err) {
    return res.status(500).json({ message: 'Error resolving image', error: err.message })
  }
}
