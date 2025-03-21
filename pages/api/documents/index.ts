import { NextApiRequest, NextApiResponse } from 'next';
import { authOptions } from '../auth/[...nextauth]';
import prisma from '../../../lib/prisma';
import { ApiError } from '../../../utils/api';
import { z } from 'zod';
import { validateSchema } from '../../../utils/validation';
import { getServerSessionSafe } from '../../../lib/session';

// Schema for list query parameters
const listQuerySchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).optional(),
  sort: z.enum(['createdAt', 'updatedAt', 'name']).optional(),
  order: z.enum(['asc', 'desc']).optional(),
  search: z.string().optional(),
  status: z.enum(['pending', 'processing', 'completed', 'failed']).optional(),
  property: z.string().optional(),
  category: z.string().optional(),
});

type ListQuerySchema = z.infer<typeof listQuerySchema>;

// Schema for document creation
const createDocumentSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  fileUrl: z.string().url(),
  fileType: z.string(),
  fileSize: z.number().int().positive(),
  originalFileName: z.string().optional(),
  property: z.string().optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

type CreateDocumentSchema = z.infer<typeof createDocumentSchema>;

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

    if (req.method === 'GET') {
      return handleGetDocuments(req, res, session.user.id);
    }

    if (req.method === 'POST') {
      return handleCreateDocument(req, res, session.user.id);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Documents API error:', error);
    if (error instanceof ApiError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// Handle GET request to list documents
async function handleGetDocuments(
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) {
  // For query validation
  const queryValidation = validateSchema(listQuerySchema, req.query);
  if (!queryValidation.success) {
    throw new ApiError(400, queryValidation.error);
  }

  const {
    page = 1,
    limit = 10,
    sort = 'createdAt',
    order = 'desc',
    search,
    status,
    property,
    category,
  } = queryValidation.data;

  // Build query filters
  const where: any = {
    userId,
  };

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
      { tags: { has: search } },
    ];
  }

  if (status) {
    where.status = status;
  }

  if (property) {
    where.property = property;
  }

  if (category) {
    where.category = category;
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
      property: true,
      category: true,
      tags: true,
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
      versions: {
        select: {
          id: true,
          versionType: true,
          createdAt: true,
          createdBy: true,
          user: {
            select: {
              name: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 5,
      },
    },
  });

  // Return paginated result
  return res.status(200).json({
    documents,
    pagination: {
      page,
      limit,
      totalDocuments,
      totalPages: Math.ceil(totalDocuments / limit),
    },
  });
}

// Handle POST request to create a document
async function handleCreateDocument(
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) {
  // Validate request body
  const bodyValidation = validateSchema<CreateDocumentSchema>(createDocumentSchema, req.body);
  if (!bodyValidation.success) {
    throw new ApiError(400, bodyValidation.error);
  }

  const documentData = bodyValidation.data;

  // Create the document
  const document = await prisma.document.create({
    data: {
      name: documentData.name,
      description: documentData.description,
      fileUrl: documentData.fileUrl,
      fileType: documentData.fileType,
      fileSize: documentData.fileSize,
      originalFileName: documentData.originalFileName,
      property: documentData.property,
      category: documentData.category,
      tags: documentData.tags || [],
      user: {
        connect: {
          id: userId
        }
      },
      status: 'pending',
    },
  });

  // Create initial version
  await prisma.documentVersion.create({
    data: {
      documentId: document.id,
      versionType: 'initial',
      contentId: document.id,
      createdBy: userId,
    },
  });

  // Queue document for processing
  // This would typically be handled by a background job
  try {
    await fetch(`${process.env.NEXTAUTH_URL}/api/documents/process`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ documentId: document.id }),
    });
  } catch (error) {
    console.error('Failed to queue document for processing:', error);
    // Continue anyway, the document is created
  }

  return res.status(201).json({ document });
}
