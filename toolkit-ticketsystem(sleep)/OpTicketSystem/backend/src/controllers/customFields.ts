import { Request, Response } from 'express'
import { z } from 'zod'
import prisma from '../utils/prisma'
import { ApiError } from '../middleware/errorHandler'

// Validation schemas
const CustomFieldCreateSchema = z.object({
  name: z.string().min(2).max(50),
  fieldType: z.enum(['text', 'number', 'select', 'date', 'boolean']),
  options: z.string().optional(),
  required: z.boolean().default(false),
})

const CustomFieldUpdateSchema = z.object({
  name: z.string().min(2).max(50).optional(),
  fieldType: z.enum(['text', 'number', 'select', 'date', 'boolean']).optional(),
  options: z.string().optional().nullable(),
  required: z.boolean().optional(),
})

// Get all custom fields
export const getAllCustomFields = async (_req: Request, res: Response) => {
  try {
    const customFields = await prisma.customField.findMany({
      orderBy: {
        name: 'asc',
      },
    })

    res.json(customFields)
  } catch (error) {
    console.error('Get all custom fields error:', error)
    throw new ApiError(500, 'Failed to retrieve custom fields')
  }
}

// Get custom field by ID
export const getCustomFieldById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    const customField = await prisma.customField.findUnique({
      where: { id },
    })

    if (!customField) {
      throw new ApiError(404, 'Custom field not found')
    }

    res.json(customField)
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }
    console.error('Get custom field by ID error:', error)
    throw new ApiError(500, 'Failed to retrieve custom field')
  }
}

// Create custom field
export const createCustomField = async (req: Request, res: Response) => {
  try {
    // Validate input
    const validatedData = CustomFieldCreateSchema.parse(req.body)
    
    // Check if custom field with the same name already exists
    const existingCustomField = await prisma.customField.findFirst({
      where: {
        name: validatedData.name,
      },
    })

    if (existingCustomField) {
      throw new ApiError(400, 'Custom field with this name already exists')
    }

    // Validate options for select field type
    if (validatedData.fieldType === 'select') {
      if (!validatedData.options) {
        throw new ApiError(400, 'Options are required for select field type')
      }

      try {
        const options = JSON.parse(validatedData.options)
        if (!Array.isArray(options) || options.length === 0) {
          throw new ApiError(400, 'Options must be a non-empty array')
        }
      } catch (e) {
        throw new ApiError(400, 'Options must be a valid JSON array')
      }
    }

    // Create custom field
    const customField = await prisma.customField.create({
      data: validatedData,
    })

    res.status(201).json(customField)
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ApiError(400, 'Validation error', false)
    }
    if (error instanceof ApiError) {
      throw error
    }
    console.error('Create custom field error:', error)
    throw new ApiError(500, 'Failed to create custom field')
  }
}

// Update custom field
export const updateCustomField = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    
    // Validate input
    const validatedData = CustomFieldUpdateSchema.parse(req.body)
    
    // Check if custom field exists
    const existingCustomField = await prisma.customField.findUnique({
      where: { id },
      include: {
        values: {
          select: { id: true },
          take: 1,
        },
      },
    })

    if (!existingCustomField) {
      throw new ApiError(404, 'Custom field not found')
    }

    // Check if name is being updated and if it already exists
    if (validatedData.name && validatedData.name !== existingCustomField.name) {
      const nameExists = await prisma.customField.findFirst({
        where: {
          name: validatedData.name,
          id: { not: id },
        },
      })

      if (nameExists) {
        throw new ApiError(400, 'Custom field with this name already exists')
      }
    }

    // Check if field type is being changed and if it has values
    if (validatedData.fieldType && 
        validatedData.fieldType !== existingCustomField.fieldType && 
        existingCustomField.values.length > 0) {
      throw new ApiError(400, 'Cannot change field type of a custom field that is already in use')
    }

    // Validate options for select field type
    const fieldType = validatedData.fieldType || existingCustomField.fieldType
    if (fieldType === 'select' && validatedData.options !== undefined) {
      if (!validatedData.options) {
        throw new ApiError(400, 'Options are required for select field type')
      }

      try {
        const options = JSON.parse(validatedData.options)
        if (!Array.isArray(options) || options.length === 0) {
          throw new ApiError(400, 'Options must be a non-empty array')
        }
      } catch (e) {
        throw new ApiError(400, 'Options must be a valid JSON array')
      }
    }

    // Update custom field
    const updatedCustomField = await prisma.customField.update({
      where: { id },
      data: validatedData,
    })

    res.json(updatedCustomField)
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ApiError(400, 'Validation error', false)
    }
    if (error instanceof ApiError) {
      throw error
    }
    console.error('Update custom field error:', error)
    throw new ApiError(500, 'Failed to update custom field')
  }
}

// Delete custom field
export const deleteCustomField = async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    // Check if custom field exists
    const existingCustomField = await prisma.customField.findUnique({
      where: { id },
      include: {
        values: {
          select: { id: true },
          take: 1,
        },
      },
    })

    if (!existingCustomField) {
      throw new ApiError(404, 'Custom field not found')
    }

    // Check if custom field is being used by any tickets
    if (existingCustomField.values.length > 0) {
      throw new ApiError(400, 'Cannot delete custom field that is being used by tickets')
    }

    // Delete custom field
    await prisma.customField.delete({
      where: { id },
    })

    res.json({ message: 'Custom field deleted successfully' })
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }
    console.error('Delete custom field error:', error)
    throw new ApiError(500, 'Failed to delete custom field')
  }
}
