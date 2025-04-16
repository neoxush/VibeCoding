import express from 'express'
import { register, login, getMe } from '../controllers/auth'
import { authenticate } from '../middleware/auth'

const router = express.Router()

// Register route
router.post('/register', register)

// Login route
router.post('/login', login)

// Get current user route (protected)
router.get('/me', authenticate, getMe)

export default router
