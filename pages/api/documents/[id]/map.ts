import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../../lib/prisma';
import { ApiError } from '../../../../utils/api';
import { validateSchema } from '../../../../lib/validation';
import { z } from 'zod';
import { authOptions } from '../../auth/[...nextauth]';
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
            return handleGetMappings(req, res, id);
        }

        if (req.method === 'POST') {
            return handleCreateMapping(req, res, id, session.user.id);
        }

        if (req.method === 'PUT') {
            return handleUpdateMapping(req, res, id, session.user.id);
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (error) {
        console.error('Mapping API error:', error);
        if (error instanceof ApiError) {
            return res.status(error.statusCode).json({ error: error.message });
        }
        return res.status(500).json({ error: 'Internal server error' });
    }
}

// Handle GET request to fetch mappings
async function handleGetMappings(
    req: NextApiRequest,
    res: NextApiResponse,
    documentId: string
) {
    const { systemId } = req.query;

    const whereClause: any = {
        documentId,
    };

    if (systemId && typeof systemId === 'string') {
        whereClause.targetSystemId = systemId;
    }

    // Find the mappings
    const mappings = await prisma.documentMapping.findMany({
        where: whereClause,
        include: {
            fields: true,
            targetSystem: {
                select: {
                    id: true,
                    name: true,
                },
            },
        },
    });

    const targetSystems = await prisma.targetSystem.findMany({
        select: {
            id: true,
            name: true,
            description: true,
            fields: {
                select: {
                    id: true,
                    name: true,
                    description: true,
                    required: true,
                    type: true,
                    options: true,
                },
            },
        },
    });

    const mappingTemplates = await prisma.mappingTemplate.findMany({
        where: {
            userId: null, // System templates only
        },
        include: {
            fields: true,
        },
    });

    return res.status(200).json({ mappings, targetSystems, mappingTemplates });
}

// Schema for mapping field
const mappingFieldSchema = z.object({
    targetFieldId: z.string(),
    extractedFieldId: z.string().nullable(),
});

// Schema for creating/updating a mapping
const mappingSchema = z.object({
    targetSystemId: z.string(),
    fields: z.array(mappingFieldSchema),
    name: z.string().optional(),
    saveAsTemplate: z.boolean().optional(),
    templateName: z.string().optional(),
    templateDescription: z.string().optional(),
});

// Handle POST request to create a mapping
async function handleCreateMapping(
    req: NextApiRequest,
    res: NextApiResponse,
    documentId: string,
    userId: string
) {
    // Validate request body
    const validation = validateSchema(mappingSchema, req.body);
    if (!validation.success) {
        throw new ApiError(400, "validation.error");
    }

    // Type assertion to tell TypeScript that validation.data has the expected structure
    const validatedData = validation.data as {
        targetSystemId: string;
        fields: Array<{ targetFieldId: string; extractedFieldId: string | null }>;
        name?: string;
        saveAsTemplate?: boolean;
        templateName?: string;
        templateDescription?: string;
    };

    const { targetSystemId, fields, name, saveAsTemplate, templateName, templateDescription } = validatedData;

    // Check if a mapping already exists for this target system
    const existingMapping = await prisma.documentMapping.findFirst({
        where: {
            documentId,
            targetSystemId,
        },
    });

    if (existingMapping) {
        throw new ApiError(400, 'A mapping for this target system already exists for this document. Use PUT to update.');
    }

    // Create mapping
    const mapping = await prisma.documentMapping.create({
        data: {
            documentId,
            targetSystemId,
            name: name || `Mapping to ${targetSystemId}`,
            userId,
            fields: {
                create: fields.map(field => ({
                    targetFieldId: field.targetFieldId,
                    extractedFieldId: field.extractedFieldId,
                })),
            },
        },
        include: {
            fields: true,
            targetSystem: {
                select: {
                    id: true,
                    name: true,
                },
            },
        },
    });

    // Save as template if requested
    if (saveAsTemplate && templateName) {
        // Get extracted field names for the template
        const extractedFieldIds = fields
            .filter(f => f.extractedFieldId)
            .map(f => f.extractedFieldId)
            .filter((id): id is string => id !== null);

        const extractedFieldsMap = extractedFieldIds.length > 0
            ? await getExtractedFieldsMap(extractedFieldIds)
            : new Map();

        // Create template
        await prisma.mappingTemplate.create({
            data: {
                name: templateName,
                description: templateDescription,
                targetSystemId,
                userId, // User-specific template
                fields: {
                    create: fields
                        .filter(f => f.extractedFieldId)
                        .map(f => ({
                            targetFieldId: f.targetFieldId,
                            extractedFieldName: extractedFieldsMap.get(f.extractedFieldId as string) || 'Unknown Field',
                        })),
                },
            },
        });
    }

    return res.status(201).json({
        success: true,
        mapping,
    });
}

