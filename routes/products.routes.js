import { Router } from 'express'
import authMiddleware from '../middleware/auth.middleware.js'
import { getProducts, getPublicProducts, getProductsByCategory, createProduct, updateProduct, getProductById } from '../controllers/products.controller.js'

const router = Router()

// Public — catalog for the website
router.get('/public', getPublicProducts)
router.get('/by-category/:category', getProductsByCategory)

// Admin — protected (must be before /:id to avoid conflicts)
router.get('/', authMiddleware, getProducts)
router.post('/', authMiddleware, createProduct)
router.put('/:id', authMiddleware, updateProduct)

// Public — single product by ID (last, so it doesn't swallow other routes)
router.get('/:id', getProductById)

export default router
