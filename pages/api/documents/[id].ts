import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import prisma from '../../../lib/prisma';
import { ApiError } from '../../../utils/api';
import { validateSchema } from '../../../lib/validation';
import { z } from 'zod';

// Make the handler non-async to avoid potential Promise rendering issues
export default function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    // Safety check for static generation
    if (process.env.NODE_ENV === 'production' && (!req.headers || !req.url)) {
        return res.status(500).json({ error: 'Static generation is not supported for this route' });
    }

    // Handle the request asynchronously but don't return the Promise
    handleRequest(req, res).catch(error => {
        console.error('Document API error:', error);
        if (error instanceof ApiError) {
            res.status(error.statusCode).json({ error: error.message });
        } else {
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    // Return nothing from the handler function
    return;
}

// The actual async handler logic
async function handleRequest(
    req: NextApiRequest,
    res: NextApiResponse
) {
    try {
        // Check authentication
        let session;
        try {
            // During static build, this might fail
            if (req?.headers?.host) {
                session = await getServerSession(req, res, authOptions);
            }
        } catch (error) {
            console.error('Error getting server session:', error);
        }

        if (!session) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const { id } = req.query;

        if (!id || typeof id !== 'string') {
            throw new ApiError(400, 'Invalid document ID');
        }

        if (req.method === 'GET') {
            return await handleGetDocument(req, res, id, session.user.id);
        }

        if (req.method === 'PUT') {
            return await handleUpdateDocument(req, res, id, session.user.id);
        }

        if (req.method === 'DELETE') {
            return await handleDeleteDocument(req, res, id, session.user.id);
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (error) {
        console.error('Document API error:', error);
        if (error instanceof ApiError) {
            return res.status(error.statusCode).json({ error: error.message });
        }
        return res.status(500).json({ error: 'Internal server error' });
    }
}

// Handle GET request to fetch a single document
async function handleGetDocument(
    req: NextApiRequest,
    res: NextApiResponse,
    documentId: string,
    userId: string
) {
    // Find the document
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

    return res.status(200).json({ document });
}

// Schema for document update
const updateDocumentSchema = z.object({
    name: z.string().min(1).max(255).optional(),
    description: z.string().optional(),
    status: z.enum(['pending', 'processing', 'completed', 'failed']).optional(),
    tags: z.array(z.string()).optional(),
});

// Handle PUT request to update a document
async function handleUpdateDocument(
    req: NextApiRequest,
    res: NextApiResponse,
    documentId: string,
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

    // Validate request body
    const bodyValidation = validateSchema(updateDocumentSchema, req.body);
    if (!bodyValidation.success) {
        // Use type assertion to help TypeScript understand the type
        const errorMessage = (bodyValidation as { error: string }).error;
        throw new ApiError(400, errorMessage);
    }

    const updateData = bodyValidation.data;

    // Update the document
    const updatedDocument = await prisma.document.update({
        where: {
            id: documentId,
        },
        data: updateData,
    });

    return res.status(200).json({ document: updatedDocument });
}

// Handle DELETE request to delete a document
async function handleDeleteDocument(
    req: NextApiRequest,
    res: NextApiResponse,
    documentId: string,
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

    // Delete the document (this should cascade to related records in the database)
    await prisma.document.delete({
        where: {
            id: documentId,
        },
    });

    // Delete the file from storage (S3)
    // This would typically be handled by a background job for reliability
    try {
        // Implement file deletion from S3
        // await s3Service.deleteFile(existingDocument.fileUrl);
    } catch (error) {
        console.error('Failed to delete file from storage:', error);
        // We still return success even if file deletion fails
        // A background job should clean up orphaned files
    }

    return res.status(204).send(null);
}