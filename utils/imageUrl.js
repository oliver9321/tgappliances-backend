/**
 * Shared helpers to normalize product image references into fully-qualified
 * presigned URLs served through the s3-public-presigner service.
 *
 * The bucket (tgappliances-images-n6tnzl) stays private. Any image reference
 * stored on a product — whether it's a bare filename, a legacy/hardcoded URL
 * pointing at an old host, or an already-correct presigner URL — is rewritten
 * here so the frontend always receives a working URL.
 */

const DEFAULT_PRESIGNER_BASE_URL = 'https://s3-public-presigner-production-8d2e.up.railway.app'
const OBJECT_PREFIX = 'products/'

function getPresignerBaseUrl() {
  return (process.env.STORAGE_PUBLIC_URL || DEFAULT_PRESIGNER_BASE_URL).replace(/\/+$/, '')
}

/**
 * Normalizes a single image reference (filename, full URL, or S3 key) into a
 * presigned URL served by the presigner: {baseUrl}/products/{filename}
 */
export function toPresignedUrl(imageRef) {
  if (!imageRef || typeof imageRef !== 'string') return imageRef

  const baseUrl = getPresignerBaseUrl()

  // Already points at the current presigner — leave as-is.
  if (imageRef.startsWith(`${baseUrl}/`)) return imageRef

  let filename
  const marker = `/${OBJECT_PREFIX}`
  const markerIndex = imageRef.indexOf(marker)

  if (markerIndex !== -1) {
    // Extract everything after the last "/products/" segment, e.g. legacy
    // URLs like https://old-host/old-bucket/products/foo.jpg
    filename = imageRef.slice(markerIndex + marker.length)
  } else if (imageRef.includes('/')) {
    // Any other URL/path — fall back to the last path segment.
    filename = imageRef.split('/').pop()
  } else {
    // Bare filename or key.
    filename = imageRef.startsWith(OBJECT_PREFIX) ? imageRef.slice(OBJECT_PREFIX.length) : imageRef
  }

  return `${baseUrl}/${OBJECT_PREFIX}${filename}`
}

/**
 * Returns a plain-object copy of a product (Mongoose doc or plain object)
 * with `image` and `gallery` rewritten to presigned URLs.
 */
export function formatProductImages(product) {
  if (!product) return product

  const obj = typeof product.toObject === 'function' ? product.toObject() : { ...product }

  if (obj.image) obj.image = toPresignedUrl(obj.image)
  if (Array.isArray(obj.gallery)) obj.gallery = obj.gallery.map(toPresignedUrl)

  return obj
}

export function formatProductsImages(products) {
  return (products || []).map(formatProductImages)
}
