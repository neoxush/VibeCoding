import { Request, Response } from 'express'
import { z } from 'zod'
import prisma from '../utils/prisma'
import { ApiError } from '../middleware/errorHandler'

// Validation schemas
const StatusCreateSchema = z.object({
  name: z.string().min(2).max(50),
  description: z.string().max(200).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#808080'),
  order: z.number().int().min(0).optional(),
  autoTransitionTo: z.string().uuid().optional().nullable(),
  transitionCondition: z.string().max(200).optional().nullable(),
})

const StatusUpdateSchema = z.object({
  name: z.string().min(2).max(50).optional(),
  description: z.string().max(200).optional().nullable(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  order: z.number().int().min(0).optional(),
  autoTransitionTo: z.string().uuid().optional().nullable(),
  transitionCondition: z.string().max(200).optional().nullable(),
})

// Get all statuses
export const getAllStatuses = async (_req: Request, res: Response) => {
  try {
    const statuses = await prisma.ticketStatus.findMany({
      orderBy: {
        order: 'asc',
      },
    })

    res.json(statuses)
  } catch (error) {
    console.error('Get all statuses error:', error)
    throw new ApiError(500, 'Failed to retrieve statuses')
  }
}

// Get status by ID
export const getStatusById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    const status = await prisma.ticketStatus.findUnique({
      where: { id },
    })

    if (!status) {
      throw new ApiError(404, 'Status not found')
    }

    res.json(status)
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }
    console.error('Get status by ID error:', error)
    throw new ApiError(500, 'Failed to retrieve status')
  }
}

// Create status
export const createStatus = async (req: Request, res: Response) => {
  try {
    // Validate input
    const validatedData = StatusCreateSchema.parse(req.body)
    
    // Check if status with the same name already exists
    const existingStatus = await prisma.ticketStatus.findFirst({
      where: {
        name: validatedData.name,
      },
    })

    if (existingStatus) {
      throw new ApiError(400, 'Status with this name already exists')
    }

    // Create status
    const status = await prisma.ticketStatus.create({
      data: validatedData,
    })

    res.status(201).json(status)
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ApiError(400, 'Validation error', false)
    }
    if (error instanceof ApiError) {
      throw error
    }
    console.error('Create status error:', error)
    throw new ApiError(500, 'Failed to create status')
  }
}

// Update status
export const updateStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    
    // Validate input
    const validatedData = StatusUpdateSchema.parse(req.body)
    
    // Check if status exists
    const existingStatus = await prisma.ticketStatus.findUnique({
      where: { id },
    })

    if (!existingStatus) {
      throw new ApiError(404, 'Status not found')
    }

    // Check if name is being updated and if it already exists
    if (validatedData.name && validatedData.name !== existingStatus.name) {
      const nameExists = await prisma.ticketStatus.findFirst({
        where: {
          name: validatedData.name,
          id: { not: id },
        },
      })

      if (nameExists) {
        throw new ApiError(400, 'Status with this name already exists')
      }
    }

    // Update status
    const updatedStatus = await prisma.ticketStatus.update({
      where: { id },
      data: validatedData,
    })

    res.json(updatedStatus)
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ApiError(400, 'Validation error', false)
    }
    if (error instanceof ApiError) {
      throw error
    }
    console.error('Update status error:', error)
    throw new ApiError(500, 'Failed to update status')
  }
}

// Delete status
export const deleteStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    // Check if status exists
    const existingStatus = await prisma.ticketStatus.findUnique({
      where: { id },
      include: {
        tickets: {
          select: { id: true },
          take: 1,
        },
      },
    })

    if (!existingStatus) {
      throw new ApiError(404, 'Status not found')
    }

    // Check if status is being used by any tickets
    if (existingStatus.tickets.length > 0) {
      throw new ApiError(400, 'Cannot delete status that is being used by tickets')
    }

    // Delete status
    await prisma.ticketStatus.delete({
      where: { id },
    })

    res.json({ message: 'Status deleted successfully' })
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }
    console.error('Delete status error:', error)
    throw new ApiError(500, 'Failed to delete status')
  }
}

// Reorder statuses
export const reorderStatuses = async (req: Request, res: Response) => {
  try {
    const { statusIds } = req.body

    if (!Array.isArray(statusIds)) {
      throw new ApiError(400, 'statusIds must be an array')
    }

    // Update order of statuses in a transaction
    await prisma.$transaction(
      statusIds.map((id, index) =>
        prisma.ticketStatus.update({
          where: { id },
          data: { order: index },
        })
      )
    )

    // Get updated statuses
    const statuses = await prisma.ticketStatus.findMany({
      orderBy: {
        order: 'asc',
      },
    })

    res.json(statuses)
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }
    console.error('Reorder statuses error:', error)
    throw new ApiError(500, 'Failed to reorder statuses')
  }
}
