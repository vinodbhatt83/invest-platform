import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardContent, CardTitle } from '../../ui/Card';
import Button from '../../ui/Button';
import { useNotification } from '../../ui/Notification';

interface DocumentViewerProps {
  documentId: string;
  documentUrl?: string;
  documentType?: string;
  isLoading?: boolean;
}

interface DocumentDetails {
  id: string;
  name: string;
  description?: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  owner: string;
  version: string;
  tags?: string[];
  versions?: {
    version: string;
    date: string;
    isCurrent: boolean;
  }[];
  activity?: {
    user: string;
    action: string;
    date: string;
    userInitials: string;
  }[];
  sharedWith?: {
    name: string;
    initials: string;
    permission: string;
  }[];
}

const DocumentViewer: React.FC<DocumentViewerProps> = ({ documentId }) => {
  const [document, setDocument] = useState<DocumentDetails | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { showNotification } = useNotification();

  useEffect(() => {
    const fetchDocument = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/documents/${documentId}`);
        if (!response.ok) throw new Error('Failed to fetch document');
        
        const data = await response.json();
        
        // Enhance with mock data for UI elements shown in screenshot
        const enhancedData = {
          ...data,
          owner: data.owner || 'Sarah Johnson',
          version: data.version || 'v1.3',
          tags: data.tags || ['#Financials', '#Q1', '#Nashville', '#Marriott'],
          versions: data.versions || [
            { version: 'v1.3', date: 'Mar 15, 2025', isCurrent: true },
            { version: 'v1.2', date: 'Mar 13, 2025', isCurrent: false },
            { version: 'v1.1', date: 'Mar 12, 2025', isCurrent: false },
            { version: 'v1.0', date: 'Mar 10, 2025', isCurrent: false }
          ],
          activity: data.activity || [
            { user: 'Sarah Johnson', action: 'updated this file', date: '2 days ago', userInitials: 'SJ' },
            { user: 'Michael Chen', action: 'commented', date: '3 days ago', userInitials: 'MC' },
            { user: 'John Smith', action: 'viewed this file', date: '4 days ago', userInitials: 'JS' }
          ],
          sharedWith: data.sharedWith || [
            { name: 'Acquisition Team', initials: 'AT', permission: 'Edit' },
            { name: 'Investment Committee', initials: 'IC', permission: 'View' },
            { name: 'Lender - ABC Bank', initials: 'AB', permission: 'View' }
          ]
        };
        
        setDocument(enhancedData);
      } catch (error) {
        console.error('Error fetching document:', error);
        setError('Failed to load document details');
        showNotification({
          type: 'error',
          title: 'Error',
          message: 'Failed to load document details',
        });
      } finally {
        setIsLoading(false);
      }
    };

    if (documentId) {
      fetchDocument();
    }
  }, [documentId, showNotification]);

  // Format file size for display
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
  };

  // Get file icon based on file type
  const getFileIcon = (fileType: string): JSX.Element => {
    switch (fileType.toLowerCase()) {
      case 'pdf':
        return (
          <svg className="w-12 h-12 text-red-500" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
          </svg>
        );
      case 'xlsx':
      case 'xls':
      case 'csv':
        return (
          <svg className="w-12 h-12 text-green-500" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
          </svg>
        );
      case 'docx':
      case 'doc':
        return (
          <svg className="w-12 h-12 text-blue-500" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
          </svg>
        );
      case 'dwg':
        return (
          <svg className="w-12 h-12 text-purple-500" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
          </svg>
        );
      default:
        return (
          <svg className="w-12 h-12 text-gray-500" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
          </svg>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !document) {
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
        <p className="text-sm text-gray-500 mt-1">{error || 'Document not found'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Document Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row md:space-x-6">
            <div className="flex-shrink-0 flex flex-col items-center mb-6 md:mb-0">
              <div className="w-32 h-32 bg-blue-50 rounded-lg flex items-center justify-center mb-3">
                {getFileIcon(document.fileType)}
              </div>
              <h3 className="text-lg font-semibold text-center">{document.name}</h3>
              <p className="text-sm text-gray-500 text-center">{document.fileType.toUpperCase()}</p>
            </div>
            
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Information</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Size</span>
                    <span className="text-sm">{formatFileSize(document.fileSize)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Created</span>
                    <span className="text-sm">{new Date(document.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Modified</span>
                    <span className="text-sm">{new Date(document.updatedAt).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Owner</span>
                    <span className="text-sm">{document.owner}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Status</span>
                    <span className="text-sm capitalize">{document.status}</span>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Versions</h4>
                <div className="space-y-2">
                  {document.versions?.map((version) => (
                    <div key={version.version} className="flex items-center">
                      <div className={`w-3 h-3 rounded-full mr-2 ${version.isCurrent ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                      <div className="flex-1">
                        <div className="flex justify-between">
                          <span className="text-sm font-medium">{version.version}</span>
                          <span className="text-xs text-gray-500">{version.date}</span>
                        </div>
                      </div>
                      <button className={`text-blue-600 text-sm font-medium ${version.isCurrent ? '' : 'hover:underline'}`}>
                        {version.isCurrent ? 'Current' : 'Restore'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Recent Activity</h4>
                <div className="space-y-3">
                  {document.activity?.map((activity, index) => (
                    <div key={index} className="flex items-start">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs mr-2">
                        {activity.userInitials}
                      </div>
                      <div>
                        <p className="text-sm"><span className="font-medium">{activity.user}</span> {activity.action}</p>
                        <p className="text-xs text-gray-500">{activity.date}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Shared With</h4>
                <div className="space-y-2">
                  {document.sharedWith?.map((shared, index) => (
                    <div key={index} className="flex justify-between items-center">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center text-white text-xs mr-2">
                          {shared.initials}
                        </div>
                        <span className="text-sm">{shared.name}</span>
                      </div>
                      <span className={`text-xs ${shared.permission === 'Edit' ? 'bg-blue-100 text-blue-800 px-2 py-1 rounded' : 'text-gray-500'}`}>
                        {shared.permission}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-6">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Tags</h4>
            <div className="flex flex-wrap gap-2">
              {document.tags?.map((tag, index) => (
                <span key={index} className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700">
                  {tag}
                </span>
              ))}
            </div>
          </div>
          
          <div className="mt-6 flex space-x-3">
            <Button>Download</Button>
            <Button variant="secondary">Preview</Button>
            <Button variant="secondary">Share</Button>
          </div>
        </CardContent>
      </Card>
      
      {/* Document preview would go here */}
      <Card>
        <CardHeader>
          <CardTitle>Document Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
            {document.fileType.toLowerCase() === 'pdf' ? (
              <iframe 
                src={document.fileUrl} 
                className="w-full h-full rounded-lg"
                title={document.name}
              />
            ) : document.fileType.toLowerCase().match(/^(jpg|jpeg|png|gif)$/) ? (
              <img 
                src={document.fileUrl} 
                alt={document.name} 
                className="max-w-full max-h-full object-contain"
              />
            ) : document.fileType.toLowerCase().match(/^(xlsx|xls|csv)$/) ? (
              <div className="text-center p-8">
                <div className="mb-4">{getFileIcon(document.fileType)}</div>
                <p className="text-gray-700">Spreadsheet preview is available in the document details panel</p>
                <button className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
                  Open Spreadsheet
                </button>
              </div>
            ) : (
              <div className="text-center p-8">
                <div className="mb-4">{getFileIcon(document.fileType)}</div>
                <p className="text-gray-700">Preview not available for this file type</p>
                <button className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
                  Download File
                </button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DocumentViewer;
