import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const prismaClientOptions = {};

// If DATABASE_URL is missing, provide it explicitly
if (!process.env.DATABASE_URL) {
    console.warn("Warning: DATABASE_URL not found in environment, using hardcoded value");
    prismaClientOptions.datasources = {
        db: {
            url: "postgresql://postgres:Database%401234@db.frzsymaabkcqaqbajetg.supabase.co:5432/postgres?sslmode=require"
        }
    };
}

// Use a single instance of Prisma Client in development
const globalForPrisma = global;
if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = new PrismaClient(prismaClientOptions);
}
const prisma = globalForPrisma.prisma;

export default prisma;