import React, { useState, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import Button from '../../ui/Button';

// Set the worker URL for PDF.js
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

interface PdfViewerProps {
    fileUrl: string;
    onError?: (error: Error) => void;
}

const PdfViewer: React.FC<PdfViewerProps> = ({ fileUrl, onError }) => {
    const [numPages, setNumPages] = useState<number | null>(null);
    const [pageNumber, setPageNumber] = useState<number>(1);
    const [scale, setScale] = useState<number>(1.0);
    const [isLoading, setIsLoading] = useState<boolean>(true);

    useEffect(() => {
        // Reset state when file URL changes
        setNumPages(null);
        setPageNumber(1);
        setIsLoading(true);
    }, [fileUrl]);

    const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
        setNumPages(numPages);
        setPageNumber(1);
        setIsLoading(false);
    };

    const handleDocumentError = (err: Error) => {
        setIsLoading(false);
        if (onError) {
            onError(err);
        }
    };

    const changePage = (offset: number) => {
        if (numPages === null) return;

        const newPageNumber = pageNumber + offset;
        if (newPageNumber >= 1 && newPageNumber <= numPages) {
            setPageNumber(newPageNumber);
        }
    };

    const previousPage = () => changePage(-1);
    const nextPage = () => changePage(1);

    const zoomIn = () => setScale((prevScale) => Math.min(prevScale + 0.2, 3));
    const zoomOut = () => setScale((prevScale) => Math.max(prevScale - 0.2, 0.5));
    const resetZoom = () => setScale(1.0);

    return (
        <div className="flex flex-col">
            <div className="flex justify-between items-center mb-4 p-2 bg-gray-50 rounded-lg">
                <div className="flex space-x-1">
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={previousPage}
                        disabled={pageNumber <= 1}
                    >
                        <svg
                            className="w-4 h-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M15 19l-7-7 7-7"
                            />
                        </svg>
                    </Button>
                    <div className="px-2 py-1 text-sm">
                        Page {pageNumber} of {numPages || '--'}
                    </div>
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={nextPage}
                        disabled={numPages === null || pageNumber >= numPages}
                    >
                        <svg
                            className="w-4 h-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 5l7 7-7 7"
                            />
                        </svg>
                    </Button>
                </div>
                <div className="flex space-x-1">
                    <Button variant="secondary" size="sm" onClick={zoomOut}>
                        <svg
                            className="w-4 h-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M20 12H4"
                            />
                        </svg>
                    </Button>
                    <Button variant="secondary" size="sm" onClick={resetZoom}>
                        {Math.round(scale * 100)}%
                    </Button>
                    <Button variant="secondary" size="sm" onClick={zoomIn}>
                        <svg
                            className="w-4 h-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 4v16m8-8H4"
                            />
                        </svg>
                    </Button>
                </div>
            </div>

            <div className="flex justify-center items-center bg-gray-100 rounded-lg overflow-auto">
                {isLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                    </div>
                )}
                <Document
                    file={fileUrl}
                    onLoadSuccess={onDocumentLoadSuccess}
                    onError={handleDocumentError}
                    loading={
                        <div className="flex items-center justify-center h-64">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        </div>
                    }
                >
                    <Page
                        pageNumber={pageNumber}
                        scale={scale}
                        renderTextLayer={false}
                        renderAnnotationLayer={false}
                        className="shadow-md"
                    />
                </Document>
            </div>
        </div>
    );
};

export default PdfViewer;