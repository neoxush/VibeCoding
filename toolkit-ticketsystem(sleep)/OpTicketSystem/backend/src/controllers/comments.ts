import { Request, Response } from 'express'
import { z } from 'zod'
import prisma from '../utils/prisma'
import { ApiError } from '../middleware/errorHandler'

// Validation schemas
const CommentCreateSchema = z.object({
  content: z.string().min(1).max(1000),
})

const CommentUpdateSchema = z.object({
  content: z.string().min(1).max(1000),
})

// Get comments for a ticket
export const getTicketComments = async (req: Request, res: Response) => {
  try {
    const { ticketId } = req.params

    // Check if ticket exists
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
    })

    if (!ticket) {
      throw new ApiError(404, 'Ticket not found')
    }

    // Get comments
    const comments = await prisma.comment.findMany({
      where: { ticketId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    })

    res.json(comments)
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }
    console.error('Get ticket comments error:', error)
    throw new ApiError(500, 'Failed to retrieve comments')
  }
}

// Create comment
export const createComment = async (req: Request, res: Response) => {
  try {
    const { ticketId } = req.params
    const userId = req.user.id

    // Validate input
    const validatedData = CommentCreateSchema.parse(req.body)
    const { content } = validatedData

    // Check if ticket exists
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
    })

    if (!ticket) {
      throw new ApiError(404, 'Ticket not found')
    }

    // Create comment
    const comment = await prisma.comment.create({
      data: {
        ticketId,
        userId,
        content,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
    })

    // Create ticket history entry
    await prisma.ticketHistory.create({
      data: {
        ticketId,
        userId,
        action: 'commented',
        newValue: content,
      },
    })

    res.status(201).json(comment)
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ApiError(400, 'Validation error', false)
    }
    if (error instanceof ApiError) {
      throw error
    }
    console.error('Create comment error:', error)
    throw new ApiError(500, 'Failed to create comment')
  }
}

// Update comment
export const updateComment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const userId = req.user.id

    // Validate input
    const validatedData = CommentUpdateSchema.parse(req.body)
    const { content } = validatedData

    // Check if comment exists
    const comment = await prisma.comment.findUnique({
      where: { id },
    })

    if (!comment) {
      throw new ApiError(404, 'Comment not found')
    }

    // Check if user is the author of the comment or an admin
    if (comment.userId !== userId && req.user.role !== 'admin') {
      throw new ApiError(403, 'Not authorized to update this comment')
    }

    // Update comment
    const updatedComment = await prisma.comment.update({
      where: { id },
      data: { content, updatedAt: new Date() },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
    })

    // Create ticket history entry
    await prisma.ticketHistory.create({
      data: {
        ticketId: comment.ticketId,
        userId,
        action: 'updated_comment',
        previousValue: comment.content,
        newValue: content,
      },
    })

    res.json(updatedComment)
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ApiError(400, 'Validation error', false)
    }
    if (error instanceof ApiError) {
      throw error
    }
    console.error('Update comment error:', error)
    throw new ApiError(500, 'Failed to update comment')
  }
}

// Delete comment
export const deleteComment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const userId = req.user.id

    // Check if comment exists
    const comment = await prisma.comment.findUnique({
      where: { id },
    })

    if (!comment) {
      throw new ApiError(404, 'Comment not found')
    }

    // Check if user is the author of the comment or an admin
    if (comment.userId !== userId && req.user.role !== 'admin') {
      throw new ApiError(403, 'Not authorized to delete this comment')
    }

    // Delete comment
    await prisma.comment.delete({
      where: { id },
    })

    // Create ticket history entry
    await prisma.ticketHistory.create({
      data: {
        ticketId: comment.ticketId,
        userId,
        action: 'deleted_comment',
        previousValue: comment.content,
      },
    })

    res.json({ message: 'Comment deleted successfully' })
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }
    console.error('Delete comment error:', error)
    throw new ApiError(500, 'Failed to delete comment')
  }
}
