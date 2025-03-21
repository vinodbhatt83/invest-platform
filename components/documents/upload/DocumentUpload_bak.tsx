import React, { useState, useRef, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import FileValidator from './FileValidator';
import UploadProgress from './UploadProgress';
import Button from '../../ui/Button';
import { useNotification } from '../../ui/Notification';

interface UploadedFile {
    id: string;
    file: File;
    progress: number;
    status: 'pending' | 'uploading' | 'success' | 'error';
    error?: string;
}

interface DocumentUploadProps {
    onUploadComplete?: (fileIds: string[]) => void;
    allowedFileTypes?: string[];
    maxFileSize?: number; // in bytes
    maxFiles?: number;
    endpoint?: string;
    additionalData?: Record<string, any>;
}

const DocumentUpload: React.FC<DocumentUploadProps> = ({
    onUploadComplete,
    allowedFileTypes = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.csv', '.jpg', '.jpeg', '.png'],
    maxFileSize = 10 * 1024 * 1024, // 10MB
    maxFiles = 5,
    endpoint = '/api/documents/upload',
    additionalData = {},
}) => {
    const [files, setFiles] = useState<UploadedFile[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const abortControllerRef = useRef<Record<string, AbortController>>({});
    const { showNotification } = useNotification();

    const onDrop = useCallback(
        (acceptedFiles: File[]) => {
            // Check if adding these files would exceed the limit
            if (files.length + acceptedFiles.length > maxFiles) {
                showNotification({
                    type: 'error',
                    title: 'Upload limit exceeded',
                    message: `You can only upload a maximum of ${maxFiles} files at once.`,
                });
                return;
            }

            const newFiles = acceptedFiles.map((file) => ({
                id: Math.random().toString(36).substring(2, 9),
                file,
                progress: 0,
                status: 'pending' as const,
            }));

            setFiles((prevFiles) => [...prevFiles, ...newFiles]);
        },
        [files.length, maxFiles, showNotification]
    );

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: allowedFileTypes.reduce((acc, type) => {
            const mimeType = type.startsWith('.')
                ? { 'application/octet-stream': [type] }
                : { [type]: [] };
            return { ...acc, ...mimeType };
        }, {}),
        maxSize: maxFileSize,
        maxFiles: maxFiles - files.length,
        disabled: isUploading || files.length >= maxFiles,
    });

    const uploadFiles = async () => {
        if (files.length === 0 || isUploading) return;

        setIsUploading(true);
        const pendingFiles = files.filter((file) => file.status === 'pending');
        const uploadedFileIds: string[] = [];

        try {
            await Promise.all(
                pendingFiles.map(async (fileObj) => {
                    const formData = new FormData();
                    formData.append('file', fileObj.file);
                    Object.entries(additionalData).forEach(([key, value]) => {
                        formData.append(key, value);
                    });

                    // Create an abort controller for this upload
                    abortControllerRef.current[fileObj.id] = new AbortController();
                    const { signal } = abortControllerRef.current[fileObj.id];

                    try {
                        // Update status to uploading
                        setFiles((prevFiles) =>
                            prevFiles.map((f) =>
                                f.id === fileObj.id ? { ...f, status: 'uploading' as const } : f
                            )
                        );

                        const xhr = new XMLHttpRequest();

                        // Handle upload progress
                        xhr.upload.addEventListener('progress', (event) => {
                            if (event.lengthComputable) {
                                const progress = Math.round((event.loaded * 100) / event.total);
                                setFiles((prevFiles) =>
                                    prevFiles.map((f) =>
                                        f.id === fileObj.id ? { ...f, progress } : f
                                    )
                                );
                            }
                        });

                        // Create a promise to handle the XHR request
                        const uploadPromise = new Promise<string>((resolve, reject) => {
                            xhr.open('POST', endpoint);

                            xhr.onload = () => {
                                if (xhr.status >= 200 && xhr.status < 300) {
                                    const response = JSON.parse(xhr.responseText);
                                    resolve(response.id);
                                } else {
                                    reject(new Error(`Upload failed with status ${xhr.status}`));
                                }
                            };

                            xhr.onerror = () => {
                                reject(new Error('Network error occurred during upload'));
                            };

                            xhr.send(formData);
                        });

                        // Handle abort through signal
                        signal.addEventListener('abort', () => {
                            xhr.abort();
                        });

                        const fileId = await uploadPromise;
                        uploadedFileIds.push(fileId);

                        // Update status to success
                        setFiles((prevFiles) =>
                            prevFiles.map((f) =>
                                f.id === fileObj.id ? { ...f, status: 'success' as const, progress: 100 } : f
                            )
                        );
                    } catch (error) {
                        // Update status to error
                        setFiles((prevFiles) =>
                            prevFiles.map((f) =>
                                f.id === fileObj.id
                                    ? { ...f, status: 'error' as const, error: (error as Error).message }
                                    : f
                            )
                        );
                    } finally {
                        // Clean up abort controller
                        delete abortControllerRef.current[fileObj.id];
                    }
                })
            );

            if (uploadedFileIds.length > 0) {
                showNotification({
                    type: 'success',
                    title: 'Upload Successful',
                    message: `Successfully uploaded ${uploadedFileIds.length} document(s)`,
                });

                if (onUploadComplete) {
                    onUploadComplete(uploadedFileIds);
                }
            }
        } catch (error) {
            showNotification({
                type: 'error',
                title: 'Upload Failed',
                message: 'There was an error uploading your documents',
            });
        } finally {
            setIsUploading(false);
        }
    };

    const cancelUpload = (fileId: string) => {
        if (abortControllerRef.current[fileId]) {
            abortControllerRef.current[fileId].abort();
        }

        setFiles((prevFiles) => prevFiles.filter((f) => f.id !== fileId));
    };

    const removeFile = (fileId: string) => {
        setFiles((prevFiles) => prevFiles.filter((f) => f.id !== fileId));
    };

    const clearCompleted = () => {
        setFiles((prevFiles) =>
            prevFiles.filter((file) => file.status !== 'success')
        );
    };

    return (
        <div className="space-y-6">
            <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-6 cursor-pointer transition-colors ${isDragActive
                        ? 'border-blue-400 bg-blue-50'
                        : 'border-gray-300 hover:border-blue-400'
                    } ${isUploading || files.length >= maxFiles ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
                <input {...getInputProps()} />
                <div className="text-center">
                    <svg
                        className="mx-auto h-12 w-12 text-gray-400"
                        stroke="currentColor"
                        fill="none"
                        viewBox="0 0 48 48"
                        aria-hidden="true"
                    >
                        <path
                            d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                            strokeWidth={2}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </svg>
                    <p className="mt-2 text-sm font-medium text-gray-900">
                        {isDragActive
                            ? 'Drop the files here'
                            : 'Drag and drop files here, or click to select files'}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                        {allowedFileTypes.join(', ')} up to {(maxFileSize / (1024 * 1024)).toFixed(0)}MB
                        {maxFiles && ` (max ${maxFiles} files)`}
                    </p>
                    {files.length >= maxFiles && (
                        <p className="mt-2 text-xs text-red-500">
                            Maximum number of files reached ({maxFiles})
                        </p>
                    )}
                </div>
            </div>

            {files.length > 0 && (
                <div className="space-y-4">
                    <div className="border rounded-lg overflow-hidden">
                        <div className="bg-gray-50 px-4 py-3 border-b flex justify-between items-center">
                            <h3 className="text-sm font-medium text-gray-700">
                                {files.length} {files.length === 1 ? 'file' : 'files'}
                            </h3>
                            <div className="flex space-x-2">
                                {files.some((file) => file.status === 'success') && (
                                    <Button
                                        size="sm"
                                        variant="secondary"
                                        onClick={clearCompleted}
                                    >
                                        Clear Completed
                                    </Button>
                                )}
                            </div>
                        </div>
                        <ul className="divide-y divide-gray-200">
                            {files.map((file) => (
                                <li key={file.id} className="px-4 py-3">
                                    <FileValidator
                                        file={file.file}
                                        allowedFileTypes={allowedFileTypes}
                                        maxFileSize={maxFileSize}
                                    >
                                        {({ isValid, errors }) => (
                                            <div>
                                                <div className="flex justify-between items-start">
                                                    <div className="flex items-center">
                                                        <div className="flex-shrink-0">
                                                            <svg
                                                                className="h-5 w-5 text-gray-400"
                                                                xmlns="http://www.w3.org/2000/svg"
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
                                                        </div>
                                                        <div className="ml-3">
                                                            <p className="text-sm font-medium text-gray-900 truncate" title={file.file.name}>
                                                                {file.file.name}
                                                            </p>
                                                            <p className="text-xs text-gray-500">
                                                                {(file.file.size / 1024).toFixed(1)} KB
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        {file.status === 'pending' && (
                                                            <button
                                                                type="button"
                                                                className="text-gray-400 hover:text-gray-500"
                                                                onClick={() => removeFile(file.id)}
                                                            >
                                                                <span className="sr-only">Remove</span>
                                                                <svg
                                                                    className="h-5 w-5"
                                                                    xmlns="http://www.w3.org/2000/svg"
                                                                    viewBox="0 0 20 20"
                                                                    fill="currentColor"
                                                                >
                                                                    <path
                                                                        fillRule="evenodd"
                                                                        d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                                                                        clipRule="evenodd"
                                                                    />
                                                                </svg>
                                                            </button>
                                                        )}
                                                        {file.status === 'uploading' && (
                                                            <button
                                                                type="button"
                                                                className="text-gray-400 hover:text-gray-500"
                                                                onClick={() => cancelUpload(file.id)}
                                                            >
                                                                <span className="sr-only">Cancel</span>
                                                                <svg
                                                                    className="h-5 w-5"
                                                                    xmlns="http://www.w3.org/2000/svg"
                                                                    viewBox="0 0 20 20"
                                                                    fill="currentColor"
                                                                >
                                                                    <path
                                                                        fillRule="evenodd"
                                                                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1zm4 0a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z"
                                                                        clipRule="evenodd"
                                                                    />
                                                                </svg>
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>

                                                {!isValid && errors.length > 0 && (
                                                    <div className="mt-1">
                                                        {errors.map((error, index) => (
                                                            <p key={index} className="text-xs text-red-500">
                                                                {error}
                                                            </p>
                                                        ))}
                                                    </div>
                                                )}

                                                {file.status !== 'pending' && (
                                                    <div className="mt-2">
                                                        <UploadProgress
                                                            status={file.status}
                                                            progress={file.progress}
                                                            error={file.error}
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </FileValidator>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className="flex justify-end space-x-3">
                        <Button
                            variant="secondary"
                            onClick={() => setFiles([])}
                            disabled={isUploading}
                        >
                            Clear All
                        </Button>
                        <Button
                            onClick={uploadFiles}
                            isLoading={isUploading}
                            disabled={
                                isUploading ||
                                files.length === 0 ||
                                !files.some((file) => file.status === 'pending')
                            }
                        >
                            Upload {files.filter((file) => file.status === 'pending').length} Files
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DocumentUpload;