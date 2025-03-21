import React, { useState, useRef, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useRouter } from 'next/router';
import { useNotification } from '../../ui/Notification';
import Button from '../../ui/Button';
import { Card, CardHeader, CardContent, CardTitle } from '../../ui/Card';
import FileValidator from './FileValidator';
import UploadProgress from './UploadProgress';

interface FileWithStatus {
  id: string;
  file: File;
  status: 'pending' | 'uploading' | 'success' | 'error';
  progress: number;
  error?: string;
}

interface UploadResponse {
  document: {
    id: string;
    name: string;
    fileUrl: string;
  };
}

interface DocumentUploadProps {
  onUploadComplete: (documentIds: string[]) => void;
  endpoint: string;
  allowedFileTypes: string[];
  maxFileSize: number;
  maxFiles: number;
}

const DocumentUpload: React.FC<DocumentUploadProps> = ({ onUploadComplete, endpoint, allowedFileTypes, maxFileSize, maxFiles }) => {
  const [files, setFiles] = useState<FileWithStatus[]>([]);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [selectedProperty, setSelectedProperty] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [tags, setTags] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  
  const uploadPromises = useRef<Record<string, { abort: () => void }>>({});
  const router = useRouter();
  const { showNotification } = useNotification();

  // Properties and categories for dropdown selection
  const properties = [
    { id: 'prop1', name: 'Nashville Marriott' },
    { id: 'prop2', name: 'Atlanta Hilton' },
    { id: 'prop3', name: 'Chicago Hyatt' }
  ];

  const categories = [
    { id: 'cat1', name: 'Property Information' },
    { id: 'cat2', name: 'Market Analysis' },
    { id: 'cat3', name: 'Legal Documents' },
    { id: 'cat4', name: 'Media' },
    { id: 'cat5', name: 'Financials' }
  ];

  // Handle file drop
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles = acceptedFiles.map((file) => ({
      id: Math.random().toString(36).substring(2, 11),
      file,
      status: 'pending' as const,
      progress: 0,
    }));
    
    setFiles((prevFiles) => [...prevFiles, ...newFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'application/vnd.dwg': ['.dwg'],
      'text/csv': ['.csv']
    },
    maxSize: 50 * 1024 * 1024, // 50MB
  });

  // Remove file from list
  const removeFile = (id: string) => {
    setFiles((prevFiles) => prevFiles.filter((file) => file.id !== id));
  };

  // Cancel ongoing upload
  const cancelUpload = (id: string) => {
    if (uploadPromises.current[id]) {
      uploadPromises.current[id].abort();
      delete uploadPromises.current[id];
    }
    
    setFiles((prevFiles) =>
      prevFiles.map((file) =>
        file.id === id ? { ...file, status: 'error', error: 'Upload cancelled' } : file
      )
    );
  };

  // Upload a single file
  const uploadFile = async (fileWithStatus: FileWithStatus): Promise<string | null> => {
    const { id, file } = fileWithStatus;
    
    // Update file status to uploading
    setFiles((prevFiles) =>
      prevFiles.map((f) => (f.id === id ? { ...f, status: 'uploading', progress: 0 } : f))
    );
    
    // Create form data
    const formData = new FormData();
    formData.append('file', file);
    formData.append('name', file.name);
    formData.append('description', description);
    
    if (selectedProperty) {
      formData.append('property', selectedProperty);
    }
    
    if (selectedCategory) {
      formData.append('category', selectedCategory);
    }
    
    if (tags) {
      formData.append('tags', tags);
    }
    
    // Create abort controller for cancellation
    const controller = new AbortController();
    uploadPromises.current[id] = { abort: () => controller.abort() };
    
    try {
      // Upload file to server
      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });
      
      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }
      
      const data: UploadResponse = await response.json();
      
      // Update file status to success
      setFiles((prevFiles) =>
        prevFiles.map((f) => (f.id === id ? { ...f, status: 'success', progress: 100 } : f))
      );
      
      return data.document.id;
    } catch (error) {
      // Handle errors, including cancellation
      if ((error as Error).name === 'AbortError') {
        console.log('Upload cancelled');
      } else {
        console.error('Upload error:', error);
        
        // Update file status to error
        setFiles((prevFiles) =>
          prevFiles.map((f) =>
            f.id === id
              ? { ...f, status: 'error', error: (error as Error).message || 'Upload failed' }
              : f
          )
        );
      }
      
      return null;
    } finally {
      // Clean up
      delete uploadPromises.current[id];
    }
  };

  // Upload all pending files
  const uploadFiles = async () => {
    const pendingFiles = files.filter((file) => file.status === 'pending');
    
    if (pendingFiles.length === 0) return;
    
    setIsUploading(true);
    
    try {
      // Validate required fields
      if (!selectedCategory) {
        throw new Error('Please select a category');
      }
      
      // Upload files one by one
      const documentIds = await Promise.all(
        pendingFiles.map((file) => uploadFile(file))
      );
      
      // Filter out failed uploads
      const successfulUploads = documentIds.filter((id): id is string => id !== null);
      
      if (successfulUploads.length > 0) {
        showNotification({
          type: 'success',
          title: 'Upload Complete',
          message: `Successfully uploaded ${successfulUploads.length} document(s)`,
        });
        
        // Navigate to documents page after successful upload
        if (successfulUploads.length === pendingFiles.length) {
          setTimeout(() => {
            router.push('/documents');
          }, 1500);
        }
      }
    } catch (error) {
      showNotification({
        type: 'error',
        title: 'Upload Error',
        message: (error as Error).message || 'Failed to upload documents',
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Format file size for display
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
  };

  return (
    <div className="max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Upload Documents</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Document metadata */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="property" className="block text-sm font-medium text-gray-700 mb-1">
                  Property
                </label>
                <select
                  id="property"
                  value={selectedProperty}
                  onChange={(e) => setSelectedProperty(e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                >
                  <option value="">Select a property</option>
                  {properties.map((property) => (
                    <option key={property.id} value={property.id}>
                      {property.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                  Category *
                </label>
                <select
                  id="category"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  required
                >
                  <option value="">Select a category</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="md:col-span-2">
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  placeholder="Add a description for these documents"
                />
              </div>
              
              <div className="md:col-span-2">
                <label htmlFor="tags" className="block text-sm font-medium text-gray-700 mb-1">
                  Tags
                </label>
                <input
                  id="tags"
                  type="text"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  placeholder="Add tags separated by commas (e.g., #Financials, #Q1, #Nashville)"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Tags help organize and find documents later. Use # prefix for better visibility.
                </p>
              </div>
            </div>
            
            {/* File dropzone */}
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400'
              }`}
            >
              <input {...getInputProps()} />
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <p className="mt-2 text-sm font-medium text-gray-900">
                {isDragActive ? 'Drop files here' : 'Drag and drop files here'}
              </p>
              <p className="mt-1 text-xs text-gray-500">
                or <span className="text-blue-600">browse</span> to select files
              </p>
              <p className="mt-1 text-xs text-gray-500">
                Supported formats: PDF, Excel, Word, Images, DWG, CSV (Max 50MB)
              </p>
            </div>
            
            {/* File list */}
            {files.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Selected Files</h3>
                <ul className="divide-y divide-gray-200 border border-gray-200 rounded-md overflow-hidden">
                  {files.map((fileWithStatus) => (
                    <li key={fileWithStatus.id} className="px-4 py-3 bg-white">
                      <FileValidator file={fileWithStatus.file}>
                        {({ isValid, errors }) => (
                          <div>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center">
                                <div className="flex-shrink-0 mr-3">
                                  <svg
                                    className="h-6 w-6 text-gray-400"
                                    fill="currentColor"
                                    viewBox="0 0 20 20"
                                    xmlns="http://www.w3.org/2000/svg"
                                  >
                                    <path
                                      fillRule="evenodd"
                                      d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"
                                      clipRule="evenodd"
                                    />
                                  </svg>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-gray-900 truncate">
                                    {fileWithStatus.file.name}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {formatFileSize(fileWithStatus.file.size)}
                                  </p>
                                </div>
                              </div>
                              <div className="flex-shrink-0 ml-4">
                                {fileWithStatus.status === 'pending' && (
                                  <button
                                    type="button"
                                    className="text-gray-400 hover:text-gray-500"
                                    onClick={() => removeFile(fileWithStatus.id)}
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
                                {fileWithStatus.status === 'uploading' && (
                                  <button
                                    type="button"
                                    className="text-gray-400 hover:text-gray-500"
                                    onClick={() => cancelUpload(fileWithStatus.id)}
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
                            {fileWithStatus.status !== 'pending' && (
                              <div className="mt-2">
                                <UploadProgress
                                  status={fileWithStatus.status}
                                  progress={fileWithStatus.progress}
                                  error={fileWithStatus.error}
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
            )}
            
            {/* Action buttons */}
            <div className="flex justify-end space-x-3">
              <Button
                variant="secondary"
                onClick={() => setFiles([])}
                disabled={isUploading || files.length === 0}
              >
                Clear All
              </Button>
              <Button
                onClick={uploadFiles}
                isLoading={isUploading}
                disabled={
                  isUploading ||
                  files.length === 0 ||
                  !files.some((file) => file.status === 'pending') ||
                  !selectedCategory
                }
              >
                Upload {files.filter((file) => file.status === 'pending').length} Files
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DocumentUpload;
