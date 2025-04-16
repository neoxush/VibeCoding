import { Request, Response } from 'express'
import fs from 'fs'
import path from 'path'
import multer from 'multer'
import { v4 as uuidv4 } from 'uuid'
import prisma from '../utils/prisma'
import { ApiError } from '../middleware/errorHandler'

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads')
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true })
    }
    
    cb(null, uploadDir)
  },
  filename: (_req, file, cb) => {
    const uniqueFilename = `${uuidv4()}-${file.originalname}`
    cb(null, uniqueFilename)
  },
})

// File filter to allow only certain file types
const fileFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Allow common file types
  const allowedMimeTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'application/zip',
  ]

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true)
  } else {
    cb(new Error('Invalid file type. Only images, documents, and archives are allowed.'))
  }
}

// Configure multer upload
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
})

// Upload attachment to a ticket
export const uploadAttachment = async (req: Request, res: Response) => {
  try {
    const { ticketId } = req.params
    const userId = req.user.id
    const file = req.file

    if (!file) {
      throw new ApiError(400, 'No file uploaded')
    }

    // Check if ticket exists
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
    })

    if (!ticket) {
      // Remove uploaded file if ticket doesn't exist
      fs.unlinkSync(file.path)
      throw new ApiError(404, 'Ticket not found')
    }

    // Create attachment record
    const attachment = await prisma.attachment.create({
      data: {
        ticketId,
        userId,
        filename: file.originalname,
        path: file.path,
        mimetype: file.mimetype,
        size: file.size,
      },
    })

    // Create ticket history entry
    await prisma.ticketHistory.create({
      data: {
        ticketId,
        userId,
        action: 'added_attachment',
        newValue: file.originalname,
      },
    })

    res.status(201).json(attachment)
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }
    console.error('Upload attachment error:', error)
    throw new ApiError(500, 'Failed to upload attachment')
  }
}

// Get all attachments for a ticket
export const getTicketAttachments = async (req: Request, res: Response) => {
  try {
    const { ticketId } = req.params

    // Check if ticket exists
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
    })

    if (!ticket) {
      throw new ApiError(404, 'Ticket not found')
    }

    // Get attachments
    const attachments = await prisma.attachment.findMany({
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
        createdAt: 'desc',
      },
    })

    res.json(attachments)
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }
    console.error('Get ticket attachments error:', error)
    throw new ApiError(500, 'Failed to retrieve attachments')
  }
}

// Download attachment
export const downloadAttachment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    // Get attachment
    const attachment = await prisma.attachment.findUnique({
      where: { id },
    })

    if (!attachment) {
      throw new ApiError(404, 'Attachment not found')
    }

    // Check if file exists
    if (!fs.existsSync(attachment.path)) {
      throw new ApiError(404, 'Attachment file not found')
    }

    // Set content disposition header
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(attachment.filename)}"`
    )
    
    // Set content type
    res.setHeader('Content-Type', attachment.mimetype)

    // Stream file to response
    const fileStream = fs.createReadStream(attachment.path)
    fileStream.pipe(res)
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }
    console.error('Download attachment error:', error)
    throw new ApiError(500, 'Failed to download attachment')
  }
}

// Delete attachment
export const deleteAttachment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const userId = req.user.id

    // Get attachment
    const attachment = await prisma.attachment.findUnique({
      where: { id },
      include: {
        ticket: true,
      },
    })

    if (!attachment) {
      throw new ApiError(404, 'Attachment not found')
    }

    // Check if user is the uploader of the attachment, the creator of the ticket, or an admin
    const isAdmin = req.user.role === 'admin'
    const isUploader = attachment.userId === userId
    const isTicketCreator = attachment.ticket.creatorId === userId

    if (!isAdmin && !isUploader && !isTicketCreator) {
      throw new ApiError(403, 'Not authorized to delete this attachment')
    }

    // Delete file from disk
    if (fs.existsSync(attachment.path)) {
      fs.unlinkSync(attachment.path)
    }

    // Delete attachment record
    await prisma.attachment.delete({
      where: { id },
    })

    // Create ticket history entry
    await prisma.ticketHistory.create({
      data: {
        ticketId: attachment.ticketId,
        userId,
        action: 'deleted_attachment',
        previousValue: attachment.filename,
      },
    })

    res.json({ message: 'Attachment deleted successfully' })
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }
    console.error('Delete attachment error:', error)
    throw new ApiError(500, 'Failed to delete attachment')
  }
}
