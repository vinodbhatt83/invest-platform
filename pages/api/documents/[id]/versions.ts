import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]';
import prisma from '../../../../lib/prisma';
import { z } from 'zod';
import { ApiError } from '../../../../utils/api';

// Schema for version creation
const createVersionSchema = z.object({
  version: z.string().min(1),
  notes: z.string().optional(),
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // Check authentication
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const documentId = req.query.id as string;

    // Validate document exists
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      include: {
        versions: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Handle GET request to fetch versions
    if (req.method === 'GET') {
      // Get the most recent version to determine which is current
      const latestVersion = document.versions.length > 0 ? document.versions[0] : null;

      // Transform the versions to match the expected format in the UI
      const formattedVersions = document.versions.map(v => ({
        id: v.id,
        version: v.versionType, // Use versionType as version
        date: v.createdAt.toISOString(),
        isCurrent: latestVersion ? v.id === latestVersion.id : false, // Determine current based on most recent version
        userId: v.createdBy,
        userName: '', // This would need to be fetched from user data
        notes: '', // This would need to be stored elsewhere or in a JSON field
      }));

      return res.status(200).json({ versions: formattedVersions });
    }

    // Handle POST request to create a new version
    if (req.method === 'POST') {
      const validatedData = createVersionSchema.parse(req.body);

      // Check if version already exists
      const existingVersion = document.versions.find(
        v => v.versionType === validatedData.version
      );

      if (existingVersion) {
        return res.status(400).json({ error: 'Version already exists' });
      }

      // Create a new document version
      const newVersion = await prisma.documentVersion.create({
        data: {
          documentId,
          versionType: validatedData.version,
          contentId: document.id, // This might need to be adjusted based on your data model
          createdBy: session.user.id,
        },
      });

      // Update the document's updatedAt timestamp
      await prisma.document.update({
        where: { id: documentId },
        data: {
          updatedAt: new Date(),
        },
      });

      // Transform to match expected format
      const formattedVersion = {
        id: newVersion.id,
        version: newVersion.versionType,
        date: newVersion.createdAt.toISOString(),
        isCurrent: true,
        userId: newVersion.createdBy,
        userName: session.user.name || 'Unknown User',
        notes: validatedData.notes || `Created version ${validatedData.version}`,
      };

      return res.status(201).json({ version: formattedVersion });
    }

    // Handle PATCH request to set a version as current
    if (req.method === 'PATCH') {
      const { version } = req.body;

      if (!version) {
        return res.status(400).json({ error: 'Version is required' });
      }

      // Find the version to set as current
      const versionToUpdate = document.versions.find(
        v => v.versionType === version
      );

      if (!versionToUpdate) {
        return res.status(404).json({ error: 'Version not found' });
      }

      // Update the document's updatedAt timestamp
      await prisma.document.update({
        where: { id: documentId },
        data: {
          updatedAt: new Date(),
        },
      });

      return res.status(200).json({ success: true });
    }

    // Handle DELETE request to delete a version
    if (req.method === 'DELETE') {
      const { version } = req.query;

      if (!version) {
        return res.status(400).json({ error: 'Version is required' });
      }

      // Find the version to delete
      const versionToDelete = document.versions.find(
        v => v.versionType === version
      );

      if (!versionToDelete) {
        return res.status(404).json({ error: 'Version not found' });
      }

      // Cannot delete the current version (most recent)
      const latestVersion = document.versions.length > 0 ? document.versions[0] : null;
      if (latestVersion && versionToDelete.id === latestVersion.id) {
        return res.status(400).json({ error: 'Cannot delete the current version' });
      }

      // Delete the version
      await prisma.documentVersion.delete({
        where: { id: versionToDelete.id },
      });

      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Documents versions API error:', error);

    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request data', details: error.errors });
    }

    if (error instanceof ApiError) {
      return res.status(error.statusCode).json({ error: error.message });
    }

    return res.status(500).json({ error: 'Internal server error' });
  }
}
