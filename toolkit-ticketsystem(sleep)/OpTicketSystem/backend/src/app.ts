import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import dotenv from 'dotenv'
import path from 'path'

// Import routes
import authRoutes from './routes/auth'
import userRoutes from './routes/users'
import ticketRoutes from './routes/tickets'
import commentRoutes from './routes/comments'
import statusRoutes from './routes/statuses'
import customFieldRoutes from './routes/customFields'
import attachmentRoutes from './routes/attachments'

// Import middleware
import { errorHandler, notFound } from './middleware/errorHandler'

// Load environment variables
dotenv.config()

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

// Health check route
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok' })
})

// API routes
app.use('/api/auth', authRoutes)
app.use('/api/users', userRoutes)
app.use('/api/tickets', ticketRoutes)
app.use('/api/comments', commentRoutes)
app.use('/api/statuses', statusRoutes)
app.use('/api/custom-fields', customFieldRoutes)
app.use('/api/attachments', attachmentRoutes)

// Error handling middleware
app.use(notFound)
app.use(errorHandler)

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})

export default app
