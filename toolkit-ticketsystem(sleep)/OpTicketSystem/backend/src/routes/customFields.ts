import express from 'express'
import { authenticate, authorize } from '../middleware/auth'
import {
  getAllCustomFields,
  getCustomFieldById,
  createCustomField,
  updateCustomField,
  deleteCustomField
} from '../controllers/customFields'

const router = express.Router()

// Protect all routes
router.use(authenticate)

// Get all custom fields
router.get('/', getAllCustomFields)

// Get custom field by ID
router.get('/:id', getCustomFieldById)

// Admin-only routes
// Create custom field
router.post('/', authorize(['admin']), createCustomField)

// Update custom field
router.put('/:id', authorize(['admin']), updateCustomField)

// Delete custom field
router.delete('/:id', authorize(['admin']), deleteCustomField)

export default router
