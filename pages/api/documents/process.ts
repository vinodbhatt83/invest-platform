import { NextApiRequest, NextApiResponse } from 'next';
import { authOptions } from '../auth/[...nextauth]';
import prisma from '../../../lib/prisma';
import { ApiError } from '../../../utils/api';
import { validateSchema } from '../../../lib/validation';
import { z } from 'zod';
import { queueService } from '../../../lib/queue';
import { getServerSessionSafe } from '../../../lib/session';

// Schema for processing request
const processRequestSchema = z.object({
  documentId: z.string().uuid(),
  force: z.boolean().optional().default(false),
});

type ProcessRequestSchema = z.infer<typeof processRequestSchema>;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    // Check authentication
    const session = await getServerSessionSafe(req, res);
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Validate request
    const validation = validateSchema<ProcessRequestSchema>(processRequestSchema, req.body);
    if (!validation.success) {
      // Use type assertion to help TypeScript understand the type
      const errorMessage = (validation as { error: string }).error;
      throw new ApiError(400, errorMessage);
    }

    const { documentId, force } = validation.data;

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
    if (document.userId !== session.user.id) {
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
            createdBy: session.user.id,
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

    return res.status(200).json({
      success: true,
      message: 'Document queued for processing',
      documentId,
    });
  } catch (error) {
    console.error('Process API error:', error);
    if (error instanceof ApiError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
}