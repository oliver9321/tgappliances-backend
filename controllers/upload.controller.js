import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { v4 as uuidv4 } from 'uuid'

const s3 = new S3Client({
  region: process.env.AWS_DEFAULT_REGION,
  endpoint: process.env.AWS_ENDPOINT_URL,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
  forcePathStyle: true,
})

/**
 * Uploads a file to S3 and returns the public URL via the presigner service.
 * The bucket stays private; the presigner service redirects to presigned URLs.
 * STORAGE_PUBLIC_URL = base URL of the deployed s3-public-presigner service.
 */
async function uploadToS3(file) {
  const key = `products/${file.originalname}`

  await s3.send(new PutObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET_NAME,
    Key: key,
    Body: file.buffer,
    ContentType: file.mimetype,
  }))

  // Public URL — works with either the presigner service or a public bucket
  const baseUrl = (process.env.STORAGE_PUBLIC_URL || `${process.env.AWS_ENDPOINT_URL}/${process.env.AWS_S3_BUCKET_NAME}`).replace(/\/$/, '')
  return `${baseUrl}/${key}`
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
