// types/extraction.ts
import type { PrismaClient } from '@prisma/client';


// Define custom types for your extraction functionality
export interface ExtractionResult {
    fields: ExtractedField[];
    confidence: number;
}

export interface ExtractedField {
    id: string;
    extractedDataId: string;
    name: string;
    value: string;
    confidence: number;
    isValid?: boolean | null;
}