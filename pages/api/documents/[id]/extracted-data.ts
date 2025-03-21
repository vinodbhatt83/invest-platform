import { NextApiRequest, NextApiResponse } from 'next';
import { authOptions } from '../../auth/[...nextauth]';
import prisma from '../../../../lib/prisma';
import { ApiError } from '../../../../utils/api';
import { validateSchema } from '../../../../lib/validation';
import { z } from 'zod';
import { getServerSessionSafe } from '../../../../lib/session';

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    try {
        // Check authentication
        const session = await getServerSessionSafe(req, res);
        if (!session) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const { id } = req.query;

        if (!id || typeof id !== 'string') {
            throw new ApiError(400, 'Invalid document ID');
        }

        // Make sure the document exists and belongs to the user
        const document = await prisma.document.findUnique({
            where: {
                id,
            },
        });

        if (!document) {
            throw new ApiError(404, 'Document not found');
        }

        if (document.userId !== session.user.id) {
            throw new ApiError(403, 'Access denied');
        }

        if (req.method === 'GET') {
            return handleGetExtractedData(req, res, id);
        }

        if (req.method === 'PUT') {
            return handleUpdateExtractedData(req, res, id);
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (error) {
        console.error('Extracted data API error:', error);
        if (error instanceof ApiError) {
            return res.status(error.statusCode).json({ error: error.message });
        }
        return res.status(500).json({ error: 'Internal server error' });
    }
}

// Handle GET request to fetch extracted data
async function handleGetExtractedData(
    req: NextApiRequest,
    res: NextApiResponse,
    documentId: string
) {
    // Find the extracted data
    const extractedData = await prisma.extractedData.findFirst({
        where: {
            documentId,
        },
        include: {
            fields: true,
        },
    });

    if (!extractedData) {
        return res.status(200).json({
            extractedData: null,
            message: 'No extracted data available for this document'
        });
    }

    return res.status(200).json({ extractedData });
}

// Schema for field data
const fieldSchema = z.object({
    id: z.string().optional(),
    name: z.string(),
    value: z.string(),
    confidence: z.number().min(0).max(1),
    isValid: z.boolean().optional(),
});

// Schema for update request
const updateExtractedDataSchema = z.object({
    fields: z.array(fieldSchema),
    status: z.enum(['processing', 'completed', 'failed']).optional(),
    confidence: z.number().min(0).max(1).optional(),
    error: z.string().optional(),
});

// Define type for the schema
type UpdateExtractedDataInput = z.infer<typeof updateExtractedDataSchema>;

// Handle PUT request to update extracted data
async function handleUpdateExtractedData(
    req: NextApiRequest,
    res: NextApiResponse,
    documentId: string
) {
    // Validate request body
    const validation = validateSchema<UpdateExtractedDataInput>(updateExtractedDataSchema, req.body);
    if (!validation.success) {
        // Use type assertion to help TypeScript understand the type
        const errorMessage = (validation as { error: string }).error;
        throw new ApiError(400, errorMessage);
    }

    const { fields, status, confidence, error } = validation.data;

    // Find existing extracted data
    let extractedData = await prisma.extractedData.findFirst({
        where: {
            documentId,
        },
        include: {
            fields: true,
        },
    });

    // If no extracted data exists, create it
    if (!extractedData) {
        extractedData = await prisma.extractedData.create({
            data: {
                documentId,
                status: status || 'completed',
                confidence: confidence || 0,
                error,
            },
            include: {
                fields: true,
            },
        });
    } else {
        // Update existing extracted data
        extractedData = await prisma.extractedData.update({
            where: {
                id: extractedData.id,
            },
            data: {
                status: status || extractedData.status,
                confidence: confidence !== undefined ? confidence : extractedData.confidence,
                error,
            },
            include: {
                fields: true,
            },
        });
    }

    // Process fields
    const existingFieldsMap = new Map(
        extractedData.fields.map(field => [field.name, field])
    );

    const createFields: any[] = [];
    const updateFields: any[] = [];
    const processedFieldNames = new Set<string>();

    fields.forEach(field => {
        processedFieldNames.add(field.name);

        if (field.id) {
            // Update existing field with ID
            updateFields.push({
                where: { id: field.id },
                data: {
                    name: field.name,
                    value: field.value,
                    confidence: field.confidence,
                    isValid: field.isValid,
                },
            });
        } else if (existingFieldsMap.has(field.name)) {
            // Update existing field with same name
            const existingField = existingFieldsMap.get(field.name)!;
            updateFields.push({
                where: { id: existingField.id },
                data: {
                    value: field.value,
                    confidence: field.confidence,
                    isValid: field.isValid,
                },
            });
        } else {
            // Create new field
            createFields.push({
                extractedDataId: extractedData.id,
                name: field.name,
                value: field.value,
                confidence: field.confidence,
                isValid: field.isValid,
            });
        }
    });

    // Delete fields that are not in the update
    const fieldsToDelete = extractedData.fields
        .filter(field => !processedFieldNames.has(field.name))
        .map(field => field.id);

    // Execute database operations
    for (const createField of createFields) {
        await prisma.extractedField.create({
            data: createField,
        });
    }

    for (const updateField of updateFields) {
        await prisma.extractedField.update(updateField);
    }

    if (fieldsToDelete.length > 0) {
        await prisma.extractedField.deleteMany({
            where: {
                id: {
                    in: fieldsToDelete,
                },
            },
        });
    }

    // Update document status if extraction is completed
    if (status === 'completed' || status === 'failed') {
        await prisma.document.update({
            where: {
                id: documentId,
            },
            data: {
                status: 'completed',
            },
        });
    }

    // Get updated data
    const updatedData = await prisma.extractedData.findFirst({
        where: {
            documentId,
        },
        include: {
            fields: true,
        },
    });

    return res.status(200).json({
        success: true,
        extractedData: updatedData,
    });
}