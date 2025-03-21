import React, { useState, useEffect } from 'react';
import PdfViewer from './PdfViewer';
import ImageViewer from './ImageViewer';
import SpreadsheetViewer from './SpreadsheetViewer';
import { Card, CardHeader, CardContent, CardTitle } from '../../ui/Card';

export type DocumentType = 'pdf' | 'image' | 'spreadsheet' | 'unknown';

interface DocumentViewerProps {
    documentUrl: string;
    documentName?: string;
    documentType?: DocumentType;
    isLoading?: boolean;
    onError?: (error: Error) => void;
    className?: string;
}

const DocumentViewer: React.FC<DocumentViewerProps> = ({
    documentUrl,
    documentName = '',
    documentType,
    isLoading = false,
    onError,
    className,
}) => {
    const [type, setType] = useState<DocumentType>(documentType || 'unknown');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (documentType) {
            setType(documentType);
            return;
        }

        // Try to determine document type from file extension if not provided
        if (documentUrl && !documentType) {
            const extension = documentUrl.split('.').pop()?.toLowerCase();

            if (extension) {
                if (['pdf'].includes(extension)) {
                    setType('pdf');
                } else if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(extension)) {
                    setType('image');
                } else if (['csv', 'xls', 'xlsx', 'ods'].includes(extension)) {
                    setType('spreadsheet');
                } else {
                    setType('unknown');
                }
            }
        }
    }, [documentUrl, documentType]);

    const handleError = (err: Error) => {
        setError(err.message);
        if (onError) {
            onError(err);
        }
    };

    const renderDocumentViewer = () => {
        if (isLoading) {
            return (
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
            );
        }

        if (error) {
            return (
                <div className="flex flex-col items-center justify-center h-64 text-center">
                    <svg
                        className="h-12 w-12 text-red-500 mb-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                        />
                    </svg>
                    <p className="text-lg font-medium text-gray-900">Failed to load document</p>
                    <p className="text-sm text-gray-500 mt-1">{error}</p>
                </div>
            );
        }

        switch (type) {
            case 'pdf':
                return <PdfViewer fileUrl={documentUrl} onError={handleError} />;
            case 'image':
                return <ImageViewer fileUrl={documentUrl} alt={documentName} onError={handleError} />;
            case 'spreadsheet':
                return <SpreadsheetViewer fileUrl={documentUrl} onError={handleError} />;
            default:
                return (
                    <div className="flex flex-col items-center justify-center h-64 text-center">
                        <svg
                            className="h-12 w-12 text-gray-400 mb-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            />
                        </svg>
                        <p className="text-lg font-medium text-gray-900">Unsupported document type</p>
                        <p className="text-sm text-gray-500 mt-1">
                            This file format cannot be previewed. Please download to view.
                        </p>
                    </div>
                );
        }
    };

    return (
        <Card className={className}>
            {documentName && (
                <CardHeader>
                    <CardTitle>{documentName}</CardTitle>
                </CardHeader>
            )}
            <CardContent className="overflow-auto">
                {renderDocumentViewer()}
            </CardContent>
        </Card>
    );
};

export default DocumentViewer;