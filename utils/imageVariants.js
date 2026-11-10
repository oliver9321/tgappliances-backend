/**
 * Resized image variants for fast delivery.
 *
 * Original product photos come straight from phones (often 3+ MB). Browsers only
 * need a small version for catalog cards, so this module produces WebP variants
 * at a fixed set of widths and caches them at three levels:
 *
 *   1. In-process memory (LRU, bounded by bytes) — instant for hot images.
 *   2. The bucket, under `cache/<version>/w<width>/...` — survives restarts and
 *      deploys, so each variant is generated only once.
 *   3. The browser/CDN, via long-lived immutable Cache-Control headers set by
 *      the images controller.
 *
 * Bump VARIANT_VERSION whenever the encoding settings change; old variants are
 * then ignored (and new URLs/ETags bust browser caches).
 */
import sharp from 'sharp'
import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3'
import { s3, BUCKET } from './s3Client.js'

export const VARIANT_VERSION = 'v1'

/** Allowed output widths. Requests are rounded up to the nearest one. */
export const VARIANT_WIDTHS = [160, 320, 480, 640, 960, 1280, 1600]

const WEBP_QUALITY = 78
const MEMORY_BUDGET_BYTES = Number(process.env.IMAGE_MEMORY_CACHE_MB || 64) * 1024 * 1024

// Keep sharp's own cache small; we cache final buffers ourselves.
sharp.cache({ memory: 50, files: 0, items: 100 })

/**
 * Rounds a requested width up to the nearest allowed width, so arbitrary
 * values cannot be used to fill the cache with unique variants.
 *
 * @param {unknown} value
 * @returns {number|null}
 */
export function normalizeWidth(value) {
  const n = Number.parseInt(String(value), 10)
  if (!Number.isFinite(n) || n <= 0) return null
  return VARIANT_WIDTHS.find(w => w >= n) ?? VARIANT_WIDTHS[VARIANT_WIDTHS.length - 1]
}

/** Bucket key where a variant is persisted. */
export function variantKey(objectKey, width) {
  // Keep the original extension so "a.jpg" and "a.png" never share a variant.
  return `cache/${VARIANT_VERSION}/w${width}/${objectKey}.webp`
}

// ─── In-memory LRU (Map keeps insertion order) ───────────────────────────────

const memory = new Map()
let memoryBytes = 0

function memoryGet(key) {
  const hit = memory.get(key)
  if (!hit) return null
  memory.delete(key)
  memory.set(key, hit) // mark as most recently used
  return hit
}

function memorySet(key, buffer) {
  if (buffer.length > MEMORY_BUDGET_BYTES / 4) return // don't let one entry dominate
  if (memory.has(key)) {
    memoryBytes -= memory.get(key).length
    memory.delete(key)
  }
  memory.set(key, buffer)
  memoryBytes += buffer.length
  while (memoryBytes > MEMORY_BUDGET_BYTES && memory.size > 0) {
    const [oldestKey, oldest] = memory.entries().next().value
    memory.delete(oldestKey)
    memoryBytes -= oldest.length
  }
}

// ─── Bucket helpers ──────────────────────────────────────────────────────────

async function readObject(key) {
  try {
    const res = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }))
    return Buffer.from(await res.Body.transformToByteArray())
  } catch (err) {
    if (err?.name === 'NoSuchKey' || err?.$metadata?.httpStatusCode === 404) return null
    throw err
  }
}

async function writeObject(key, buffer, contentType) {
  await s3.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: buffer,
    ContentType: contentType,
    CacheControl: 'public, max-age=31536000, immutable',
  }))
}

/**
 * Resizes an image buffer to a WebP of the given width.
 * `rotate()` applies EXIF orientation so phone photos are not sideways.
 */
export function encodeWebp(input, width, quality = WEBP_QUALITY) {
  return sharp(input, { failOn: 'none' })
    .rotate()
    .resize({ width, withoutEnlargement: true })
    .webp({ quality, effort: 4 })
    .toBuffer()
}

// Concurrent requests for the same variant share one generation.
const inflight = new Map()

/**
 * Returns the WebP variant of `objectKey` at `width`, generating and caching
 * it on first use.
 *
 * @param {string} objectKey e.g. "products/IMG_2852.jpeg"
 * @param {number} width One of VARIANT_WIDTHS.
 * @returns {Promise<Buffer|null>} null when the original does not exist.
 */
export async function getVariant(objectKey, width) {
  const cacheKey = variantKey(objectKey, width)

  const hot = memoryGet(cacheKey)
  if (hot) return hot

  if (inflight.has(cacheKey)) return inflight.get(cacheKey)

  const task = (async () => {
    const stored = await readObject(cacheKey)
    if (stored) {
      memorySet(cacheKey, stored)
      return stored
    }

    const original = await readObject(objectKey)
    if (!original) return null

    const variant = await encodeWebp(original, width)
    memorySet(cacheKey, variant)

    // Persist in the background; a failure here only costs a regeneration later.
    writeObject(cacheKey, variant, 'image/webp').catch(err =>
      console.error(`Could not persist variant ${cacheKey}:`, err.message)
    )
    return variant
  })()

  inflight.set(cacheKey, task)
  try {
    return await task
  } finally {
    inflight.delete(cacheKey)
  }
}

/** Widths the storefront requests by default (thumbs, cards, detail). */
export const WARM_WIDTHS = [160, 320, 640, 960, 1280]

/**
 * Generates and persists the given variants for one object, downloading the
 * original only once. Variants already in the bucket are skipped unless
 * `force` is set.
 *
 * @param {string} objectKey
 * @param {{ widths?: number[], original?: Buffer, skipExisting?: (key: string) => Promise<boolean> }} [options]
 * @returns {Promise<{ generated: number, skipped: number }>}
 */
export async function generateVariants(objectKey, { widths = WARM_WIDTHS, original, skipExisting } = {}) {
  let generated = 0, skipped = 0
  let source = original

  for (const width of widths) {
    const key = variantKey(objectKey, width)
    if (skipExisting && await skipExisting(key)) { skipped++; continue }

    if (!source) {
      source = await readObject(objectKey)
      if (!source) return { generated, skipped }
    }
    const variant = await encodeWebp(source, width)
    await writeObject(key, variant, 'image/webp')
    memorySet(key, variant)
    generated++
  }
  return { generated, skipped }
}

/**
 * Generates the common variants for a fresh upload without blocking the caller.
 * @param {string} objectKey
 * @param {Buffer} [original] Bytes just uploaded, to avoid re-downloading.
 */
export function warmVariants(objectKey, original) {
  generateVariants(objectKey, { original }).catch(err =>
    console.error(`Could not warm ${objectKey}:`, err.message)
  )
}
