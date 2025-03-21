import { NextApiRequest, NextApiResponse } from 'next';
import { authOptions } from '../auth/[...nextauth]';
import { IncomingForm } from 'formidable';
import { ApiError } from '../../../utils/api';
import s3Service from '../../../lib/s3';
import prisma from '../../../lib/prisma';
import { queueService } from '../../../lib/queue';
import fs from 'fs';
import path from 'path';

import { getServerSessionSafe } from '../../../lib/session';
// Disable Next.js body parsing
export const config = {
    api: {
        bodyParser: false,
    },
};

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

        // Parse the multipart form data
        const { fields, files } = await parseForm(req);

        if (!files.file) {
            throw new ApiError(400, 'No file uploaded');
        }

        const file = Array.isArray(files.file) ? files.file[0] : files.file;

        // Validate file
        validateFile(file);

        // Upload file to S3
        const uploadResult = await uploadFileToS3(file, session.user.id);

        // Create document in database
        const document = await createDocument(uploadResult, file, session.user.id);

        // Queue the document for processing
        await queueDocument(document.id);

        // Return success response
        return res.status(200).json({
            id: document.id,
            name: document.name,
            fileUrl: document.fileUrl,
            status: document.status,
        });
    } catch (error) {
        console.error('Upload API error:', error);
        if (error instanceof ApiError) {
            return res.status(error.statusCode).json({ error: error.message });
        }
        return res.status(500).json({ error: 'Internal server error' });
    }
}

// Parse the incoming multipart form
async function parseForm(req: NextApiRequest): Promise<{ fields: any, files: any }> {
    return new Promise((resolve, reject) => {
        const form = new IncomingForm({
            keepExtensions: true,
            maxFileSize: 10 * 1024 * 1024, // 10MB
        });

        form.parse(req, (err, fields, files) => {
            if (err) {
                reject(new ApiError(400, `Form parsing error: ${err.message}`));
                return;
            }
            resolve({ fields, files });
        });
    });
}

// Validate the uploaded file
function validateFile(file: any) {
    // Check file size
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
        throw new ApiError(400, `File too large. Maximum size is 10MB`);
    }

    // Check file extension and type
    const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/csv',
        'image/jpeg',
        'image/png',
    ];

    // Get file extension
    const ext = path.extname(file.originalFilename || '').toLowerCase();
    const allowedExtensions = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.csv', '.jpg', '.jpeg', '.png'];

    if (!allowedExtensions.includes(ext)) {
        throw new ApiError(400, `Invalid file type. Allowed types: ${allowedExtensions.join(', ')}`);
    }

    // Additionally check MIME type if available
    if (file.mimetype && !allowedTypes.includes(file.mimetype)) {
        throw new ApiError(400, `Invalid file type. Allowed MIME types: ${allowedTypes.join(', ')}`);
    }
}

// Upload file to S3
async function uploadFileToS3(file: any, userId: string) {
    try {
        const fileContent = fs.readFileSync(file.filepath);

        // Generate a unique key for the file
        const fileExt = path.extname(file.originalFilename || '').toLowerCase();
        const timestamp = Date.now();
        const randomString = Math.random().toString(36).substring(2, 10);
        const key = `documents/${userId}/${timestamp}-${randomString}${fileExt}`;

        // Upload to S3
        const uploadResult = await s3Service.uploadFile(key, fileContent, file.mimeType);

        // const uploadResult = await s3Service.uploadFile({
        //     Key: key,
        //     Body: fileContent,
        //     ContentType: file.mimetype,
        //     ContentDisposition: `attachment; filename="${file.originalFilename}"`,
        // });

        return {
            key,
            url: uploadResult.Location,
            contentType: file.mimetype,
            size: file.size,
        };
    } catch (error) {
        console.error('S3 upload error:', error);
        throw new ApiError(500, 'Failed to upload file to storage');
    } finally {
        // Clean up the temp file
        try {
            fs.unlinkSync(file.filepath);
        } catch (err) {
            console.error('Failed to delete temp file:', err);
        }
    }
}

// Create document record in database
async function createDocument(uploadResult: any, file: any, userId: string) {
    // Determine file type category
    let fileType: string;
    const mimeType = file.mimetype?.toLowerCase() || '';
    const ext = path.extname(file.originalFilename || '').toLowerCase();

    if (mimeType.includes('pdf') || ext === '.pdf') {
        fileType = 'pdf';
    } else if (mimeType.includes('image') || ['.jpg', '.jpeg', '.png'].includes(ext)) {
        fileType = 'image';
    } else if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || mimeType.includes('csv') || ['.xls', '.xlsx', '.csv'].includes(ext)) {
        fileType = 'spreadsheet';
    } else if (mimeType.includes('word') || ['.doc', '.docx'].includes(ext)) {
        fileType = 'document';
    } else {
        fileType = 'other';
    }

    // Create document in database
    return await prisma.document.create({
        data: {
            name: file.originalFilename || 'Untitled Document',
            fileUrl: uploadResult.url,
            fileType,
            fileSize: file.size,
            originalFileName: file.originalFilename,
            status: 'pending',
            userId,
        },
    });
}

// Queue document for processing
async function queueDocument(documentId: string) {
    try {
        // Add to processing queue
        await queueService.addToQueue('document-processing', {
            documentId,
            priority: 'normal',
            timestamp: Date.now(),
        });
    } catch (error) {
        console.error('Failed to queue document for processing:', error);
        // Update document status to failed
        await prisma.document.update({
            where: { id: documentId },
            data: { status: 'failed' },
        });
        throw new ApiError(500, 'Failed to queue document for processing');
    }
}