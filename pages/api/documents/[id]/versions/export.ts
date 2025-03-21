import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]';
import prisma from '../../../../../lib/prisma';
import { ApiError } from '../../../../../utils/api';
import { createObjectCsvStringifier } from 'csv-writer';

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
          include: {
            user: {
              select: {
                name: true
              }
            }
          }
        },
      },
    });

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Handle GET request to export version history
    if (req.method === 'GET') {
      // Get the most recent version to determine which is current
      const latestVersion = document.versions.length > 0 ? document.versions[0] : null;

      // Format the version data for CSV export
      const csvData = document.versions.map(version => ({
        version: version.versionType,
        date: new Date(version.createdAt).toLocaleString(),
        user: version.user?.name || 'Unknown',
        isCurrent: latestVersion ? version.id === latestVersion.id : 'No',
        notes: '', // This would need to be stored elsewhere or in a JSON field
      }));

      // Create CSV stringifier
      const csvStringifier = createObjectCsvStringifier({
        header: [
          { id: 'version', title: 'Version' },
          { id: 'date', title: 'Date Created' },
          { id: 'user', title: 'Created By' },
          { id: 'isCurrent', title: 'Current Version' },
          { id: 'notes', title: 'Notes' },
        ]
      });

      // Generate CSV content
      const csvContent = csvStringifier.getHeaderString() + csvStringifier.stringifyRecords(csvData);

      // Set response headers for file download
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="document_${documentId}_version_history.csv"`);

      return res.status(200).send(csvContent);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Documents versions export API error:', error);

    if (error instanceof ApiError) {
      return res.status(error.statusCode).json({ error: error.message });
    }

    return res.status(500).json({ error: 'Internal server error' });
  }
}
