import express from 'express'
import { authenticate, authorize } from '../middleware/auth'
import {
  getAllStatuses,
  getStatusById,
  createStatus,
  updateStatus,
  deleteStatus,
  reorderStatuses
} from '../controllers/statuses'

const router = express.Router()

// Protect all routes
router.use(authenticate)

// Get all statuses
router.get('/', getAllStatuses)

// Get status by ID
router.get('/:id', getStatusById)

// Admin-only routes
// Create status
router.post('/', authorize(['admin']), createStatus)

// Update status
router.put('/:id', authorize(['admin']), updateStatus)

// Delete status
router.delete('/:id', authorize(['admin']), deleteStatus)

// Reorder statuses
router.post('/reorder', authorize(['admin']), reorderStatuses)

export default router
