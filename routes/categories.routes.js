import { Router } from 'express'
import authMiddleware from '../middleware/auth.middleware.js'
import publicCache from '../middleware/cache.middleware.js'
import { getCategories, getPublicCategories, createCategory, updateCategory } from '../controllers/categories.controller.js'

const router = Router()

// Public — catalog for the website
router.get('/public', publicCache(300), getPublicCategories)

// Admin — protected
router.get('/', authMiddleware, getCategories)
router.post('/', authMiddleware, createCategory)
router.put('/:id', authMiddleware, updateCategory)

export default router
