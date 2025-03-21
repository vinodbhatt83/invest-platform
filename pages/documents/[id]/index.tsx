import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Layout from '../../../components/layout/Layout';
import DocumentViewer from '../../../components/documents/viewer/DocumentViewer';
import { Card, CardHeader, CardContent, CardTitle } from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import { useNotification } from '../../../components/ui/Notification';

// Explicitly disable static optimization
export const config = {
  unstable_runtimeJS: true,
};

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

export default function DocumentPage() {
  const { data: session, status } = useSession({
    required: true,
    onUnauthenticated() {
      // Redirect to login if not authenticated
      window.location.href = '/api/auth/signin';
    },
  });

  const router = useRouter();
  const { showNotification } = useNotification();
  const [document, setDocument] = useState<Document | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { id } = router.query;

  // Fetch document data client-side
  useEffect(() => {
    // Don't fetch if we're not authenticated yet or there's no ID
    if (status === 'loading' || !id || typeof id !== 'string') return;

    const fetchDocument = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/documents/${id}`);

        if (!response.ok) {
          if (response.status === 404) {
            router.push('/documents');
            showNotification({
              type: 'error',
              title: 'Not Found',
              message: 'The document you requested could not be found.',
            });
            return;
          }

          throw new Error(`Error fetching document: ${response.status}`);
        }

        const data = await response.json();
        setDocument(data.document);
      } catch (error) {
        console.error('Error fetching document:', error);
        showNotification({
          type: 'error',
          title: 'Error',
          message: 'Failed to load document details.',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchDocument();
  }, [id, status, router, showNotification]);

  // Show loading state
  if (isLoading) {
    return (
      <Layout title="Loading Document...">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-t-blue-500 border-blue-200 rounded-full animate-spin mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading document...</p>
          </div>
        </div>
      </Layout>
    );
  }

  // Show 404 if no document found
  if (!document) {
    return (
      <Layout title="Document Not Found">
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Document Not Found</h1>
          <p className="text-gray-600 mb-6">The document you're looking for doesn't exist or you don't have permission to view it.</p>
          <Button onClick={() => router.push('/documents')}>Back to Documents</Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title={`${document.name} | INVEST Platform`}>
      <div className="space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{document.name}</h1>
            {document.description && (
              <p className="mt-1 text-sm text-gray-500">{document.description}</p>
            )}
          </div>
          <div className="flex space-x-2">
            {document.status === 'completed' && (
              <Button onClick={() => router.push(`/documents/${document.id}/extract`)}>
                Edit Extraction
              </Button>
            )}
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Document Preview</CardTitle>
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
      </div>
    </Layout>
  );
}