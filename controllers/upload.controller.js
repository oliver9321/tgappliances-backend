import { PutObjectCommand } from '@aws-sdk/client-s3'
import { s3, BUCKET } from '../utils/s3Client.js'
import { toStableImagePath, OBJECT_PREFIX } from '../utils/imageUrl.js'

/**
 * Uploads a file to the private bucket and returns a stable image path.
 *
 * The returned value (e.g. "/api/v1/images/products/IMG_7837.jpeg") is what gets
 * stored on the product. It never expires; the images route signs it on demand.
 */
async function uploadToS3(file) {
  if (!BUCKET) {
    throw new Error('AWS_S3_BUCKET_NAME environment variable is not set')
  }

  const key = `${OBJECT_PREFIX}${file.originalname}`

  await s3.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: file.buffer,
    ContentType: file.mimetype,
  }))

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
    res.status(500).json({ message: err.message || 'Upload failed' })
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
    res.status(500).json({ message: err.message || 'Upload failed' })
  }
}
