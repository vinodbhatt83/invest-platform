// components/documents/viewer/TextViewer.tsx
import React, { useState, useEffect } from 'react';
import { FileTextIcon } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface TextViewerProps {
    fileUrl: string;
}

const TextViewer: React.FC<TextViewerProps> = ({ fileUrl }) => {
    const [content, setContent] = useState<string>('');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchTextContent = async () => {
            try {
                setIsLoading(true);
                const response = await fetch(fileUrl);

                if (!response.ok) {
                    throw new Error('Failed to load file');
                }

                const text = await response.text();
                setContent(text);
            } catch (err) {
                console.error('Error loading text file:', err);
                setError(err instanceof Error ? err.message : 'Unknown error');
            } finally {
                setIsLoading(false);
            }
        };

        fetchTextContent();
    }, [fileUrl]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="flex flex-col items-center">
                    <FileTextIcon className="h-10 w-10 animate-pulse" />
                    <p className="mt-2">Loading text content...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-center p-4">
                    <p className="text-destructive font-medium">Error loading file: {error}</p>
                    <p className="text-muted-foreground mt-2">
                        Please try downloading the file to view it locally.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full w-full flex flex-col">
            <div className="text-sm text-muted-foreground mb-2">
                Text Viewer
            </div>

            <ScrollArea className="flex-1 border rounded-md p-4 font-mono text-sm whitespace-pre-wrap">
                {content}
            </ScrollArea>
        </div>
    );
};

export default TextViewer;