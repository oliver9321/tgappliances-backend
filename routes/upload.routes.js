import { Router } from 'express'
import multer from 'multer'
import authMiddleware from '../middleware/auth.middleware.js'
import { uploadImage, uploadGallery } from '../controllers/upload.controller.js'

const router = Router()
const storage = multer.memoryStorage()

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024, files: 20 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype && file.mimetype.startsWith('image/')) return cb(null, true)
    cb(new Error('Only image files are allowed'))
  },
})

/** Turns multer errors (size, type) into 400 responses instead of 500s. */
function handleUpload(middleware) {
  return (req, res, next) => {
    middleware(req, res, err => {
      if (err) return res.status(400).json({ message: err.message })
      next()
    })
  }
}

router.post('/image', authMiddleware, handleUpload(upload.single('file')), uploadImage)
router.post('/gallery', authMiddleware, handleUpload(upload.array('files')), uploadGallery)

export default router
