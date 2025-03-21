import React, { useState } from 'react';
import { GetServerSideProps } from 'next';
import { getSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Layout from '../../../components/layout/Layout';
import DocumentViewer from '../../../components/documents/viewer/DocumentViewer';
import ExtractionReview from '../../../components/documents/extraction/ExtractionReview';
import { Card, CardHeader, CardContent, CardTitle } from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import { useNotification } from '../../../components/ui/Notification';

interface Document {
    id: string;
    name: string;
    description?: string;
    fileUrl: string;
    fileType: string;
    fileSize: number;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    extractedData?: {
        id: string;
        status: string;
        confidence: number;
        fields: {
            id: string;
            name: string;
            value: string;
            confidence: number;
            isValid?: boolean;
        }[];
        error?: string;
    };
}

interface DocumentExtractPageProps {
    document: Document;
}

export default function DocumentExtractPage({ document }: DocumentExtractPageProps) {
    const router = useRouter();
    const { showNotification } = useNotification();
    const [isSaving, setIsSaving] = useState<boolean>(false);
    const [isProcessing, setIsProcessing] = useState<boolean>(false);

    const handleSaveExtraction = async (data: any) => {
        setIsSaving(true);
        try {
            const response = await fetch(`/api/documents/${document.id}/extracted-data`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    fields: data.fields,
                    status: data.status,
                    confidence: data.confidence,
                    error: data.error,
                }),
            });

            if (!response.ok) throw new Error('Failed to save extraction data');

            const result = await response.json();

            showNotification({
                type: 'success',
                title: 'Success',
                message: 'Extraction data saved successfully',
            });

            return Promise.resolve();
        } catch (error) {
            console.error('Error saving extraction data:', error);
            showNotification({
                type: 'error',
                title: 'Error',
                message: 'Failed to save extraction data',
            });
            return Promise.reject(error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleReprocessDocument = async () => {
        setIsProcessing(true);
        try {
            const response = await fetch('/api/documents/process', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ documentId: document.id, force: true }),
            });

            if (!response.ok) throw new Error('Failed to process document');

            showNotification({
                type: 'success',
                title: 'Success',
                message: 'Document queued for reprocessing',
            });

            // Redirect to document detail page
            router.push(`/documents/${document.id}`);
        } catch (error) {
            console.error('Error processing document:', error);
            showNotification({
                type: 'error',
                title: 'Error',
                message: 'Failed to process document',
            });
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <Layout title={`${document.name} | Extract Data | INVEST Platform`}>
            <div className="space-y-6">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Extract Data</h1>
                        <p className="mt-1 text-sm text-gray-500">{document.name}</p>
                    </div>
                    <div className="flex space-x-2">
                        <Button
                            variant="secondary"
                            onClick={() => router.push(`/documents/${document.id}`)}
                        >
                            Back to Document
                        </Button>
                        {document.status === 'completed' && document.extractedData?.status === 'completed' && (
                            <Button
                                onClick={() => router.push(`/documents/${document.id}/map`)}
                            >
                                Map Data
                            </Button>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-6">
                        <ExtractionReview
                            extractionData={{
                                documentId: document.id,
                                fields: document.extractedData?.fields || [],
                                status: document.extractedData?.status as any || 'pending',
                                error: document.extractedData?.error,
                            }}
                            onSave={handleSaveExtraction}
                            onReprocess={handleReprocessDocument}
                        />
                    </div>
                    <div>
                        <Card>
                            <CardHeader>
                                <CardTitle>Document</CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                <DocumentViewer
                                    documentId={document.id}
                                    documentUrl={document.fileUrl}
                                    documentType={document.fileType as any}
                                    isLoading={false}
                                />
                            </CardContent>
                        </Card>

                        <Card className="mt-6">
                            <CardHeader>
                                <CardTitle>Extraction Tips</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ul className="space-y-3 text-sm text-gray-700">
                                    <li className="flex">
                                        <svg className="h-5 w-5 text-green-500 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                        </svg>
                                        <span>Review each extracted field and verify its accuracy.</span>
                                    </li>
                                    <li className="flex">
                                        <svg className="h-5 w-5 text-green-500 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                        </svg>
                                        <span>Click "Approve" if the extracted value is correct.</span>
                                    </li>
                                    <li className="flex">
                                        <svg className="h-5 w-5 text-green-500 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                        </svg>
                                        <span>Click "Reject" and edit values that need correction.</span>
                                    </li>
                                    <li className="flex">
                                        <svg className="h-5 w-5 text-green-500 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                        </svg>
                                        <span>Fields with higher confidence scores (green) are more likely to be accurate.</span>
                                    </li>
                                    <li className="flex">
                                        <svg className="h-5 w-5 text-green-500 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                        </svg>
                                        <span>Don't forget to save your changes when finished.</span>
                                    </li>
                                </ul>
                            </CardContent>
                        </Card>
                    </div>
                </div>
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

    const { id } = context.params as { id: string };

    try {
        // Fetch document with extraction data from API
        const response = await fetch(`${process.env.NEXTAUTH_URL}/api/documents/${id}`, {
            headers: {
                Cookie: context.req.headers.cookie || '',
            },
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch document: ${response.status}`);
        }

        const { document } = await response.json();

        // If extraction data doesn't exist yet, redirect to document page
        if (!document.extractedData) {
            return {
                redirect: {
                    destination: `/documents/${id}`,
                    permanent: false,
                },
            };
        }

        return {
            props: {
                document,
            },
        };
    } catch (error) {
        console.error('Error fetching document:', error);

        return {
            notFound: true,
        };
    }
};