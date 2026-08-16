/**
 * Shared S3 client for the Railway Bucket that stores product images.
 *
 * The bucket is private (the provider does not support public buckets), so all
 * reads go through presigned URLs generated here.
 */
import { S3Client } from '@aws-sdk/client-s3'

export const BUCKET = process.env.AWS_S3_BUCKET_NAME || process.env.AWS_BUCKET_NAME

export const s3 = new S3Client({
  region: process.env.AWS_DEFAULT_REGION || 'auto',
  endpoint: process.env.AWS_ENDPOINT_URL || process.env.AWS_ENDPOINT,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
  // Railway's S3 endpoint works with path-style addressing.
  forcePathStyle: true,
})
