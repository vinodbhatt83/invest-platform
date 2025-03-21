// components/documents/viewer/DocumentViewer.tsx
import React, { useState, useEffect } from 'react';
import { 
  FileIcon, 
  FileTextIcon, 
  FilePdfIcon, 
  FileSpreadsheetIcon, 
  FileImageIcon,
  AlertCircle
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';

// Import viewer components
import PDFViewer from './PDFViewer';
import ImageViewer from './ImageViewer';
import TextViewer from './TextViewer';
import SpreadsheetViewer from './SpreadsheetViewer';

interface DocumentViewerProps {
  documentId: string;
  fileUrl: string;
  fileName: string;
  fileType: string;
}

const DocumentViewer: React.FC<DocumentViewerProps> = ({
  documentId,
  fileUrl,
  fileName,
  fileType,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    // Simulate loading the document
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [fileUrl]);
  
  // Helper function to get file icon
  const getFileIcon = () => {
    if (fileType.includes('pdf')) {
      return <FilePdfIcon className="h-12 w-12" />;
    } else if (fileType.includes('spreadsheet') || fileType.includes('excel') || fileType.includes('csv')) {
      return <FileSpreadsheetIcon className="h-12 w-12" />;
    } else if (fileType.includes('image')) {
      return <FileImageIcon className="h-12 w-12" />;
    } else if (fileType.includes('text') || fileType.includes('document')) {
      return <FileTextIcon className="h-12 w-12" />;
    } else {
      return <FileIcon className="h-12 w-12" />;
    }
  };
  
  // Render the appropriate viewer based on file type
  const renderViewer = () => {
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center h-full">
          <Skeleton className="h-12 w-12 rounded-md mb-4" />
          <Skeleton className="h-5 w-40" />
        </div>
      );
    }
    
    if (error) {
      return (
        <Alert variant="destructive" className="my-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      );
    }
    
    // PDF Viewer
    if (fileType.includes('pdf')) {
      try {
        return <PDFViewer fileUrl={fileUrl} />;
      } catch (err) {
        return <div className="text-center p-4">Unable to preview this PDF file.</div>;
      }
    }
    
    // Image Viewer
    if (fileType.includes('image')) {
      return <ImageViewer fileUrl={fileUrl} fileName={fileName} />;
    }
    
    // Text Viewer
    if (fileType.includes('text') || 
        fileType.includes('json') || 
        fileType.includes('xml') || 
        fileType.includes('html') || 
        fileType.includes('css') || 
        fileType.includes('javascript')) {
      return <TextViewer fileUrl={fileUrl} />;
    }
    
    // Spreadsheet Viewer
    if (fileType.includes('spreadsheet') || 
        fileType.includes('excel') || 
        fileType.includes('csv')) {
      return <SpreadsheetViewer fileUrl={fileUrl} />;
    }
    
    // Generic file (no preview available)
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        {getFileIcon()}
        <h3 className="text-lg font-medium mt-4">{fileName}</h3>
        <p className="text-muted-foreground mt-2">
          Preview not available for this file type. Please download the file to view it.
        </p>
      </div>
    );
  };
  
  return (
    <Card className="h-full">
      <CardContent className="p-6 h-full">
        {renderViewer()}
      </CardContent>
    </Card>
  );
};

export default DocumentViewer;