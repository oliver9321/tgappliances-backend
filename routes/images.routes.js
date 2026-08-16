import { Router } from 'express'
import { serveImage } from '../controllers/images.controller.js'

const router = Router()

// Public — stable image URLs, redirected to presigned URLs at request time.
// The wildcard captures the full object key, e.g. "products/IMG_7837.jpeg".
router.get('/*', serveImage)

export default router
