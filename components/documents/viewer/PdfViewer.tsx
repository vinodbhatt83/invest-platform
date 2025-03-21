// components/documents/viewer/PDFViewer.tsx
import React, { useState } from 'react';
import { FilePdfIcon } from 'lucide-react';

interface PDFViewerProps {
  fileUrl: string;
}

const PDFViewer: React.FC<PDFViewerProps> = ({ fileUrl }) => {
  const [isLoading, setIsLoading] = useState(true);
  
  // In a real implementation, you would use a PDF viewing library like pdf.js
  // This is a placeholder that embeds the PDF if possible
  return (
    <div className="h-full w-full flex flex-col">
      <div className="text-sm text-muted-foreground mb-2">
        PDF Viewer
      </div>
      
      <div className="flex-1 relative border rounded-md overflow-hidden">
        {/* This is a simple embed that works for accessible PDFs, but a real implementation would use PDF.js */}
        <iframe 
          src={`${fileUrl}#toolbar=0&navpanes=0`}
          className="w-full h-full"
          onLoad={() => setIsLoading(false)}
          title="PDF Viewer"
        />
        
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80">
            <div className="flex flex-col items-center">
              <FilePdfIcon className="h-10 w-10 animate-pulse" />
              <p className="mt-2">Loading PDF...</p>
            </div>
          </div>
        )}
      </div>
      
      <div className="text-sm text-muted-foreground mt-2">
        Note: For better PDF viewing experience, please download the file.
      </div>
    </div>
  );
};

export default PDFViewer;