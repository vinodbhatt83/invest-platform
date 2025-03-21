// components/documents/viewer/ImageViewer.tsx
import React, { useState } from 'react';
import Image from 'next/image';
import { FileImageIcon, ZoomIn, ZoomOut, RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ImageViewerProps {
    fileUrl: string;
    fileName: string;
}

const ImageViewer: React.FC<ImageViewerProps> = ({ fileUrl, fileName }) => {
    const [isLoading, setIsLoading] = useState(true);
    const [zoom, setZoom] = useState(1);
    const [rotation, setRotation] = useState(0);

    const handleZoomIn = () => {
        setZoom(prev => Math.min(prev + 0.25, 3));
    };

    const handleZoomOut = () => {
        setZoom(prev => Math.max(prev - 0.25, 0.5));
    };

    const handleRotate = () => {
        setRotation(prev => (prev + 90) % 360);
    };

    return (
        <div className="h-full w-full flex flex-col">
            <div className="flex justify-between items-center mb-2">
                <div className="text-sm text-muted-foreground">
                    Image Viewer
                </div>
                <div className="flex items-center gap-1">
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={handleZoomOut}
                        className="h-8 w-8"
                    >
                        <ZoomOut className="h-4 w-4" />
                    </Button>
                    <span className="text-sm w-12 text-center">
                        {Math.round(zoom * 100)}%
                    </span>
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={handleZoomIn}
                        className="h-8 w-8"
                    >
                        <ZoomIn className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={handleRotate}
                        className="h-8 w-8 ml-2"
                    >
                        <RotateCw className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            <div className="flex-1 border rounded-md overflow-hidden flex items-center justify-center bg-grid-pattern">
                <div
                    className="relative flex items-center justify-center transition-transform duration-200"
                    style={{
                        transform: `scale(${zoom}) rotate(${rotation}deg)`,
                        maxHeight: '100%',
                        maxWidth: '100%',
                    }}
                >
                    {isLoading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-background/80">
                            <div className="flex flex-col items-center">
                                <FileImageIcon className="h-10 w-10 animate-pulse" />
                                <p className="mt-2">Loading image...</p>
                            </div>
                        </div>
                    )}

                    {/* Simple image display - for a real implementation consider using a library with more features */}
                    <img
                        src={fileUrl}
                        alt={fileName}
                        className="max-w-full max-h-full object-contain"
                        onLoad={() => setIsLoading(false)}
                    />
                </div>
            </div>
        </div>
    );
};

export default ImageViewer;