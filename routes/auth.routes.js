import { Router } from 'express'
import { login, setup } from '../controllers/auth.controller.js'

const router = Router()

router.post('/login', login)
router.post('/setup', setup)

export default router
