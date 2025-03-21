import React, { useState } from 'react';
import { GetServerSideProps } from 'next';
import { getSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Layout from '../../components/layout/Layout';
import DocumentUpload from '../../components/documents/upload/DocumentUpload';
import { Card, CardHeader, CardContent, CardTitle } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { useNotification } from '../../components/ui/Notification';

export default function UploadPage() {
    const router = useRouter();
    const { showNotification } = useNotification();
    const [isUploading, setIsUploading] = useState(false);
    const [uploadedDocumentIds, setUploadedDocumentIds] = useState<string[]>([]);

    const handleUploadComplete = (documentIds: string[]) => {
        setUploadedDocumentIds(documentIds);
    };

    const handleProcessDocuments = async () => {
        if (uploadedDocumentIds.length === 0) return;

        setIsUploading(true);
        try {
            // Process each document
            await Promise.all(
                uploadedDocumentIds.map(async (id) => {
                    const response = await fetch('/api/documents/process', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ documentId: id }),
                    });

                    if (!response.ok) {
                        throw new Error(`Failed to process document ${id}`);
                    }
                })
            );

            showNotification({
                type: 'success',
                title: 'Processing Started',
                message: 'Your documents have been queued for processing',
            });

            // Redirect to documents page
            router.push('/documents');
        } catch (error) {
            console.error('Error processing documents:', error);
            showNotification({
                type: 'error',
                title: 'Processing Error',
                message: 'Failed to process one or more documents',
            });
        } finally {
            setIsUploading(false);
        }
    };

    const navigateToDocuments = () => {
        if (uploadedDocumentIds.length === 1) {
            router.push(`/documents/${uploadedDocumentIds[0]}`);
        } else {
            router.push('/documents');
        }
    };

    return (
        <Layout title="Upload Document | INVEST Platform">
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                    <h1 className="text-2xl font-bold text-gray-900">Upload Document</h1>
                    <Button
                        variant="secondary"
                        onClick={() => router.push('/documents')}
                    >
                        Back to Documents
                    </Button>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Upload New Document</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-gray-500 mb-6">
                            Upload document files for processing. Supported formats include PDF, Microsoft Office documents (Word, Excel),
                            CSV files, and images (JPG, PNG).
                        </p>

                        <DocumentUpload
                            onUploadComplete={handleUploadComplete}
                            endpoint="/api/documents/upload"
                            allowedFileTypes={['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.csv', '.jpg', '.jpeg', '.png']}
                            maxFileSize={10 * 1024 * 1024} // 10MB
                            maxFiles={5}
                        />

                        {uploadedDocumentIds.length > 0 && (
                            <div className="mt-8 border-t pt-6">
                                <div className="rounded-md bg-green-50 p-4">
                                    <div className="flex">
                                        <div className="flex-shrink-0">
                                            <svg className="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                            </svg>
                                        </div>
                                        <div className="ml-3">
                                            <h3 className="text-sm font-medium text-green-800">Upload Successful</h3>
                                            <div className="mt-2 text-sm text-green-700">
                                                <p>
                                                    {uploadedDocumentIds.length} {uploadedDocumentIds.length === 1 ? 'document' : 'documents'} uploaded successfully.
                                                    Would you like to process {uploadedDocumentIds.length === 1 ? 'it' : 'them'} now?
                                                </p>
                                            </div>
                                            <div className="mt-4 flex space-x-3">
                                                <Button
                                                    onClick={handleProcessDocuments}
                                                    isLoading={isUploading}
                                                    disabled={isUploading}
                                                >
                                                    Process {uploadedDocumentIds.length === 1 ? 'Document' : 'Documents'}
                                                </Button>
                                                <Button
                                                    variant="secondary"
                                                    onClick={navigateToDocuments}
                                                >
                                                    View {uploadedDocumentIds.length === 1 ? 'Document' : 'Documents'}
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Document Processing Steps</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-6">
                            <div className="relative">
                                <div className="relative flex items-start pb-6">
                                    <div>
                                        <div className="relative px-1">
                                            <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center ring-2 ring-white">
                                                <span className="text-white text-sm font-medium">1</span>
                                            </div>
                                        </div>
                                        <div className="absolute top-8 left-4 -ml-px w-0.5 h-full bg-gray-300"></div>
                                    </div>
                                    <div className="min-w-0 flex-1 ml-4">
                                        <div>
                                            <div className="text-sm font-medium text-gray-900">Upload Document</div>
                                            <p className="mt-1 text-sm text-gray-500">
                                                Upload your documents using the form above. The platform supports various file formats including PDF, Excel, Word, and images.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                <div className="relative flex items-start pb-6">
                                    <div>
                                        <div className="relative px-1">
                                            <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center ring-2 ring-white">
                                                <span className="text-white text-sm font-medium">2</span>
                                            </div>
                                        </div>
                                        <div className="absolute top-8 left-4 -ml-px w-0.5 h-full bg-gray-300"></div>
                                    </div>
                                    <div className="min-w-0 flex-1 ml-4">
                                        <div>
                                            <div className="text-sm font-medium text-gray-900">Document Processing</div>
                                            <p className="mt-1 text-sm text-gray-500">
                                                After uploading, the system will process your documents to extract relevant data using machine learning algorithms.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                <div className="relative flex items-start pb-6">
                                    <div>
                                        <div className="relative px-1">
                                            <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center ring-2 ring-white">
                                                <span className="text-white text-sm font-medium">3</span>
                                            </div>
                                        </div>
                                        <div className="absolute top-8 left-4 -ml-px w-0.5 h-full bg-gray-300"></div>
                                    </div>
                                    <div className="min-w-0 flex-1 ml-4">
                                        <div>
                                            <div className="text-sm font-medium text-gray-900">Review Extracted Data</div>
                                            <p className="mt-1 text-sm text-gray-500">
                                                Review and validate the extracted data. You can make corrections to any incorrectly extracted information.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                <div className="relative flex items-start">
                                    <div>
                                        <div className="relative px-1">
                                            <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center ring-2 ring-white">
                                                <span className="text-white text-sm font-medium">4</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="min-w-0 flex-1 ml-4">
                                        <div>
                                            <div className="text-sm font-medium text-gray-900">Map Data to Your Systems</div>
                                            <p className="mt-1 text-sm text-gray-500">
                                                Map the extracted data to your target systems for further processing or integration.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </Layout>
    );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
    const session = await getSession(context);

    if (!session) {
        return {
            redirect: {
                destination: '/api/auth/signin',
                permanent: false,
            },
        };
    }

    return {
        props: {},
    };
};