import { Router } from 'express'
import authMiddleware from '../middleware/auth.middleware.js'
import { getUsers, createUser, updateUser } from '../controllers/users.controller.js'

const router = Router()

router.get('/', authMiddleware, getUsers)
router.post('/', authMiddleware, createUser)
router.put('/:id', authMiddleware, updateUser)

export default router
