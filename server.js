import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import mongoose from 'mongoose'
import swaggerUi from 'swagger-ui-express'
import { swaggerSpec } from './swagger.js'
import path from 'path'
import { fileURLToPath } from 'url'

import authRoutes from './routes/auth.routes.js'
import categoriesRoutes from './routes/categories.routes.js'
import productsRoutes from './routes/products.routes.js'
import usersRoutes from './routes/users.routes.js'
import uploadRoutes from './routes/upload.routes.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const distDir = path.join(__dirname, '../dist')

const app = express()

// Middleware
app.use(cors())
app.use(express.json())

// Swagger UI — available at /api-docs
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec))

// Routes
app.use('/api/v1/auth', authRoutes)
app.use('/api/v1/categories', categoriesRoutes)
app.use('/api/v1/products', productsRoutes)
app.use('/api/v1/users', usersRoutes)
app.use('/api/v1/upload', uploadRoutes)

// Serve static build assets
app.use(express.static(distDir))

// Frontend — root serves index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(distDir, 'index.html'))
})

// Admin panel routes
app.get(['/admin', '/admin/'], (req, res) => {
  res.sendFile(path.join(distDir, 'admin', 'index.html'))
})
app.get('/admin/categories', (req, res) => {
  res.sendFile(path.join(distDir, 'admin', 'categories.html'))
})
app.get('/admin/products', (req, res) => {
  res.sendFile(path.join(distDir, 'admin', 'products.html'))
})
app.get('/admin/users', (req, res) => {
  res.sendFile(path.join(distDir, 'admin', 'users.html'))
})

// MongoDB connection, check if ENVIROMENT is dev or prod
const uri = process.env.ENVIROMENT == "dev"
    ? process.env.MONGO_PUBLIC_URL
    : process.env.MONGO_URL;

const dbName = process.env.ENVIROMENT == "dev" ? 'tgappliances-dev' : 'tgappliances-production'

mongoose
  .connect(uri, { dbName })
  .then(() => {
    console.log(`Connected to MongoDB (${dbName})`)
    const PORT = process.env.PORT || 3000
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on http://0.0.0.0:${PORT}`)
      console.log(`Swagger docs: http://localhost:${PORT}/api-docs`)
    })
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err.message)
    process.exit(1)
  })

export { app }
