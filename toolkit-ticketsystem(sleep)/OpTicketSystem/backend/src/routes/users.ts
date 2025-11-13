import express from 'express'
import { getAllUsers, getUserById, createUser, updateUser, deleteUser } from '../controllers/users'
import { authenticate, authorize } from '../middleware/auth'

const router = express.Router()

// Protect all routes
router.use(authenticate)

// Get all users (admin only)
router.get('/', authorize(['admin']), getAllUsers)

// Get user by ID
router.get('/:id', getUserById)

// Create user (admin only)
router.post('/', authorize(['admin']), createUser)

// Update user (admin can update any user, users can update themselves)
router.put('/:id', updateUser)

// Delete user (admin only)
router.delete('/:id', authorize(['admin']), deleteUser)

export default router