// Handle PUT request to update a mapping
async function handleUpdateMapping(
    req: NextApiRequest,
    res: NextApiResponse,
    documentId: string,
    userId: string
) {
    // Validate request body
    const validation = validateSchema(mappingSchema, req.body);
    if (!validation.success) {
        throw new ApiError(400, "validation.error");
    }

    const validatedData = validation.data as {
        targetSystemId: string;
        fields: Array<{ targetFieldId: string; extractedFieldId: string | null }>;
        name?: string;
        saveAsTemplate?: boolean;
        templateName?: string;
        templateDescription?: string;
    };

    const { targetSystemId, fields, name, saveAsTemplate, templateName, templateDescription } = validatedData;

    // Find existing mapping
    const existingMapping = await prisma.documentMapping.findFirst({
        where: {
            documentId,
            targetSystemId,
        },
        include: {
            fields: true,
        },
    });

    if (!existingMapping) {
        throw new ApiError(404, 'Mapping not found');
    }

    // Delete existing mapping fields
    await prisma.mappingField.deleteMany({
        where: {
            mappingId: existingMapping.id,
        },
    });

    // Update mapping
    const mapping = await prisma.documentMapping.update({
        where: {
            id: existingMapping.id,
        },
        data: {
            name: name || existingMapping.name,
            fields: {
                create: fields.map(field => ({
                    targetFieldId: field.targetFieldId,
                    extractedFieldId: field.extractedFieldId,
                })),
            },
        },
        include: {
            fields: true,
            targetSystem: {
                select: {
                    id: true,
                    name: true,
                },
            },
        },
    });

    // Save as template if requested
    if (saveAsTemplate && templateName) {
        // Get extracted field names for the template
        const extractedFieldIds = fields
            .filter(f => f.extractedFieldId)
            .map(f => f.extractedFieldId)
            .filter((id): id is string => id !== null);

        const extractedFieldsMap = extractedFieldIds.length > 0
            ? await getExtractedFieldsMap(extractedFieldIds)
            : new Map();

        // Create template
        await prisma.mappingTemplate.create({
            data: {
                name: templateName,
                description: templateDescription,
                targetSystemId,
                userId, // User-specific template
                fields: {
                    create: fields
                        .filter(f => f.extractedFieldId)
                        .map(f => ({
                            targetFieldId: f.targetFieldId,
                            extractedFieldName: extractedFieldsMap.get(f.extractedFieldId as string) || 'Unknown Field',
                        })),
                },
            },
        });
    }

    return res.status(200).json({
        success: true,
        mapping,
    });
}

// Helper function to get extracted field names
async function getExtractedFieldsMap(fieldIds: string[]): Promise<Map<string, string>> {
    const extractedFields = await prisma.extractedField.findMany({
        where: {
            id: {
                in: fieldIds,
            },
        },
        select: {
            id: true,
            name: true,
        },
    });

    const fieldsMap = new Map<string, string>();
    extractedFields.forEach(field => {
        fieldsMap.set(field.id, field.name);
    });

    return fieldsMap;
}