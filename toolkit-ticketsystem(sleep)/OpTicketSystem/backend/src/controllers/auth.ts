import { Request, Response } from 'express'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { v4 as uuidv4 } from 'uuid'
import prisma from '../utils/prisma'
import { ApiError } from '../middleware/errorHandler'

// Helper function to generate access token
const generateAccessToken = (userId: string): string => {
  return jwt.sign(
    { id: userId },
    process.env.JWT_SECRET as string,
    { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
  )
}

// Helper function to generate refresh token
const generateRefreshToken = async (userId: string): Promise<string> => {
  const refreshToken = uuidv4()
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 7) // 7 days from now

  // Store refresh token in database
  await prisma.refreshToken.create({
    data: {
      token: refreshToken,
      userId,
      expiresAt,
    },
  })

  return refreshToken
}

// Register a new user
export const register = async (req: Request, res: Response) => {
  try {
    const { username, email, password } = req.body

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
        role: 'user', // Default role
      },
    })

    // Generate tokens
    const accessToken = generateAccessToken(user.id)
    const refreshToken = await generateRefreshToken(user.id)

    // Return user data (without password) and tokens
    res.status(201).json({
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    })
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }
    console.error('Register error:', error)
    throw new ApiError(500, 'Server error')
  }
}

// Login user
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
    })

    if (!user) {
      throw new ApiError(400, 'Invalid credentials')
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) {
      throw new ApiError(400, 'Invalid credentials')
    }

    // Generate tokens
    const accessToken = generateAccessToken(user.id)
    const refreshToken = await generateRefreshToken(user.id)

    // Return user data (without password) and tokens
    res.json({
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    })
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }
    console.error('Login error:', error)
    throw new ApiError(500, 'Server error')
  }
}

// Get current user
export const getMe = async (req: Request, res: Response) => {
  try {
    // User is already attached to req by auth middleware
    res.json(req.user)
  } catch (error) {
    console.error('Get me error:', error)
    throw new ApiError(500, 'Server error')
  }
}

// Refresh token
export const refreshToken = async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body

    if (!refreshToken) {
      throw new ApiError(400, 'Refresh token is required')
    }

    // Find the refresh token in the database
    const tokenDoc = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    })

    if (!tokenDoc) {
      throw new ApiError(401, 'Invalid refresh token')
    }

    // Check if the token is expired
    if (new Date() > tokenDoc.expiresAt) {
      // Delete the expired token
      await prisma.refreshToken.delete({
        where: { id: tokenDoc.id },
      })
      throw new ApiError(401, 'Refresh token expired')
    }

    // Generate a new access token
    const accessToken = generateAccessToken(tokenDoc.user.id)

    // Generate a new refresh token
    await prisma.refreshToken.delete({
      where: { id: tokenDoc.id },
    })
    const newRefreshToken = await generateRefreshToken(tokenDoc.user.id)

    // Return the new tokens
    res.json({
      accessToken,
      refreshToken: newRefreshToken,
    })
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }
    console.error('Refresh token error:', error)
    throw new ApiError(500, 'Server error')
  }
}

// Logout user
export const logout = async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body

    if (refreshToken) {
      // Delete the refresh token from the database
      await prisma.refreshToken.deleteMany({
        where: { token: refreshToken },
      })
    }

    res.json({ message: 'Logged out successfully' })
  } catch (error) {
    console.error('Logout error:', error)
    throw new ApiError(500, 'Server error')
  }
}
