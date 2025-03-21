import prisma from '../../lib/prisma';
import s3Service from '../../lib/s3';
import { queueService } from '../../lib/queue';
import { ApiError } from '../../utils/api';

interface ExtractedFieldInput {
    id?: string;
    name?: string;
    value?: string;
    confidence?: number;
    isValid?: boolean;
}

interface UpdateExtractedDataInput {
    fields?: ExtractedFieldInput[]; // Make fields optional too
    status?: 'processing' | 'completed' | 'failed';
    confidence?: number;
    error?: string;
}

interface DocumentCreateInput {
    name?: string;
    description?: string;
    fileUrl?: string;
    fileType?: string;
    fileSize?: number;
    originalFileName?: string;
    userId: string;
}

export const documentService = {
    // List documents with pagination and filtering
    async listDocuments({
        userId,
        page = 1,
        limit = 10,
        sort = 'createdAt',
        order = 'desc',
        search,
        status,
    }: {
        userId: string;
        page?: number;
        limit?: number;
        sort?: string;
        order?: 'asc' | 'desc';
        search?: string;
        status?: string;
    }) {
        // Build query filters
        const where: any = {
            userId,
        };

        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
            ];
        }

        if (status) {
            where.status = status;
        }

        // Count total documents matching the filter
        const totalDocuments = await prisma.document.count({ where });

        // Fetch documents with pagination
        const documents = await prisma.document.findMany({
            where,
            orderBy: {
                [sort]: order,
            },
            skip: (page - 1) * limit,
            take: limit,
            select: {
                id: true,
                name: true,
                description: true,
                fileUrl: true,
                fileType: true,
                fileSize: true,
                status: true,
                createdAt: true,
                updatedAt: true,
                extractedData: {
                    select: {
                        id: true,
                        status: true,
                        confidence: true,
                    },
                },
                mappings: {
                    select: {
                        id: true,
                        targetSystemId: true,
                        updatedAt: true,
                    },
                },
            },
        });

        // Return paginated result
        return {
            documents,
            pagination: {
                page,
                limit,
                totalDocuments,
                totalPages: Math.ceil(totalDocuments / limit),
            },
        };
    },

    // Get document by ID
    async getDocumentById(documentId: string, userId: string) {
        const document = await prisma.document.findUnique({
            where: {
                id: documentId,
            },
            include: {
                extractedData: {
                    include: {
                        fields: true,
                    },
                },
                mappings: {
                    include: {
                        fields: true,
                    },
                },
                versions: {
                    orderBy: {
                        createdAt: 'desc',
                    },
                    take: 5,
                },
            },
        });

        if (!document) {
            throw new ApiError(404, 'Document not found');
        }

        // Check if the user has access to this document
        if (document.userId !== userId) {
            throw new ApiError(403, 'Access denied');
        }

        return document;
    },

    // Create document
    async createDocument(documentData: DocumentCreateInput) {
        const data = {
            name: documentData.name || 'Untitled Document',
            fileUrl: documentData.fileUrl || '',
            fileType: documentData.fileType || 'unknown',
            fileSize: documentData.fileSize || 0,
            description: documentData.description,
            originalFileName: documentData.originalFileName,
            userId: documentData.userId,
            status: 'pending'
        };
        return await prisma.document.create({
            data
        });
    },

    // Update document
    async updateDocument(
        documentId: string,
        updateData: {
            name?: string;
            description?: string;
            status?: string;
            tags?: string[];
        },
        userId: string
    ) {
        // Find the document to check ownership
        const existingDocument = await prisma.document.findUnique({
            where: {
                id: documentId,
            },
        });

        if (!existingDocument) {
            throw new ApiError(404, 'Document not found');
        }

        if (existingDocument.userId !== userId) {
            throw new ApiError(403, 'Access denied');
        }

        // Update the document
        return await prisma.document.update({
            where: {
                id: documentId,
            },
            data: updateData,
        });
    },

    // Delete document
    async deleteDocument(documentId: string, userId: string) {
        // Find the document to check ownership
        const existingDocument = await prisma.document.findUnique({
            where: {
                id: documentId,
            },
        });

        if (!existingDocument) {
            throw new ApiError(404, 'Document not found');
        }

        if (existingDocument.userId !== userId) {
            throw new ApiError(403, 'Access denied');
        }

        // Delete the document (this should cascade to related records in the database)
        await prisma.document.delete({
            where: {
                id: documentId,
            },
        });

        // Delete the file from storage (S3)
        try {
            const fileKey = existingDocument.fileUrl.split('/').pop();
            if (fileKey) {
                await s3Service.deleteFile(fileKey);
            }
        } catch (error) {
            console.error('Failed to delete file from storage:', error);
            // We still return success even if file deletion fails
            // A background job should clean up orphaned files
        }
    },

    // Process document
    async processDocument(documentId: string, userId: string, force: boolean = false) {
        // Get the document
        const document = await prisma.document.findUnique({
            where: {
                id: documentId,
            },
        });

        if (!document) {
            throw new ApiError(404, 'Document not found');
        }

        // Check ownership
        if (document.userId !== userId) {
            throw new ApiError(403, 'Access denied');
        }

        // Check if document is already being processed
        if (document.status === 'processing' && !force) {
            throw new ApiError(400, 'Document is already being processed');
        }

        // Update document status to processing
        await prisma.document.update({
            where: {
                id: documentId,
            },
            data: {
                status: 'processing',
            },
        });

        // If there's existing extracted data and force=true, create a new version
        if (force) {
            const existingData = await prisma.extractedData.findFirst({
                where: {
                    documentId,
                },
            });

            if (existingData) {
                // Create a version of the current extraction
                await prisma.documentVersion.create({
                    data: {
                        documentId,
                        versionType: 'extraction',
                        contentId: existingData.id,
                        createdBy: userId,
                    },
                });

                // Update extraction status
                await prisma.extractedData.update({
                    where: {
                        id: existingData.id,
                    },
                    data: {
                        status: 'processing',
                    },
                });
            } else {
                // Create new extraction record
                await prisma.extractedData.create({
                    data: {
                        documentId,
                        status: 'processing',
                        confidence: 0,
                    },
                });
            }
        } else {
            // Create new extraction record if it doesn't exist
            const existingData = await prisma.extractedData.findFirst({
                where: {
                    documentId,
                },
            });

            if (!existingData) {
                await prisma.extractedData.create({
                    data: {
                        documentId,
                        status: 'processing',
                        confidence: 0,
                    },
                });
            } else {
                // Update existing extraction record
                await prisma.extractedData.update({
                    where: {
                        id: existingData.id,
                    },
                    data: {
                        status: 'processing',
                    },
                });
            }
        }

        // Queue document for processing
        await queueService.addToQueue('document-processing', {
            documentId,
            priority: force ? 'high' : 'normal',
            timestamp: Date.now(),
        });
    },

    // Get extracted data
    async getExtractedData(documentId: string, userId: string) {
        // Get the document to check ownership
        const document = await prisma.document.findUnique({
            where: {
                id: documentId,
            },
        });

        if (!document) {
            throw new ApiError(404, 'Document not found');
        }

        if (document.userId !== userId) {
            throw new ApiError(403, 'Access denied');
        }

        // Find the extracted data
        const extractedData = await prisma.extractedData.findFirst({
            where: {
                documentId,
            },
            include: {
                fields: true,
            },
        });

        return extractedData;
    },

    // Update extracted data
    // In documentService.ts
    async updateExtractedData(
        documentId: string,
        updateData: UpdateExtractedDataInput,
        userId: string
    ) {
        // Check if document exists and belongs to user
        const document = await prisma.document.findUnique({
            where: { id: documentId },
        });

        if (!document) {
            throw new Error('Document not found');
        }

        if (document.userId !== userId) {
            throw new Error('Access denied');
        }

        // Get or create extracted data
        let extractedData = await prisma.extractedData.findFirst({
            where: { documentId },
            include: { fields: true },
        });

        if (!extractedData) {
            extractedData = await prisma.extractedData.create({
                data: {
                    documentId,
                    status: updateData.status || 'completed',
                    confidence: updateData.confidence || 0,
                    error: updateData.error,
                },
                include: { fields: true },
            });
        } else {
            extractedData = await prisma.extractedData.update({
                where: { id: extractedData.id },
                data: {
                    status: updateData.status || extractedData.status,
                    confidence: updateData.confidence !== undefined ? updateData.confidence : extractedData.confidence,
                    error: updateData.error,
                },
                include: { fields: true },
            });
        }

        // Process fields if they exist
        if (updateData.fields && updateData.fields.length > 0) {
            // Handle fields with default values for required properties
            const fields = updateData.fields.map(field => ({
                id: field.id,
                name: field.name || 'Unnamed Field',
                value: field.value || '',
                confidence: field.confidence !== undefined ? field.confidence : 0,
                isValid: field.isValid
            }));

            // Rest of your field processing logic...
            // ...
        }

        // Return updated data
        return await prisma.extractedData.findFirst({
            where: { documentId },
            include: { fields: true },
        });
    },

    // Get mappings
    async getMappings(
        documentId: string,
        userId: string,
        targetSystemId?: string
    ) {
        // Get the document to check ownership
        const document = await prisma.document.findUnique({
            where: {
                id: documentId,
            },
        });

        if (!document) {
            throw new ApiError(404, 'Document not found');
        }

        if (document.userId !== userId) {
            throw new ApiError(403, 'Access denied');
        }

        const whereClause: any = {
            documentId,
        };

        if (targetSystemId) {
            whereClause.targetSystemId = targetSystemId;
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
                OR: [
                    { userId: null }, // System templates
                    { userId }, // User's templates
                ],
            },
            include: {
                fields: true,
            },
        });

        return { mappings, targetSystems, mappingTemplates };
    },

    // Create mapping
    async createMapping(
        documentId: string,
        mappingData: {
            targetSystemId: string;
            fields: { targetFieldId: string; extractedFieldId: string | null }[];
            name?: string;
            saveAsTemplate?: boolean;
            templateName?: string;
            templateDescription?: string;
        },
        userId: string
    ) {
        // Get the document to check ownership
        const document = await prisma.document.findUnique({
            where: {
                id: documentId,
            },
        });

        if (!document) {
            throw new ApiError(404, 'Document not found');
        }

        if (document.userId !== userId) {
            throw new ApiError(403, 'Access denied');
        }

        const { targetSystemId, fields, name, saveAsTemplate, templateName, templateDescription } = mappingData;

        // Check if a mapping already exists for this target system
        const existingMapping = await prisma.documentMapping.findFirst({
            where: {
                documentId,
                targetSystemId,
            },
        });

        if (existingMapping) {
            throw new ApiError(400, 'A mapping for this target system already exists for this document');
        }

        // Get target system
        const targetSystem = await prisma.targetSystem.findUnique({
            where: {
                id: targetSystemId,
            },
        });

        if (!targetSystem) {
            throw new ApiError(404, 'Target system not found');
        }

        // Create mapping
        const mapping = await prisma.documentMapping.create({
            data: {
                documentId,
                targetSystemId,
                name: name || `Mapping to ${targetSystem.name}`,
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

            let extractedFieldsMap = new Map<string, string>();

            if (extractedFieldIds.length > 0) {
                const extractedFields = await prisma.extractedField.findMany({
                    where: {
                        id: {
                            in: extractedFieldIds,
                        },
                    },
                    select: {
                        id: true,
                        name: true,
                    },
                });

                extractedFieldsMap = new Map(
                    extractedFields.map(field => [field.id, field.name])
                );
            }

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

        return mapping;
    },

    // Update mapping
    async updateMapping(
        documentId: string,
        mappingData: {
            targetSystemId: string;
            fields: { targetFieldId: string; extractedFieldId: string | null }[];
            name?: string;
            saveAsTemplate?: boolean;
            templateName?: string;
            templateDescription?: string;
        },
        userId: string
    ) {
        // Get the document to check ownership
        const document = await prisma.document.findUnique({
            where: {
                id: documentId,
            },
        });

        if (!document) {
            throw new ApiError(404, 'Document not found');
        }

        if (document.userId !== userId) {
            throw new ApiError(403, 'Access denied');
        }

        const { targetSystemId, fields, name, saveAsTemplate, templateName, templateDescription } = mappingData;

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

            let extractedFieldsMap = new Map<string, string>();

            if (extractedFieldIds.length > 0) {
                const extractedFields = await prisma.extractedField.findMany({
                    where: {
                        id: {
                            in: extractedFieldIds,
                        },
                    },
                    select: {
                        id: true,
                        name: true,
                    },
                });

                extractedFieldsMap = new Map(
                    extractedFields.map(field => [field.id, field.name])
                );
            }

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

        return mapping;
    }
};