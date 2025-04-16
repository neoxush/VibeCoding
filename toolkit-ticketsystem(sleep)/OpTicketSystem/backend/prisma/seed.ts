import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
  console.log('Starting database seeding...')

  // Create admin user
  const adminExists = await prisma.user.findFirst({
    where: {
      OR: [
        { username: 'admin' },
        { email: 'admin@example.com' },
      ],
    },
  })

  if (!adminExists) {
    const salt = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash('admin123', salt)

    await prisma.user.create({
      data: {
        username: 'admin',
        email: 'admin@example.com',
        password: hashedPassword,
        role: 'admin',
      },
    })
    console.log('Admin user created')
  } else {
    console.log('Admin user already exists')
  }

  // Create default ticket statuses
  const statuses = [
    { name: 'New', description: 'Newly created ticket', color: '#3498db', order: 1 },
    { name: 'In Progress', description: 'Ticket is being worked on', color: '#f39c12', order: 2 },
    { name: 'Pending', description: 'Waiting for customer response', color: '#e74c3c', order: 3 },
    { name: 'Resolved', description: 'Issue has been resolved', color: '#2ecc71', order: 4 },
    { name: 'Closed', description: 'Ticket is closed', color: '#7f8c8d', order: 5 },
  ]

  for (const status of statuses) {
    const statusExists = await prisma.ticketStatus.findFirst({
      where: { name: status.name },
    })

    if (!statusExists) {
      await prisma.ticketStatus.create({
        data: status,
      })
      console.log(`Status "${status.name}" created`)
    } else {
      console.log(`Status "${status.name}" already exists`)
    }
  }

  // Create default custom fields
  const customFields = [
    { name: 'Priority', fieldType: 'select', options: JSON.stringify(['Low', 'Medium', 'High', 'Critical']), required: true },
    { name: 'Category', fieldType: 'select', options: JSON.stringify(['Technical', 'Billing', 'Feature Request', 'Other']), required: true },
    { name: 'Due Date', fieldType: 'date', required: false },
  ]

  for (const field of customFields) {
    const fieldExists = await prisma.customField.findFirst({
      where: { name: field.name },
    })

    if (!fieldExists) {
      await prisma.customField.create({
        data: field,
      })
      console.log(`Custom field "${field.name}" created`)
    } else {
      console.log(`Custom field "${field.name}" already exists`)
    }
  }

  console.log('Database seeding completed')
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
