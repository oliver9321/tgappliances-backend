import { Router } from 'express'
import authMiddleware from '../middleware/auth.middleware.js'
import publicCache from '../middleware/cache.middleware.js'
import { getProducts, getPublicProducts, getProductsByCategory, createProduct, updateProduct, getProductById } from '../controllers/products.controller.js'

const router = Router()

// Public — catalog for the website (short cache: admin edits appear within ~1 min)
router.get('/public', publicCache(60), getPublicProducts)
router.get('/by-category/:category', publicCache(60), getProductsByCategory)

// Admin — protected (must be before /:id to avoid conflicts)
router.get('/', authMiddleware, getProducts)
router.post('/', authMiddleware, createProduct)
router.put('/:id', authMiddleware, updateProduct)

// Public — single product by ID (last, so it doesn't swallow other routes)
router.get('/:id', publicCache(60), getProductById)

export default router
