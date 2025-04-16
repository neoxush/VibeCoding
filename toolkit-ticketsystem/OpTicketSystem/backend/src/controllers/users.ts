import { Request, Response } from 'express'
import bcrypt from 'bcrypt'
import prisma from '../utils/prisma'
import { ApiError } from '../middleware/errorHandler'
import { z } from 'zod'

// Validation schemas
const UserCreateSchema = z.object({
  username: z.string().min(3).max(50),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(['admin', 'manager', 'agent', 'user']),
})

const UserUpdateSchema = z.object({
  username: z.string().min(3).max(50).optional(),
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  role: z.enum(['admin', 'manager', 'agent', 'user']).optional(),
})

// Get all users (admin only)
export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    res.json(users)
  } catch (error) {
    console.error('Get all users error:', error)
    throw new ApiError(500, 'Failed to retrieve users')
  }
}

// Get user by ID
export const getUserById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    if (!user) {
      throw new ApiError(404, 'User not found')
    }

    res.json(user)
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }
    console.error('Get user by ID error:', error)
    throw new ApiError(500, 'Failed to retrieve user')
  }
}

// Create user (admin only)
export const createUser = async (req: Request, res: Response) => {
  try {
    // Validate input
    const validatedData = UserCreateSchema.parse(req.body)
    const { username, email, password, role } = validatedData

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { username },
          { email },
        ],
      },
    })

    if (existingUser) {
      throw new ApiError(400, 'User already exists')
    }

    // Hash password
    const salt = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash(password, salt)

    // Create user
    const user = await prisma.user.create({
      data: {
        username,
        email,
        password: hashedPassword,
        role,
      },
    })

    // Return user data (without password)
    res.status(201).json({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ApiError(400, 'Validation error', false)
    }
    if (error instanceof ApiError) {
      throw error
    }
    console.error('Create user error:', error)
    throw new ApiError(500, 'Failed to create user')
  }
}

// Update user
export const updateUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    // Validate input
    const validatedData = UserUpdateSchema.parse(req.body)
    const { username, email, role, password } = validatedData

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id },
    })

    if (!existingUser) {
      throw new ApiError(404, 'User not found')
    }

    // Check if user is trying to update their own role (not allowed)
    if (req.user.id === id && role && role !== req.user.role) {
      throw new ApiError(403, 'Cannot change your own role')
    }

    // Prepare update data
    const updateData: any = {}
    if (username) updateData.username = username
    if (email) updateData.email = email
    if (role) updateData.role = role

    // Hash password if provided
    if (password) {
      const salt = await bcrypt.genSalt(10)
      updateData.password = await bcrypt.hash(password, salt)
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    res.json(updatedUser)
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ApiError(400, 'Validation error', false)
    }
    if (error instanceof ApiError) {
      throw error
    }
    console.error('Update user error:', error)
    throw new ApiError(500, 'Failed to update user')
  }
}

// Delete user (admin only)
export const deleteUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id },
    })

    if (!existingUser) {
      throw new ApiError(404, 'User not found')
    }

    // Prevent self-deletion
    if (req.user.id === id) {
      throw new ApiError(403, 'Cannot delete your own account')
    }

    // Delete user
    await prisma.user.delete({
      where: { id },
    })

    res.json({ message: 'User deleted successfully' })
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }
    console.error('Delete user error:', error)
    throw new ApiError(500, 'Failed to delete user')
  }
}
