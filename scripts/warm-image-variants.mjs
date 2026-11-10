/**
 * Pre-generates the WebP variants for every image already in the bucket, so
 * the first visitor after deploy does not pay for resizing.
 *
 * Safe to re-run: existing variants are skipped. Only writes under cache/.
 *
 * Usage:  node scripts/warm-image-variants.mjs [--concurrency=4]
 */
import 'dotenv/config'
import { ListObjectsV2Command, HeadObjectCommand } from '@aws-sdk/client-s3'
import { s3, BUCKET } from '../utils/s3Client.js'
import { OBJECT_PREFIX } from '../utils/imageUrl.js'
import { generateVariants, WARM_WIDTHS } from '../utils/imageVariants.js'

const concurrency = Number(
  (process.argv.find(a => a.startsWith('--concurrency=')) || '').split('=')[1]
) || 4

async function listKeys() {
  const keys = []
  let token
  do {
    const page = await s3.send(new ListObjectsV2Command({
      Bucket: BUCKET, Prefix: OBJECT_PREFIX, ContinuationToken: token,
    }))
    for (const obj of page.Contents || []) {
      if (!obj.Key.endsWith('/')) keys.push(obj.Key)
    }
    token = page.IsTruncated ? page.NextContinuationToken : undefined
  } while (token)
  return keys
}

async function exists(key) {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }))
    return true
  } catch {
    return false
  }
}

const started = Date.now()
const keys = await listKeys()
console.log(`Found ${keys.length} images. Widths: ${WARM_WIDTHS.join(', ')}`)

let done = 0, generated = 0, skipped = 0, failed = 0
const queue = [...keys]

async function worker() {
  while (queue.length) {
    const key = queue.shift()
    try {
      const r = await generateVariants(key, { skipExisting: exists })
      generated += r.generated
      skipped += r.skipped
    } catch (err) {
      failed++
      console.error(`  x ${key}: ${err.message}`)
    }
    done++
    if (done % 20 === 0 || done === keys.length) {
      console.log(`${done}/${keys.length} images processed`)
    }
  }
}

await Promise.all(Array.from({ length: concurrency }, worker))
console.log(`Done in ${Math.round((Date.now() - started) / 1000)}s. generated=${generated} skipped=${skipped} failed=${failed}`)
process.exit(failed ? 1 : 0)
