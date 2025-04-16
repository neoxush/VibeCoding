import express from 'express'
import { authenticate, authorize } from '../middleware/auth'

const router = express.Router()

// Protect all routes
router.use(authenticate)

// Placeholder for status routes
router.get('/', (req, res) => {
  res.json({ message: 'Status routes to be implemented' })
})

export default router
