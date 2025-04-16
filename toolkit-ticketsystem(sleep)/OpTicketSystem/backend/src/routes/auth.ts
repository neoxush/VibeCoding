import express from 'express'
import { register, login, getMe, refreshToken, logout } from '../controllers/auth'
import { authenticate } from '../middleware/auth'

const router = express.Router()

// Register route
router.post('/register', register)

// Login route
router.post('/login', login)

// Get current user route (protected)
router.get('/me', authenticate, getMe)

// Refresh token route
router.post('/refresh-token', refreshToken)

// Logout route
router.post('/logout', logout)

export default router
