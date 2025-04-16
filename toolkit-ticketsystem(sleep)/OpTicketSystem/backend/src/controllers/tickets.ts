import { Request, Response } from 'express'
import { z } from 'zod'
import prisma from '../utils/prisma'
import { ApiError } from '../middleware/errorHandler'

// Validation schemas
const TicketCreateSchema = z.object({
  title: z.string().min(3).max(100),
  content: z.string().min(10),
  statusId: z.string().uuid(),
  assigneeId: z.string().uuid().optional(),
  customFields: z.array(
    z.object({
      customFieldId: z.string().uuid(),
      value: z.string(),
    })
  ).optional(),
})

const TicketUpdateSchema = z.object({
  title: z.string().min(3).max(100).optional(),
  content: z.string().min(10).optional(),
  statusId: z.string().uuid().optional(),
  assigneeId: z.string().uuid().optional().nullable(),
  customFields: z.array(
    z.object({
      customFieldId: z.string().uuid(),
      value: z.string(),
    })
  ).optional(),
})

// Get all tickets
export const getAllTickets = async (req: Request, res: Response) => {
  try {
    const { status, assignee, creator } = req.query

    // Build filter
    const filter: any = {}

    if (status) {
      filter.statusId = status as string
    }

    if (assignee) {
      filter.assigneeId = assignee as string
    }

    if (creator) {
      filter.creatorId = creator as string
    }

    // Get tickets with relations
    const tickets = await prisma.ticket.findMany({
      where: filter,
      include: {
        status: true,
        creator: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
        assignee: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
        customFieldValues: {
          include: {
            customField: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    })

    res.json(tickets)
  } catch (error) {
    console.error('Get all tickets error:', error)
    throw new ApiError(500, 'Failed to retrieve tickets')
  }
}

// Get ticket by ID
export const getTicketById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    const ticket = await prisma.ticket.findUnique({
      where: { id },
      include: {
        status: true,
        creator: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
        assignee: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
        comments: {
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
        },
        attachments: true,
        customFieldValues: {
          include: {
            customField: true,
          },
        },
        history: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    })

    if (!ticket) {
      throw new ApiError(404, 'Ticket not found')
    }

    res.json(ticket)
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }
    console.error('Get ticket by ID error:', error)
    throw new ApiError(500, 'Failed to retrieve ticket')
  }
}

// Create ticket
export const createTicket = async (req: Request, res: Response) => {
  try {
    // Validate input
    const validatedData = TicketCreateSchema.parse(req.body)
    const { title, content, statusId, assigneeId, customFields } = validatedData

    // Get user ID from request (set by auth middleware)
    const creatorId = req.user.id

    // Create ticket transaction
    const result = await prisma.$transaction(async (prisma) => {
      // Create ticket
      const ticket = await prisma.ticket.create({
        data: {
          title,
          content,
          statusId,
          creatorId,
          assigneeId,
        },
        include: {
          status: true,
          creator: {
            select: {
              id: true,
              username: true,
              email: true,
            },
          },
          assignee: {
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
          ticketId: ticket.id,
          userId: creatorId,
          action: 'created',
          newValue: JSON.stringify({
            title,
            content,
            statusId,
            assigneeId,
          }),
        },
      })

      // Create custom field values if provided
      if (customFields && customFields.length > 0) {
        // Create custom field values one by one
        for (const field of customFields) {
          await prisma.ticketCustomFieldValue.create({
            data: {
              ticketId: ticket.id,
              customFieldId: field.customFieldId,
              value: field.value,
            }
          })
        }

        // Fetch the created custom field values
        const createdCustomFieldValues = await prisma.ticketCustomFieldValue.findMany({
          where: {
            ticketId: ticket.id,
          },
          include: {
            customField: true,
          },
        })

        return {
          ...ticket,
          customFieldValues: createdCustomFieldValues,
        }
      }

      return ticket
    })

    res.status(201).json(result)
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ApiError(400, 'Validation error', false)
    }
    if (error instanceof ApiError) {
      throw error
    }
    console.error('Create ticket error:', error)
    throw new ApiError(500, 'Failed to create ticket')
  }
}

// Update ticket
export const updateTicket = async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    // Validate input
    const validatedData = TicketUpdateSchema.parse(req.body)
    const { title, content, statusId, assigneeId, customFields } = validatedData

    // Get user ID from request (set by auth middleware)
    const userId = req.user.id

    // Check if ticket exists
    const existingTicket = await prisma.ticket.findUnique({
      where: { id },
      include: {
        customFieldValues: true,
      },
    })

    if (!existingTicket) {
      throw new ApiError(404, 'Ticket not found')
    }

    // Prepare update data
    const updateData: any = {}
    if (title !== undefined) updateData.title = title
    if (content !== undefined) updateData.content = content
    if (statusId !== undefined) updateData.statusId = statusId
    if (assigneeId !== undefined) updateData.assigneeId = assigneeId

    // Create history entries for changes
    const changes: any = {}
    if (title !== undefined && title !== existingTicket.title) changes.title = { from: existingTicket.title, to: title }
    if (content !== undefined && content !== existingTicket.content) changes.content = { from: existingTicket.content, to: content }
    if (statusId !== undefined && statusId !== existingTicket.statusId) changes.statusId = { from: existingTicket.statusId, to: statusId }
    if (assigneeId !== undefined && assigneeId !== existingTicket.assigneeId) changes.assigneeId = { from: existingTicket.assigneeId, to: assigneeId }

    // Update ticket transaction
    const result = await prisma.$transaction(async (prisma) => {
      // Update ticket
      await prisma.ticket.update({
        where: { id },
        data: updateData,
        include: {
          status: true,
          creator: {
            select: {
              id: true,
              username: true,
              email: true,
            },
          },
          assignee: {
            select: {
              id: true,
              username: true,
              email: true,
            },
          },
        },
      })

      // Create ticket history entry if there are changes
      if (Object.keys(changes).length > 0) {
        await prisma.ticketHistory.create({
          data: {
            ticketId: id,
            userId,
            action: 'updated',
            previousValue: JSON.stringify(
              Object.fromEntries(
                Object.entries(changes).map(([key, value]: [string, any]) => [key, value.from])
              )
            ),
            newValue: JSON.stringify(
              Object.fromEntries(
                Object.entries(changes).map(([key, value]: [string, any]) => [key, value.to])
              )
            ),
          },
        })
      }

      // Update custom field values if provided
      if (customFields && customFields.length > 0) {
        // Get existing custom field values
        const existingCustomFieldValues = existingTicket.customFieldValues

        // Process each custom field
        for (const field of customFields) {
          const existingValue = existingCustomFieldValues.find(
            (v) => v.customFieldId === field.customFieldId
          )

          if (existingValue) {
            // Update existing value if different
            if (existingValue.value !== field.value) {
              await prisma.ticketCustomFieldValue.update({
                where: { id: existingValue.id },
                data: { value: field.value },
              })

              // Create history entry for custom field change
              await prisma.ticketHistory.create({
                data: {
                  ticketId: id,
                  userId,
                  action: 'updated_field',
                  previousValue: existingValue.value,
                  newValue: field.value,
                },
              })
            }
          } else {
            // Create new custom field value
            await prisma.ticketCustomFieldValue.create({
              data: {
                ticketId: id,
                customFieldId: field.customFieldId,
                value: field.value,
              },
            })

            // Create history entry for new custom field
            await prisma.ticketHistory.create({
              data: {
                ticketId: id,
                userId,
                action: 'added_field',
                newValue: field.value,
              },
            })
          }
        }
      }

      // Fetch the updated ticket with all relations
      return await prisma.ticket.findUnique({
        where: { id },
        include: {
          status: true,
          creator: {
            select: {
              id: true,
              username: true,
              email: true,
            },
          },
          assignee: {
            select: {
              id: true,
              username: true,
              email: true,
            },
          },
          customFieldValues: {
            include: {
              customField: true,
            },
          },
        },
      })
    })

    res.json(result)
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ApiError(400, 'Validation error', false)
    }
    if (error instanceof ApiError) {
      throw error
    }
    console.error('Update ticket error:', error)
    throw new ApiError(500, 'Failed to update ticket')
  }
}

