import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database with initial System Admin...')

  // Simple SHA-256 hash for password123 (for demo only - use proper bcrypt in production)
  const passwordHash =
    '482c811da5d5b4bc6d497ffa98491e38'

  try {
    // Check if System Admin already exists
    const existingAdmin = await prisma.user.findUnique({
      where: { email: 'admin@rescueeye.io' },
    })

    if (existingAdmin) {
      console.log('✓ System Admin already exists')
      return
    }

    // Create initial System Admin
    const systemAdmin = await prisma.user.create({
      data: {
        email: 'admin@rescueeye.io',
        name: 'System Administrator',
        passwordHash: passwordHash,
        role: 'SYSTEM_ADMIN',
        agencyId: null, // System Admin has no agency
        active: true,
      },
    })

    console.log('✓ System Admin created successfully')
    console.log(`  Email: ${systemAdmin.email}`)
    console.log(`  Name: ${systemAdmin.name}`)
    console.log(`  ID: ${systemAdmin.id}`)
  } catch (error) {
    console.error('Error seeding database:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

main()
