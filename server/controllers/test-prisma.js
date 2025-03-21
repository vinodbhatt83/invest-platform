// test-prisma.js
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  try {
    // Try a simple query
    const result = await prisma.$queryRaw`SELECT 1 as result`
    console.log('Prisma connection successful', result)
  } catch (error) {
    console.error('Prisma connection failed:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()

//node test-prisma.js