import React from 'react';

interface UploadProgressProps {
    status: 'pending' | 'uploading' | 'success' | 'error';
    progress: number;
    error?: string;
}

const UploadProgress: React.FC<UploadProgressProps> = ({ status, progress, error }) => {
    const getStatusColor = () => {
        switch (status) {
            case 'uploading':
                return 'bg-blue-600';
            case 'success':
                return 'bg-green-600';
            case 'error':
                return 'bg-red-600';
            default:
                return 'bg-gray-300';
        }
    };

    const getStatusText = () => {
        switch (status) {
            case 'uploading':
                return `Uploading... ${progress}%`;
            case 'success':
                return 'Upload complete';
            case 'error':
                return error || 'Upload failed';
            default:
                return 'Pending';
        }
    };

    const getStatusIcon = () => {
        switch (status) {
            case 'success':
                return (
                    <svg
                        className="h-5 w-5 text-green-500"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                    >
                        <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                            clipRule="evenodd"
                        />
                    </svg>
                );
            case 'error':
                return (
                    <svg
                        className="h-5 w-5 text-red-500"
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
                );
            default:
                return null;
        }
    };

    return (
        <div className="w-full">
            <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-gray-700">{getStatusText()}</span>
                {getStatusIcon()}
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div
                    className={`${getStatusColor()} h-2.5 rounded-full transition-all duration-300 ease-in-out`}
                    style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
                ></div>
            </div>
        </div>
    );
};

export default UploadProgress;