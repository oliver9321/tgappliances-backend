/**
 * Image reference helpers.
 *
 * Storage context: the product images live in a Railway Bucket
 * (AWS_S3_BUCKET_NAME, e.g. public-files-e-sjhhws73f8) served by
 * https://t3.storageapi.dev. That provider does NOT support public buckets:
 * PutBucketPolicy returns NotImplemented and PutBucketAcl returns AccessDenied,
 * so every read must be authenticated with a presigned URL.
 *
 * Presigned URLs expire, which makes them unusable as values to persist in the
 * database or to emit in HTML (they break caching, SEO and social previews).
 *
 * So we persist and expose a STABLE relative path instead:
 *
 *     /api/v1/images/products/IMG_7837.jpeg
 *
 * The images route resolves that path to a freshly signed URL at request time
 * and issues a 302 redirect. The stored value never expires, and the bucket
 * stays private.
 */

/** Prefix (relative to the API root) that serves stable image paths. */
export const IMAGE_ROUTE_PREFIX = '/api/v1/images'

/** Object key prefix used for every product image in the bucket. */
export const OBJECT_PREFIX = 'products/'

/**
 * Absolute base URL of this API.
 *
 * The storefront is served from a different domain than the API, so image
 * values must be absolute or the browser would resolve them against the
 * storefront and 404. PUBLIC_API_URL overrides it; otherwise we derive it from
 * the domain Railway injects.
 */
function getApiBaseUrl() {
  const explicit = process.env.PUBLIC_API_URL
  if (explicit) return explicit.replace(/\/+$/, '')

  const domain = process.env.RAILWAY_PUBLIC_DOMAIN
  if (domain) return `https://${domain.replace(/\/+$/, '')}`

  // Local development fallback.
  return `http://localhost:${process.env.PORT || 3000}`
}

/**
 * Extracts the bucket object key from any historical image reference.
 *
 * Handles every shape present in the database:
 *  - stable path:      /api/v1/images/products/foo.jpg
 *  - presigner URL:    https://s3-public-presigner-.../products/foo.jpg
 *  - legacy host URL:  https://public-files-e-....storage.railway.app/products/foo.jpg
 *  - bare key:         products/foo.jpg
 *  - bare filename:    foo.jpg
 *
 * @param {string} imageRef
 * @returns {string|null} Object key such as "products/foo.jpg", or null.
 */
export function toObjectKey(imageRef) {
  if (!imageRef || typeof imageRef !== 'string') return null

  const trimmed = imageRef.trim()
  if (!trimmed) return null

  // Strip query string / fragment (e.g. leftover presign params).
  const withoutQuery = trimmed.split('?')[0].split('#')[0]

  // Take everything after the LAST "products/" segment so nested or
  // double-prefixed legacy values collapse to a single correct key.
  const marker = OBJECT_PREFIX
  const idx = withoutQuery.lastIndexOf(marker)

  let filename
  if (idx !== -1) {
    filename = withoutQuery.slice(idx + marker.length)
  } else if (withoutQuery.includes('/')) {
    filename = withoutQuery.split('/').pop()
  } else {
    filename = withoutQuery
  }

  if (!filename) return null

  // Stored values may be percent-encoded; normalize to the raw key.
  let decoded = filename
  try {
    decoded = decodeURIComponent(filename)
  } catch {
    // Malformed escape sequence — keep the raw value.
  }

  return `${OBJECT_PREFIX}${decoded}`
}

/**
 * Converts any image reference into a stable, non-expiring absolute URL.
 * Each path segment is encoded so spaces and other unsafe characters are valid
 * in HTML and HTTP headers.
 *
 * @param {string} imageRef
 * @returns {string} e.g. "https://api.example.com/api/v1/images/products/IMG_7837.jpeg"
 */
export function toStableImagePath(imageRef) {
  const key = toObjectKey(imageRef)
  if (!key) return imageRef

  const encoded = key.split('/').map(encodeURIComponent).join('/')
  return `${getApiBaseUrl()}${IMAGE_ROUTE_PREFIX}/${encoded}`
}

/**
 * Returns a plain-object copy of a product with `image` and `gallery`
 * normalized to stable image paths.
 *
 * @param {object} product Mongoose document or plain object.
 * @returns {object}
 */
export function formatProductImages(product) {
  if (!product) return product

  const obj = typeof product.toObject === 'function' ? product.toObject() : { ...product }

  if (obj.image) obj.image = toStableImagePath(obj.image)

  if (Array.isArray(obj.gallery)) {
    obj.gallery = obj.gallery.filter(Boolean).map(toStableImagePath)
  }

  return obj
}

/**
 * Maps `formatProductImages` over a list of products.
 *
 * @param {Array} products
 * @returns {Array}
 */
export function formatProductsImages(products) {
  return (products || []).map(formatProductImages)
}
