import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import dotenv from 'dotenv'
import path from 'path'

// Load environment variables
dotenv.config()

// Create a simple router for initial testing
const router = express.Router()

// Health check route
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' })
})

// Simple auth routes for testing
router.post('/auth/register', (req, res) => {
  res.status(200).json({ message: 'Registration endpoint (to be implemented)' })
})

router.post('/auth/login', (req, res) => {
  res.status(200).json({ message: 'Login endpoint (to be implemented)' })
})

// Create Express app
const app = express()
const PORT = process.env.PORT || 4000

// Middleware
app.use(cors())
app.use(helmet())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Static files for uploads
app.use('/uploads', express.static(path.join(__dirname, '../uploads')))

// API routes
app.use('/api', router)

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack)
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error',
  })
})

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})

export default app
