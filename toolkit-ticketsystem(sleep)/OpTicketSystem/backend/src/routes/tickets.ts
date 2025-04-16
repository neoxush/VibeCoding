import express from 'express'
import { authenticate } from '../middleware/auth'
import {
  getAllTickets,
  getTicketById,
  createTicket,
  updateTicket,
  deleteTicket,
  getTicketStatuses,
  getCustomFields
} from '../controllers/tickets'

const router = express.Router()

// Protect all routes
router.use(authenticate)

// Get ticket statuses
router.get('/statuses', getTicketStatuses)

// Get custom fields
router.get('/custom-fields', getCustomFields)

// Get all tickets
router.get('/', getAllTickets)

// Create ticket
router.post('/', createTicket)

// Get ticket by ID
router.get('/:id', getTicketById)

// Update ticket
router.put('/:id', updateTicket)

// Delete ticket (only admin or creator can delete)
router.delete('/:id', deleteTicket)

export default router
