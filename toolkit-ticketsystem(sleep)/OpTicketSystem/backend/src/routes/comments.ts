import express from 'express'
import { authenticate } from '../middleware/auth'
import {
  getTicketComments,
  createComment,
  updateComment,
  deleteComment
} from '../controllers/comments'

const router = express.Router()

// Protect all routes
router.use(authenticate)

// Get comments for a ticket
router.get('/ticket/:ticketId', getTicketComments)

// Create comment for a ticket
router.post('/ticket/:ticketId', createComment)

// Update comment
router.put('/:id', updateComment)

// Delete comment
router.delete('/:id', deleteComment)

export default router
