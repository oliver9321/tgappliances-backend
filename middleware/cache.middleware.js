/**
 * Sets a short public Cache-Control for read-only catalog endpoints.
 *
 * Browsers/CDNs reuse the response for `maxAge` seconds and may serve a stale
 * copy for `staleWhileRevalidate` more seconds while refreshing it in the
 * background. Admin edits therefore show up on the storefront within ~maxAge.
 *
 * @param {number} maxAge seconds
 * @param {number} [staleWhileRevalidate] seconds
 */
export default function publicCache(maxAge, staleWhileRevalidate = maxAge * 5) {
  return (req, res, next) => {
    res.set('Cache-Control', `public, max-age=${maxAge}, stale-while-revalidate=${staleWhileRevalidate}`)
    next()
  }
}
