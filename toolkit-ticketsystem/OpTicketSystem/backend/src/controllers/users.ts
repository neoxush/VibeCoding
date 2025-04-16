import { Request, Response } from 'express'
import bcrypt from 'bcrypt'
import prisma from '../utils/prisma'

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
    res.status(500).json({ message: 'Server error' })
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
      return res.status(404).json({ message: 'User not found' })
    }

    res.json(user)
  } catch (error) {
    console.error('Get user by ID error:', error)
    res.status(500).json({ message: 'Server error' })
  }
}

// Create user (admin only)
export const createUser = async (req: Request, res: Response) => {
  try {
    const { username, email, password, role } = req.body

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
      return res.status(400).json({ message: 'User already exists' })
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
    console.error('Create user error:', error)
    res.status(500).json({ message: 'Server error' })
  }
}

// Update user
export const updateUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { username, email, role, password } = req.body

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id },
    })

    if (!existingUser) {
      return res.status(404).json({ message: 'User not found' })
    }

    // Check if user is trying to update their own role (not allowed)
    if (req.user.id === id && role && role !== req.user.role) {
      return res.status(403).json({ message: 'Cannot change your own role' })
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
    console.error('Update user error:', error)
    res.status(500).json({ message: 'Server error' })
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
      return res.status(404).json({ message: 'User not found' })
    }

    // Prevent self-deletion
    if (req.user.id === id) {
      return res.status(403).json({ message: 'Cannot delete your own account' })
    }

    // Delete user
    await prisma.user.delete({
      where: { id },
    })

    res.json({ message: 'User deleted successfully' })
  } catch (error) {
    console.error('Delete user error:', error)
    res.status(500).json({ message: 'Server error' })
  }
}