// Delete ticket
export const deleteTicket = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const userId = req.user.id

    // Check if ticket exists
    const existingTicket = await prisma.ticket.findUnique({
      where: { id },
    })

    if (!existingTicket) {
      throw new ApiError(404, 'Ticket not found')
    }

    // Check if user is admin or the creator of the ticket
    const isAdmin = req.user.role === 'admin'
    const isCreator = existingTicket.creatorId === userId

    if (!isAdmin && !isCreator) {
      throw new ApiError(403, 'Not authorized to delete this ticket')
    }

    // Delete ticket and related data in a transaction
    await prisma.$transaction([
      // Delete custom field values
      prisma.ticketCustomFieldValue.deleteMany({
        where: { ticketId: id },
      }),
      // Delete comments
      prisma.comment.deleteMany({
        where: { ticketId: id },
      }),
      // Delete attachments
      prisma.attachment.deleteMany({
        where: { ticketId: id },
      }),
      // Delete polls and responses
      prisma.pollResponse.deleteMany({
        where: { poll: { ticketId: id } },
      }),
      prisma.poll.deleteMany({
        where: { ticketId: id },
      }),
      // Delete history
      prisma.ticketHistory.deleteMany({
        where: { ticketId: id },
      }),
      // Delete ticket
      prisma.ticket.delete({
        where: { id },
      }),
    ])

    res.json({ message: 'Ticket deleted successfully' })
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }
    console.error('Delete ticket error:', error)
    throw new ApiError(500, 'Failed to delete ticket')
  }
}

// Get ticket statuses
export const getTicketStatuses = async (_req: Request, res: Response) => {
  try {
    const statuses = await prisma.ticketStatus.findMany({
      orderBy: {
        order: 'asc',
      },
    })

    res.json(statuses)
  } catch (error) {
    console.error('Get ticket statuses error:', error)
    throw new ApiError(500, 'Failed to retrieve ticket statuses')
  }
}

// Get custom fields
export const getCustomFields = async (_req: Request, res: Response) => {
  try {
    const customFields = await prisma.customField.findMany({
      orderBy: {
        name: 'asc',
      },
    })

    res.json(customFields)
  } catch (error) {
    console.error('Get custom fields error:', error)
    throw new ApiError(500, 'Failed to retrieve custom fields')
  }
}
