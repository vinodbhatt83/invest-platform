import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardContent, CardTitle, CardFooter } from '../../ui/Card';
import Button from '../../ui/Button';
import ConfidenceIndicator from './ConfidenceIndicator';
import ValidationControls from './ValidationControls';
import { useNotification } from '../../ui/Notification';

interface Field {
    id: string;
    name: string;
    value: string;
    confidence: number;
    isValid?: boolean;
}

interface ExtractionData {
    documentId: string;
    fields: Field[];
    status: 'pending' | 'processing' | 'completed' | 'failed';
    error?: string;
}

interface ExtractionReviewProps {
    extractionData: ExtractionData;
    onSave?: (data: ExtractionData) => Promise<void>;
    onReprocess?: (documentId: string) => Promise<void>;
    isReadOnly?: boolean;
}

const ExtractionReview: React.FC<ExtractionReviewProps> = ({
    extractionData,
    onSave,
    onReprocess,
    isReadOnly = false,
}) => {
    const [localData, setLocalData] = useState<ExtractionData>(extractionData);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const { showNotification } = useNotification();

    useEffect(() => {
        setLocalData(extractionData);
    }, [extractionData]);

    const handleValueChange = (fieldId: string, value: string) => {
        if (isReadOnly) return;

        setLocalData((prev) => ({
            ...prev,
            fields: prev.fields.map((field) =>
                field.id === fieldId ? { ...field, value, isValid: true } : field
            ),
        }));
    };

    const handleValidationChange = (fieldId: string, isValid: boolean) => {
        if (isReadOnly) return;

        setLocalData((prev) => ({
            ...prev,
            fields: prev.fields.map((field) =>
                field.id === fieldId ? { ...field, isValid } : field
            ),
        }));
    };

    const handleSave = async () => {
        if (!onSave) return;

        setIsLoading(true);
        try {
            await onSave(localData);
            showNotification({
                type: 'success',
                title: 'Saved',
                message: 'Extraction data saved successfully',
            });
        } catch (error) {
            showNotification({
                type: 'error',
                title: 'Error',
                message: 'Failed to save extraction data',
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleReprocess = async () => {
        if (!onReprocess) return;

        setIsLoading(true);
        try {
            await onReprocess(localData.documentId);
            showNotification({
                type: 'success',
                title: 'Reprocessing',
                message: 'Document has been sent for reprocessing',
            });
        } catch (error) {
            showNotification({
                type: 'error',
                title: 'Error',
                message: 'Failed to reprocess document',
            });
        } finally {
            setIsLoading(false);
        }
    };

    const averageConfidence = localData.fields.length > 0
        ? localData.fields.reduce((sum, field) => sum + field.confidence, 0) / localData.fields.length
        : 0;

    const getStatusLabel = (status: ExtractionData['status']) => {
        switch (status) {
            case 'pending':
                return 'Pending';
            case 'processing':
                return 'Processing';
            case 'completed':
                return 'Completed';
            case 'failed':
                return 'Failed';
            default:
                return 'Unknown';
        }
    };

    const getStatusColor = (status: ExtractionData['status']) => {
        switch (status) {
            case 'pending':
                return 'bg-yellow-100 text-yellow-800';
            case 'processing':
                return 'bg-blue-100 text-blue-800';
            case 'completed':
                return 'bg-green-100 text-green-800';
            case 'failed':
                return 'bg-red-100 text-red-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    const isProcessingComplete = ['completed', 'failed'].includes(localData.status);
    const allFieldsValid = localData.fields.every((field) => field.isValid !== false);
    const canSave = isProcessingComplete && !isReadOnly && allFieldsValid;

    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-center">
                    <CardTitle>Extraction Review</CardTitle>
                    <div className="flex items-center space-x-2">
                        <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                                localData.status
                            )}`}
                        >
                            {getStatusLabel(localData.status)}
                        </span>
                        <ConfidenceIndicator
                            score={averageConfidence}
                            size="sm"
                            showLabel={true}
                        />
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                {localData.status === 'failed' && localData.error && (
                    <div className="mb-4 p-3 bg-red-50 text-red-800 rounded-md border border-red-200">
                        <div className="flex">
                            <div className="flex-shrink-0">
                                <svg
                                    className="h-5 w-5 text-red-400"
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 20 20"
                                    fill="currentColor"
                                >
                                    <path
                                        fillRule="evenodd"
                                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                                        clipRule="evenodd"
                                    />
                                </svg>
                            </div>
                            <div className="ml-3">
                                <h3 className="text-sm font-medium">Extraction failed</h3>
                                <div className="mt-2 text-sm">{localData.error}</div>
                            </div>
                        </div>
                    </div>
                )}

                {['pending', 'processing'].includes(localData.status) ? (
                    <div className="flex flex-col items-center justify-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                        <p className="text-lg font-medium text-gray-900">
                            {localData.status === 'pending' ? 'Waiting to process' : 'Processing document...'}
                        </p>
                        <p className="text-sm text-gray-500 mt-2">
                            This may take a few moments depending on the document size and complexity.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {localData.fields.length === 0 ? (
                            <div className="text-center py-8">
                                <svg
                                    className="mx-auto h-12 w-12 text-gray-400"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"
                                    />
                                </svg>
                                <h3 className="mt-2 text-sm font-medium text-gray-900">No data extracted</h3>
                                <p className="mt-1 text-sm text-gray-500">
                                    No fields were extracted from this document.
                                </p>
                                {!isReadOnly && (
                                    <div className="mt-6">
                                        <Button onClick={handleReprocess} disabled={isLoading}>
                                            Try Again
                                        </Button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="grid gap-6 md:grid-cols-2">
                                {localData.fields.map((field) => (
                                    <ValidationControls
                                        key={field.id}
                                        field={field}
                                        onValueChange={(value) => handleValueChange(field.id, value)}
                                        onValidationChange={(isValid) => handleValidationChange(field.id, isValid)}
                                        isReadOnly={isReadOnly}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </CardContent>
            {!isReadOnly && (
                <CardFooter className="flex justify-between">
                    <Button
                        variant="secondary"
                        onClick={handleReprocess}
                        disabled={isLoading || localData.status === 'processing'}
                    >
                        Reprocess Document
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={!canSave || isLoading}
                        isLoading={isLoading}
                    >
                        Save Changes
                    </Button>
                </CardFooter>
            )}
        </Card>
    );
};

export default ExtractionReview;