import express from 'express'
import { authenticate } from '../middleware/auth'
import {
  upload,
  uploadAttachment,
  getTicketAttachments,
  downloadAttachment,
  deleteAttachment
} from '../controllers/attachments'

const router = express.Router()

// Protect all routes
router.use(authenticate)

// Get attachments for a ticket
router.get('/ticket/:ticketId', getTicketAttachments)

// Upload attachment to a ticket
router.post('/ticket/:ticketId', upload.single('file'), uploadAttachment)

// Download attachment
router.get('/:id/download', downloadAttachment)

// Delete attachment
router.delete('/:id', deleteAttachment)

export default router
