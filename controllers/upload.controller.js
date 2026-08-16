import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { v4 as uuidv4 } from 'uuid'
import { toPresignedUrl } from '../utils/imageUrl.js'

// Defaults match the new bucket (tgappliances-images-n6tnzl) hosted at
// https://t3.storageapi.dev. AWS_DEFAULT_REGION / AWS_ENDPOINT_URL env vars
// can still override these for other environments.
const DEFAULT_REGION = 'auto'
const DEFAULT_ENDPOINT = 'https://t3.storageapi.dev'

const s3 = new S3Client({
  region: process.env.AWS_DEFAULT_REGION || DEFAULT_REGION,
  endpoint: process.env.AWS_ENDPOINT_URL || DEFAULT_ENDPOINT,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
  forcePathStyle: true,
})

/**
 * Uploads a file to S3 and returns a presigned URL via the presigner service.
 * The bucket stays private; the presigner service signs and redirects to
 * presigned URLs (1h expiration by default).
 * STORAGE_PUBLIC_URL (required) = base URL of the deployed s3-public-presigner service.
 */
async function uploadToS3(file) {
  const key = `products/${file.originalname}`

  await s3.send(new PutObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET_NAME,
    Key: key,
    Body: file.buffer, 
    ContentType: file.mimetype,
  }))

  // STORAGE_PUBLIC_URL is required — it points to the deployed s3-public-presigner
  // service, which signs and redirects to short-lived (1h by default) presigned URLs.
  // Falling back to a direct public bucket URL is not allowed for security reasons.
  if (!process.env.STORAGE_PUBLIC_URL) {
    throw new Error('STORAGE_PUBLIC_URL is not configured. The presigner service URL is required.')
  }

  const baseUrl = process.env.STORAGE_PUBLIC_URL.replace(/\/$/, '')
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
