import type { PrismaClient } from '@prisma/client';

// Define your types based on the Prisma schema
export interface ExtractedData {
    id: string;
    documentId: string;
    status: string;
    confidence: number;
    error?: string | null;
    createdAt: Date;
    updatedAt: Date;
    fields?: ExtractedField[];
}

export interface ExtractedField {
    id: string;
    extractedDataId: string;
    name: string;
    value: string;
    confidence: number;
    isValid?: boolean | null;
}