import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]';
import prisma from '../../../../lib/prisma';
import { z } from 'zod';
import { ApiError } from '../../../../utils/api';
import { diffJson } from 'diff';

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

    // Handle GET request to compare versions
    if (req.method === 'GET') {
      const { versionA, versionB } = req.query;
      
      if (!versionA || !versionB) {
        return res.status(400).json({ error: 'Both versionA and versionB are required' });
      }
      
      // Find the versions to compare
      const versionAData = document.versions.find(v => v.versionType === versionA);
      const versionBData = document.versions.find(v => v.versionType === versionB);
      
      if (!versionAData || !versionBData) {
        return res.status(404).json({ error: 'One or both versions not found' });
      }
      
      // Fetch user data for both versions
      const userA = await prisma.user.findUnique({
        where: { id: versionAData.createdBy },
        select: { name: true }
      });
      
      const userB = await prisma.user.findUnique({
        where: { id: versionBData.createdBy },
        select: { name: true }
      });
      
      // Fetch the content for both versions
      // In a real implementation, this would fetch the actual document content
      // For this example, we'll use mock data
      const versionAContent = {
        content: `Mock content for version ${versionA}`,
        metadata: {
          version: versionAData.versionType,
          date: versionAData.createdAt,
          user: userA?.name || 'Unknown User',
        }
      };
      
      const versionBContent = {
        content: `Mock content for version ${versionB}`,
        metadata: {
          version: versionBData.versionType,
          date: versionBData.createdAt,
          user: userB?.name || 'Unknown User',
        }
      };
      
      // Compare the versions
      // In a real implementation, this would do a proper diff of the document content
      // For this example, we'll create some mock differences
      const differences = [
        {
          type: 'changed',
          path: 'Document Title',
          valueA: `Title in version ${versionA}`,
          valueB: `Title in version ${versionB}`,
        },
        {
          type: 'added',
          path: 'Section 3',
          valueB: 'New section added',
        },
        {
          type: 'removed',
          path: 'Old Reference',
          valueA: 'Reference that was removed',
        },
      ];
      
      return res.status(200).json({
        versionA: versionAContent,
        versionB: versionBContent,
        differences,
      });
    }
    
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Documents compare API error:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request data', details: error.errors });
    }
    
    if (error instanceof ApiError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    
    return res.status(500).json({ error: 'Internal server error' });
  }
}