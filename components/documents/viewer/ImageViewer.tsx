import React, { useState } from 'react';
import Button from '../../ui/Button';

interface ImageViewerProps {
    fileUrl: string;
    alt?: string;
    onError?: (error: Error) => void;
}

const ImageViewer: React.FC<ImageViewerProps> = ({ fileUrl, alt = 'Document image', onError }) => {
    const [scale, setScale] = useState<number>(1.0);
    const [rotation, setRotation] = useState<number>(0);
    const [isLoading, setIsLoading] = useState<boolean>(true);

    const handleImageLoad = () => {
        setIsLoading(false);
    };

    const handleImageError = () => {
        setIsLoading(false);
        if (onError) {
            onError(new Error('Failed to load image'));
        }
    };

    const zoomIn = () => setScale((prevScale) => Math.min(prevScale + 0.2, 3));
    const zoomOut = () => setScale((prevScale) => Math.max(prevScale - 0.2, 0.5));
    const resetZoom = () => setScale(1.0);

    const rotateLeft = () => setRotation((prev) => (prev - 90) % 360);
    const rotateRight = () => setRotation((prev) => (prev + 90) % 360);

    return (
        <div className="flex flex-col">
            <div className="flex justify-between items-center mb-4 p-2 bg-gray-50 rounded-lg">
                <div className="flex space-x-1">
                    <Button variant="secondary" size="sm" onClick={rotateLeft}>
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
                                d="M10 19l-7-7m0 0l7-7m-7 7h18"
                            />
                        </svg>
                    </Button>
                    <Button variant="secondary" size="sm" onClick={rotateRight}>
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
                                d="M14 5l7 7m0 0l-7 7m7-7H3"
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

            <div className="flex justify-center items-center bg-gray-100 rounded-lg overflow-auto h-96 relative">
                {isLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                    </div>
                )}
                <div
                    className="transition-transform duration-300"
                    style={{
                        transform: `scale(${scale}) rotate(${rotation}deg)`,
                        maxWidth: '100%',
                        maxHeight: '100%',
                    }}
                >
                    <img
                        src={fileUrl}
                        alt={alt}
                        className="max-w-full max-h-full object-contain"
                        onLoad={handleImageLoad}
                        onError={handleImageError}
                    />
                </div>
            </div>
        </div>
    );
};

export default ImageViewer;