import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { useNotification } from '../../ui/Notification';
import { CreateVersionDialog } from '../version-control';

interface DocumentUploadProps {
  onUploadComplete: (documentIds: string[]) => void;
  endpoint: string;
  allowedFileTypes?: string[];
  maxFileSize?: number;
  maxFiles?: number;
  existingDocumentId?: string;
}

const DocumentUpload: React.FC<DocumentUploadProps> = ({
  onUploadComplete,
  endpoint,
  allowedFileTypes = [],
  maxFileSize = 10 * 1024 * 1024, // 10MB default
  maxFiles = 5,
  existingDocumentId
}) => {
  const [files, setFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [isCreateVersionDialogOpen, setIsCreateVersionDialogOpen] = useState(false);
  const [currentVersion, setCurrentVersion] = useState<string>('');
  
  const { showNotification } = useNotification();
  const router = useRouter();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    
    // Validate file types if specified
    if (allowedFileTypes.length > 0) {
      const invalidFiles = selectedFiles.filter(file => {
        const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
        return !allowedFileTypes.includes(fileExtension);
      });
      
      if (invalidFiles.length > 0) {
        setErrors([`Invalid file type(s): ${invalidFiles.map(f => f.name).join(', ')}`]);
        return;
      }
    }
    
    // Validate file sizes
    const oversizedFiles = selectedFiles.filter(file => file.size > maxFileSize);
    if (oversizedFiles.length > 0) {
      setErrors([`File(s) exceed maximum size of ${maxFileSize / (1024 * 1024)}MB: ${oversizedFiles.map(f => f.name).join(', ')}`]);
      return;
    }
    
    // Validate number of files
    if (selectedFiles.length > maxFiles) {
      setErrors([`Maximum ${maxFiles} files allowed`]);
      return;
    }
    
    setFiles(selectedFiles);
    setErrors([]);
    setUploadProgress(new Array(selectedFiles.length).fill(0));
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      setErrors(['Please select files to upload']);
      return;
    }
    
    setIsUploading(true);
    setErrors([]);
    
    try {
      const uploadedDocumentIds: string[] = [];
      
      // If this is an existing document, check if we should create a new version
      if (existingDocumentId) {
        // Fetch current document details to get version info
        const docResponse = await fetch(`/api/documents/${existingDocumentId}`);
        if (docResponse.ok) {
          const docData = await docResponse.json();
          setCurrentVersion(docData.version || 'v1.0');
          setIsCreateVersionDialogOpen(true);
          return; // Stop here and wait for version dialog
        }
      }
      
      // Continue with normal upload for new documents
      await uploadFiles(uploadedDocumentIds);
      
    } catch (error) {
      console.error('Upload error:', error);
      setErrors(['Failed to upload files. Please try again.']);
      showNotification({
        type: 'error',
        title: 'Upload Failed',
        message: 'There was an error uploading your files',
      });
    } finally {
      setIsUploading(false);
    }
  };
  
  const uploadFiles = async (uploadedDocumentIds: string[] = []) => {
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const formData = new FormData();
      formData.append('file', file);
      
      // Add version information if this is a new version of an existing document
      if (existingDocumentId) {
        formData.append('documentId', existingDocumentId);
        formData.append('isNewVersion', 'true');
      }
      
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          body: formData,
        });
        
        if (!response.ok) {
          throw new Error(`Failed to upload ${file.name}`);
        }
        
        const data = await response.json();
        uploadedDocumentIds.push(data.documentId);
        
        // Update progress
        const newProgress = [...uploadProgress];
        newProgress[i] = 100;
        setUploadProgress(newProgress);
        
      } catch (error) {
        console.error(`Error uploading ${file.name}:`, error);
        setErrors(prev => [...prev, `Failed to upload ${file.name}`]);
      }
    }
    
    if (uploadedDocumentIds.length > 0) {
      onUploadComplete(uploadedDocumentIds);
      showNotification({
        type: 'success',
        title: 'Upload Complete',
        message: `Successfully uploaded ${uploadedDocumentIds.length} file(s)`,
      });
    }
  };
  
  const handleVersionCreated = async (newVersion: string) => {
    setIsCreateVersionDialogOpen(false);
    
    if (!existingDocumentId) return;
    
    try {
      const uploadedDocumentIds: string[] = [];
      await uploadFiles(uploadedDocumentIds);
      
      // After upload, update the version
      if (uploadedDocumentIds.length > 0) {
        const versionResponse = await fetch(`/api/documents/${existingDocumentId}/versions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            version: newVersion,
            notes: `Updated to version ${newVersion}`,
          }),
        });
        
        if (!versionResponse.ok) {
          throw new Error('Failed to create new version');
        }
        
        showNotification({
          type: 'success',
          title: 'Version Created',
          message: `Successfully created version ${newVersion}`,
        });
      }
    } catch (error) {
      console.error('Version creation error:', error);
      setErrors(['Failed to create new version. Please try again.']);
      showNotification({
        type: 'error',
        title: 'Version Creation Failed',
        message: 'There was an error creating the new version',
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
        <input
          type="file"
          id="file-upload"
          multiple
          onChange={handleFileChange}
          className="hidden"
          disabled={isUploading}
        />
        <label
          htmlFor="file-upload"
          className="cursor-pointer block"
        >
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
          <p className="mt-2 text-sm text-gray-600">
            <span className="font-medium text-blue-600 hover:text-blue-500">
              Click to upload
            </span>{' '}
            or drag and drop
          </p>
          <p className="mt-1 text-xs text-gray-500">
            {allowedFileTypes.length > 0
              ? `${allowedFileTypes.join(', ')} up to ${maxFileSize / (1024 * 1024)}MB`
              : `Up to ${maxFileSize / (1024 * 1024)}MB`}
          </p>
        </label>
      </div>

      {files.length > 0 && (
        <div className="mt-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Selected Files</h4>
          <ul className="space-y-2">
            {files.map((file, index) => (
              <li key={index} className="text-sm">
                <div className="flex items-center justify-between">
                  <span className="truncate">{file.name}</span>
                  <span className="text-xs text-gray-500">
                    {(file.size / 1024).toFixed(1)} KB
                  </span>
                </div>
                {isUploading && (
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${uploadProgress[index]}%` }}
                    ></div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {errors.length > 0 && (
        <div className="mt-2">
          <ul className="text-sm text-red-600 space-y-1">
            {errors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-4">
        <button
          type="button"
          onClick={handleUpload}
          disabled={isUploading || files.length === 0}
          className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
            (isUploading || files.length === 0) && 'opacity-50 cursor-not-allowed'
          }`}
        >
          {isUploading ? (
            <>
              <svg
                className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Uploading...
            </>
          ) : (
            'Upload Files'
          )}
        </button>
      </div>
      
      {/* Version Dialog for existing documents */}
      {existingDocumentId && (
        <CreateVersionDialog
          documentId={existingDocumentId}
          currentVersion={currentVersion}
          isOpen={isCreateVersionDialogOpen}
          onClose={() => setIsCreateVersionDialogOpen(false)}
          onVersionCreated={handleVersionCreated}
        />
      )}
    </div>
  );
};

export default DocumentUpload;
