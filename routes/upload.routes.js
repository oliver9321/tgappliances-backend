import { Router } from 'express'
import multer from 'multer'
import authMiddleware from '../middleware/auth.middleware.js'
import { uploadImage, uploadGallery } from '../controllers/upload.controller.js'

const router = Router()
const storage = multer.memoryStorage()
const upload = multer({ storage })

router.post('/image', authMiddleware, upload.single('file'), uploadImage)
router.post('/gallery', authMiddleware, upload.array('files'), uploadGallery)

export default router
