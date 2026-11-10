import { PutObjectCommand } from '@aws-sdk/client-s3'
import { v4 as uuidv4 } from 'uuid'
import { s3, BUCKET } from '../utils/s3Client.js'
import { toStableImagePath, OBJECT_PREFIX } from '../utils/imageUrl.js'
import { encodeWebp, warmVariants } from '../utils/imageVariants.js'

/** Longest side kept for the stored original. Phone photos are ~4000 px wide. */
const MAX_STORED_WIDTH = 2000
const STORED_QUALITY = 85

/** Formats that sharp may not handle well (animation, vectors): stored as-is. */
const PASSTHROUGH_TYPES = new Set(['image/gif', 'image/svg+xml'])

/**
 * Builds a unique, URL-safe object key so uploads never overwrite each other
 * and cached variants can be treated as immutable.
 */
function buildKey(originalName, extension) {
  const base = String(originalName || 'image')
    .replace(/\.[^.]+$/, '')
    .normalize('NFKD')
    .replace(/[^\w-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
    .slice(0, 60) || 'image'
  return `${OBJECT_PREFIX}${uuidv4()}-${base}.${extension}`
}

/**
 * Optimizes (WebP, EXIF-rotated, max 2000 px) and uploads a file to the
 * private bucket, then returns its stable image URL.
 */
async function uploadToS3(file) {
  if (!BUCKET) {
    throw new Error('AWS_S3_BUCKET_NAME environment variable is not set')
  }

  let body = file.buffer
  let contentType = file.mimetype
  let extension = (file.originalname.split('.').pop() || 'bin').toLowerCase()

  if (!PASSTHROUGH_TYPES.has(file.mimetype)) {
    try {
      const optimized = await encodeWebp(file.buffer, MAX_STORED_WIDTH, STORED_QUALITY)
      // Already-small files can grow when re-encoded; keep whichever is smaller.
      if (optimized.length < file.buffer.length) {
        body = optimized
        contentType = 'image/webp'
        extension = 'webp'
      }
    } catch (err) {
      // Corrupt file or a format browsers can't show anyway (e.g. HEIC).
      const error = new Error(`"${file.originalname}" is not a supported image. Use JPG, PNG or WebP.`)
      error.status = 400
      throw error
    }
  }

  const key = buildKey(file.originalname, extension)

  await s3.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: body,
    ContentType: contentType,
    CacheControl: 'public, max-age=31536000, immutable',
  }))

  // Pre-generate the sizes the storefront requests, so the first visitor
  // doesn't pay for resizing.
  warmVariants(key, body)

  return toStableImagePath(key)
}

export async function uploadImage(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file provided' })
    }
    const url = await uploadToS3(req.file)
    res.json({ url })
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message || 'Upload failed' })
  }
}

export async function uploadGallery(req, res) {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No files provided' })
    }
    const urls = await Promise.all(req.files.map(uploadToS3))
    res.json({ urls })
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message || 'Upload failed' })
  }
}
