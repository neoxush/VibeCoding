import express from 'express'
import { authenticate } from '../middleware/auth'

const router = express.Router()

// Protect all routes
router.use(authenticate)

// Placeholder for ticket routes
router.get('/', (req, res) => {
  res.json({ message: 'Ticket routes to be implemented' })
})

export default router
