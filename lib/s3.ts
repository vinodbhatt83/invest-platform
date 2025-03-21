import AWS from 'aws-sdk';

// Configure AWS SDK
AWS.config.update({
    accessKeyId: process.env.S3_ACCESS_KEY,
    secretAccessKey: process.env.S3_SECRET_KEY,
    region: process.env.S3_REGION,
});

// Create S3 service object
const s3 = new AWS.S3();

// S3 bucket name
const BUCKET_NAME = process.env.S3_BUCKET_NAME || 'invest-platform-documents';

// Generate a presigned URL for uploading
export const getPresignedUploadUrl = async (
    key: string,
    contentType: string,
    expiresIn: number = 60 * 5 // 5 minutes by default
): Promise<string> => {
    const params = {
        Bucket: BUCKET_NAME,
        Key: key,
        ContentType: contentType,
        Expires: expiresIn,
    };

    try {
        return await s3.getSignedUrlPromise('putObject', params);
    } catch (error) {
        console.error('Error generating presigned URL:', error);
        throw error;
    }
};

// Generate a presigned URL for viewing
export const getPresignedViewUrl = async (
    key: string,
    expiresIn: number = 60 * 60 // 1 hour by default
): Promise<string> => {
    const params = {
        Bucket: BUCKET_NAME,
        Key: key,
        Expires: expiresIn,
    };

    try {
        return await s3.getSignedUrlPromise('getObject', params);
    } catch (error) {
        console.error('Error generating presigned view URL:', error);
        throw error;
    }
};

// Upload a file directly from the server (for smaller files)
export const uploadFile = async (
    key: string,
    body: Buffer | string,
    contentType: string
): Promise<AWS.S3.ManagedUpload.SendData> => {
    const params = {
        Bucket: BUCKET_NAME,
        Key: key,
        Body: body,
        ContentType: contentType,
    };

    try {
        return await s3.upload(params).promise();
    } catch (error) {
        console.error('Error uploading file to S3:', error);
        throw error;
    }
};

// Download a file from S3
export const downloadFile = async (key: string): Promise<AWS.S3.GetObjectOutput> => {
    const params = {
        Bucket: BUCKET_NAME,
        Key: key,
    };

    try {
        return await s3.getObject(params).promise();
    } catch (error) {
        console.error('Error downloading file from S3:', error);
        throw error;
    }
};

// Delete a file from S3
export const deleteFile = async (key: string): Promise<AWS.S3.DeleteObjectOutput> => {
    const params = {
        Bucket: BUCKET_NAME,
        Key: key,
    };

    try {
        return await s3.deleteObject(params).promise();
    } catch (error) {
        console.error('Error deleting file from S3:', error);
        throw error;
    }
};

export default {
    s3,
    getPresignedUploadUrl,
    getPresignedViewUrl,
    uploadFile,
    downloadFile,
    deleteFile,
};

