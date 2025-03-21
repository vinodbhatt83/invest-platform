// lib/file-utils.ts
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Readable } from "stream";

// Initialize your S3 client (replace with your storage solution)
const s3Client = new S3Client({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    }
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME || 'documents-bucket';

/**
 * Upload a file to S3
 */
export async function uploadToS3(fileBuffer: Buffer, key: string): Promise<string> {
    const params = {
        Bucket: BUCKET_NAME,
        Key: key,
        Body: fileBuffer,
        ContentType: getFileType('', key),
    };

    await s3Client.send(new PutObjectCommand(params));

    // Generate a signed URL for the file (valid for 1 hour)
    const command = new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
    });

    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    return signedUrl;
}

/**
 * Get a file from S3
 */
export async function getFileFromStorage(fileUrl: string): Promise<Buffer> {
    // Extract key from URL or path
    // This is a simple example - you may need to adjust based on your URL format
    const key = fileUrl.includes('documents/')
        ? fileUrl.split('documents/')[1]
        : fileUrl;

    const params = {
        Bucket: BUCKET_NAME,
        Key: key,
    };

    const { Body } = await s3Client.send(new GetObjectCommand(params));

    if (!Body) {
        throw new Error('File not found');
    }

    // Convert stream to buffer
    return streamToBuffer(Body as Readable);
}

/**
 * Convert a Readable stream to a Buffer
 */
async function streamToBuffer(stream: Readable): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
        const chunks: Buffer[] = [];
        stream.on('data', (chunk) => chunks.push(chunk));
        stream.on('error', reject);
        stream.on('end', () => resolve(Buffer.concat(chunks)));
    });
}

/**
 * Get the file type from MIME type and/or filename
 */
export function getFileType(mimeType: string, fileName: string): string {
    if (mimeType && mimeType !== 'application/octet-stream') {
        return mimeType;
    }

    // Fallback to extension-based detection
    const extension = fileName.split('.').pop()?.toLowerCase();

    const mimeTypeMap: { [key: string]: string } = {
        'pdf': 'application/pdf',
        'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'doc': 'application/msword',
        'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'xls': 'application/vnd.ms-excel',
        'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'ppt': 'application/vnd.ms-powerpoint',
        'txt': 'text/plain',
        'json': 'application/json',
        'csv': 'text/csv',
        'png': 'image/png',
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'gif': 'image/gif',
        'svg': 'image/svg+xml',
    };

    return extension && mimeTypeMap[extension]
        ? mimeTypeMap[extension]
        : 'application/octet-stream';
}

/**
 * Format bytes to human-readable size
 */
export function formatBytes(bytes: number, decimals = 2) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Extract metadata from a file
 */
export async function getFileMetadata(fileBuffer: Buffer, fileType: string): Promise<any> {
    // This is a simplified approach - in a real implementation, you'd want to
    // use libraries specific to each file type (like exif, pdf-parse, etc.)

    // Basic metadata that applies to all files
    const metadata: any = {
        size: fileBuffer.length,
        type: fileType,
    };

    // For specific file types, add more detailed metadata
    if (fileType.includes('image')) {
        // For images, you could extract dimensions, EXIF data, etc.
        // This is a placeholder - use a library like 'sharp' for real implementation
        metadata.dimensions = { width: 0, height: 0 };
    } else if (fileType.includes('pdf')) {
        // For PDFs, you could extract page count, title, author, etc.
        // This is a placeholder - use a library like 'pdf-parse' for real implementation
        metadata.pageCount = 0;
    } else if (fileType.includes('word') || fileType.includes('document')) {
        // For Word documents, you could extract word count, page count, etc.
        // This is a placeholder - use a library like 'mammoth' for real implementation
        metadata.wordCount = 0;
    } else if (fileType.includes('spreadsheet') || fileType.includes('excel')) {
        // For Excel files, you could extract sheet count, cell count, etc.
        // This is a placeholder - use a library like 'xlsx' for real implementation
        metadata.sheetCount = 0;
    }

    return metadata;
}