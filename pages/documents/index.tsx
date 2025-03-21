import React, { useState, useEffect } from 'react';
import { GetServerSideProps } from 'next';
import { getSession } from 'next-auth/react';
import Layout from '../../components/layout/Layout';
import { Card, CardHeader, CardContent, CardTitle } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Table from '../../components/ui/Table';
import { useNotification } from '../../components/ui/Notification';
import Link from 'next/link';
import { useRouter } from 'next/router';
import Modal from '../../components/ui/Modal';

interface Document {
    id: string;
    name: string;
    description?: string;
    fileUrl: string;
    fileType: string;
    fileSize: number;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    createdAt: string;
    updatedAt: string;
    tags?: string[];
    owner?: string;
    version?: string;
    extractedData?: {
        id: string;
        status: string;
        confidence: number;
    };
    mappings?: {
        id: string;
        targetSystemId: string;
        updatedAt: string;
    }[];
}

interface DocumentFolder {
    name: string;
    count: number;
    path: string;
}

interface PaginationInfo {
    page: number;
    limit: number;
    totalDocuments: number;
    totalPages: number;
}

interface DocumentsPageProps {
    initialDocuments: Document[];
    initialPagination: PaginationInfo;
}

export default function DocumentsPage({ initialDocuments, initialPagination }: DocumentsPageProps) {
    const [documents, setDocuments] = useState<Document[]>(initialDocuments);
    const [pagination, setPagination] = useState<PaginationInfo>(initialPagination);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [search, setSearch] = useState<string>('');
    const [status, setStatus] = useState<string>('');
    const [sort, setSort] = useState<string>('createdAt');
    const [order, setOrder] = useState<'asc' | 'desc'>('desc');
    const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
    const [selectedProperty, setSelectedProperty] = useState<string>('All Properties');
    const [selectedCategory, setSelectedCategory] = useState<string>('All Categories');
    const [selectedDateSort, setSelectedDateSort] = useState<string>('Newest First');
    const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
    const [showDocumentDetails, setShowDocumentDetails] = useState<boolean>(false);
    
    const router = useRouter();
    const { showNotification } = useNotification();

    // Mock folders for the UI based on the screenshot
    const folders: DocumentFolder[] = [
        { name: 'Property Information', count: 12, path: '/financials' },
        { name: 'Market Analysis', count: 5, path: '/market-analysis' },
        { name: 'Legal Documents', count: 8, path: '/legal' },
        { name: 'Media', count: 24, path: '/media' }
    ];

    // Mock breadcrumb data
    const breadcrumbs = [
        { name: 'All Documents', path: '/documents' },
        { name: 'Curated by Marriott', path: '/documents?curator=Marriott' },
        { name: 'Financials', path: '/documents?category=Financials' }
    ];

    // Fetch documents with current filters
    const fetchDocuments = async (page: number = pagination.page) => {
        setIsLoading(true);
        try {
            const params = new URLSearchParams({
                page: page.toString(),
                limit: pagination.limit.toString(),
                sort,
                order,
            });
            
            if (search) params.append('search', search);
            if (status) params.append('status', status);
            if (selectedProperty !== 'All Properties') params.append('property', selectedProperty);
            if (selectedCategory !== 'All Categories') params.append('category', selectedCategory);
            
            const response = await fetch(`/api/documents?${params.toString()}`);
            if (!response.ok) throw new Error('Failed to fetch documents');
            
            const data = await response.json();
            setDocuments(data.documents);
            setPagination(data.pagination);
        } catch (error) {
            showNotification({
                type: 'error',
                title: 'Error',
                message: 'Failed to load documents',
            });
            console.error('Error fetching documents:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // Re-fetch when filters change
    useEffect(() => {
        fetchDocuments(1); // Reset to first page when filters change
    }, [search, status, sort, order, selectedProperty, selectedCategory, selectedDateSort]);

    // Handle document deletion
    const handleDeleteDocument = async (id: string) => {
        if (!confirm('Are you sure you want to delete this document?')) return;
        
        try {
            const response = await fetch(`/api/documents/${id}`, {
                method: 'DELETE',
            });
            
            if (!response.ok) throw new Error('Failed to delete document');
            
            showNotification({
                type: 'success',
                title: 'Success',
                message: 'Document deleted successfully',
            });
            
            // Refresh the document list
            fetchDocuments();
        } catch (error) {
            showNotification({
                type: 'error',
                title: 'Error',
                message: 'Failed to delete document',
            });
            console.error('Error deleting document:', error);
        }
    };

    // Handle document selection for details panel
    const handleDocumentSelect = (document: Document) => {
        setSelectedDocument(document);
        setShowDocumentDetails(true);
    };

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
                    <svg className="w-6 h-6 text-red-500" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                    </svg>
                );
            case 'xlsx':
            case 'xls':
            case 'csv':
                return (
                    <svg className="w-6 h-6 text-green-500" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                    </svg>
                );
            case 'docx':
            case 'doc':
                return (
                    <svg className="w-6 h-6 text-blue-500" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                    </svg>
                );
            case 'dwg':
                return (
                    <svg className="w-6 h-6 text-purple-500" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                    </svg>
                );
            default:
                return (
                    <svg className="w-6 h-6 text-gray-500" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                    </svg>
                );
        }
    };

    // Render document details panel
    const renderDocumentDetails = () => {
        if (!selectedDocument) return null;

        return (
            <div className="fixed inset-y-0 right-0 w-80 bg-white shadow-lg p-4 transform transition-transform duration-300 ease-in-out z-10" style={{ transform: showDocumentDetails ? 'translateX(0)' : 'translateX(100%)' }}>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-semibold">Document Details</h2>
                    <button 
                        onClick={() => setShowDocumentDetails(false)}
                        className="text-gray-500 hover:text-gray-700"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                
                <div className="flex justify-center mb-6">
                    <div className="w-24 h-24 bg-blue-50 rounded-lg flex items-center justify-center">
                        {getFileIcon(selectedDocument.fileType)}
                    </div>
                </div>
                
                <h3 className="text-lg font-semibold mb-1">{selectedDocument.name}</h3>
                <p className="text-sm text-gray-500 mb-4">Excel Spreadsheet (XLSX)</p>
                
                <div className="space-y-4">
                    <div>
                        <h4 className="text-sm font-medium text-gray-700">Information</h4>
                        <div className="mt-2 space-y-2">
                            <div className="flex justify-between">
                                <span className="text-sm text-gray-500">Size</span>
                                <span className="text-sm">{formatFileSize(selectedDocument.fileSize)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm text-gray-500">Created</span>
                                <span className="text-sm">{new Date(selectedDocument.createdAt).toLocaleDateString()}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm text-gray-500">Modified</span>
                                <span className="text-sm">{new Date(selectedDocument.updatedAt).toLocaleDateString()}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm text-gray-500">Owner</span>
                                <span className="text-sm">Sarah Johnson</span>
                            </div>
                        </div>
                    </div>
                    
                    <div>
                        <h4 className="text-sm font-medium text-gray-700">Versions</h4>
                        <div className="mt-2 space-y-2">
                            <div className="flex items-center">
                                <div className="w-4 h-4 bg-green-500 rounded-full mr-2"></div>
                                <div className="flex-1">
                                    <div className="flex justify-between">
                                        <span className="text-sm font-medium">v1.3</span>
                                        <span className="text-xs text-gray-500">Mar 15, 2025</span>
                                    </div>
                                </div>
                                <button className="text-blue-600 text-sm font-medium">Current</button>
                            </div>
                            <div className="flex items-center">
                                <div className="w-4 h-4 bg-gray-300 rounded-full mr-2"></div>
                                <div className="flex-1">
                                    <div className="flex justify-between">
                                        <span className="text-sm font-medium">v1.2</span>
                                        <span className="text-xs text-gray-500">Mar 13, 2025</span>
                                    </div>
                                </div>
                                <button className="text-blue-600 text-sm font-medium">Restore</button>
                            </div>
                            <div className="flex items-center">
                                <div className="w-4 h-4 bg-gray-300 rounded-full mr-2"></div>
                                <div className="flex-1">
                                    <div className="flex justify-between">
                                        <span className="text-sm font-medium">v1.1</span>
                                        <span className="text-xs text-gray-500">Mar 12, 2025</span>
                                    </div>
                                </div>
                                <button className="text-blue-600 text-sm font-medium">Restore</button>
                            </div>
                            <div className="flex items-center">
                                <div className="w-4 h-4 bg-gray-300 rounded-full mr-2"></div>
                                <div className="flex-1">
                                    <div className="flex justify-between">
                                        <span className="text-sm font-medium">v1.0</span>
                                        <span className="text-xs text-gray-500">Mar 10, 2025</span>
                                    </div>
                                </div>
                                <button className="text-blue-600 text-sm font-medium">Restore</button>
                            </div>
                        </div>
                    </div>
                    
                    <div>
                        <h4 className="text-sm font-medium text-gray-700">Recent Activity</h4>
                        <div className="mt-2 space-y-3">
                            <div className="flex items-start">
                                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs mr-2">
                                    SJ
                                </div>
                                <div>
                                    <p className="text-sm"><span className="font-medium">Sarah Johnson</span> updated this file</p>
                                    <p className="text-xs text-gray-500">2 days ago</p>
                                </div>
                            </div>
                            <div className="flex items-start">
                                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-500 flex items-center justify-center text-white text-xs mr-2">
                                    MC
                                </div>
                                <div>
                                    <p className="text-sm"><span className="font-medium">Michael Chen</span> commented</p>
                                    <p className="text-xs text-gray-500">3 days ago</p>
                                </div>
                            </div>
                            <div className="flex items-start">
                                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center text-white text-xs mr-2">
                                    JS
                                </div>
                                <div>
                                    <p className="text-sm"><span className="font-medium">John Smith</span> viewed this file</p>
                                    <p className="text-xs text-gray-500">4 days ago</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div>
                        <h4 className="text-sm font-medium text-gray-700">Shared With</h4>
                        <div className="mt-2 space-y-2">
                            <div className="flex justify-between items-center">
                                <div className="flex items-center">
                                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center text-white text-xs mr-2">
                                        AT
                                    </div>
                                    <span className="text-sm">Acquisition Team</span>
                                </div>
                                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Edit</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <div className="flex items-center">
                                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs mr-2">
                                        IC
                                    </div>
                                    <span className="text-sm">Investment Committee</span>
                                </div>
                                <span className="text-xs text-gray-500">View</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <div className="flex items-center">
                                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-500 flex items-center justify-center text-white text-xs mr-2">
                                        AB
                                    </div>
                                    <span className="text-sm">Lender - ABC Bank</span>
                                </div>
                                <span className="text-xs text-gray-500">View</span>
                            </div>
                        </div>
                    </div>
                    
                    <div>
                        <h4 className="text-sm font-medium text-gray-700">Tags</h4>
                        <div className="mt-2 flex flex-wrap gap-2">
                            <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700">
                                #Financials
                            </span>
                            <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700">
                                #Q1
                            </span>
                            <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700">
                                #Nashville
                            </span>
                            <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700">
                                #Marriott
                            </span>
                        </div>
                    </div>
                </div>
                
                <div className="mt-6 flex space-x-2">
                    <button className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors">
                        Download
                    </button>
                    <button className="flex-1 border border-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-50 transition-colors">
                        Preview
                    </button>
                </div>
            </div>
        );
    };

    // Render grid view of documents
    const renderGridView = () => {
        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-4">
                {folders.map((folder) => (
                    <div key={folder.name} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex justify-center mb-4">
                            <div className="w-16 h-16 bg-blue-50 rounded-lg flex items-center justify-center">
                                <svg className="w-8 h-8 text-blue-500" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z"></path>
                                </svg>
                            </div>
                        </div>
                        <h3 className="text-center font-medium">{folder.name}</h3>
                        <p className="text-center text-sm text-gray-500">{folder.count} files</p>
                    </div>
                ))}
                
                {documents.map((doc) => (
                    <div 
                        key={doc.id} 
                        className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                        onClick={() => handleDocumentSelect(doc)}
                    >
                        <div className="flex justify-center mb-4">
                            <div className="w-16 h-16 bg-blue-50 rounded-lg flex items-center justify-center">
                                {getFileIcon(doc.fileType)}
                            </div>
                        </div>
                        <h3 className="text-center font-medium truncate">{doc.name}</h3>
                        <p className="text-center text-sm text-gray-500">{formatFileSize(doc.fileSize)}</p>
                    </div>
                ))}
            </div>
        );
    };

    // Render list view of documents
    const renderListView = () => {
        return (
            <div className="mt-4">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Name
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Type
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Size
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Modified
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Owner
                                </th>
                                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {documents.map((doc) => (
                                <tr 
                                    key={doc.id}
                                    className="hover:bg-gray-50 cursor-pointer"
                                    onClick={() => handleDocumentSelect(doc)}
                                >
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center">
                                                {getFileIcon(doc.fileType)}
                                            </div>
                                            <div className="ml-4">
                                                <div className="text-sm font-medium text-gray-900">{doc.name}</div>
                                                <div className="text-sm text-gray-500">{doc.description || ''}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-900">{doc.fileType.toUpperCase()}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-900">{formatFileSize(doc.fileSize)}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-900">{new Date(doc.updatedAt).toLocaleDateString()}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <div className="flex-shrink-0 h-6 w-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs">
                                                {doc.id.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="ml-2 text-sm text-gray-900">
                                                {doc.id.length > 5 ? 'Sarah Johnson' : 'John Smith'}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                router.push(`/documents/${doc.id}`);
                                            }}
                                            className="text-blue-600 hover:text-blue-900 mr-3"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                            </svg>
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeleteDocument(doc.id);
                                            }}
                                            className="text-red-600 hover:text-red-900"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                
                {/* Pagination */}
                {pagination.totalPages > 0 && (
                    <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6 mt-4">
                        <div className="flex flex-1 justify-between sm:hidden">
                            <button
                                onClick={() => fetchDocuments(pagination.page - 1)}
                                disabled={pagination.page === 1}
                                className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Previous
                            </button>
                            <button
                                onClick={() => fetchDocuments(pagination.page + 1)}
                                disabled={pagination.page === pagination.totalPages}
                                className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Next
                            </button>
                        </div>
                        <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                            <div>
                                <p className="text-sm text-gray-700">
                                    Showing <span className="font-medium">{(pagination.page - 1) * pagination.limit + 1}</span> to{' '}
                                    <span className="font-medium">
                                        {Math.min(pagination.page * pagination.limit, pagination.totalDocuments)}
                                    </span>{' '}
                                    of <span className="font-medium">{pagination.totalDocuments}</span> results
                                </p>
                            </div>
                            <div>
                                <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                                    <button
                                        onClick={() => fetchDocuments(pagination.page - 1)}
                                        disabled={pagination.page === 1}
                                        className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <span className="sr-only">Previous</span>
                                        <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                            <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
                                        </svg>
                                    </button>
                                    {Array.from({ length: Math.min(5, pagination.totalPages) }).map((_, index) => {
                                        let pageNumber;
                                        if (pagination.totalPages <= 5) {
                                            pageNumber = index + 1;
                                        } else if (pagination.page <= 3) {
                                            pageNumber = index + 1;
                                        } else if (pagination.page >= pagination.totalPages - 2) {
                                            pageNumber = pagination.totalPages - 4 + index;
                                        } else {
                                            pageNumber = pagination.page - 2 + index;
                                        }
                                        return (
                                            <button
                                                key={pageNumber}
                                                onClick={() => fetchDocuments(pageNumber)}
                                                className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${pagination.page === pageNumber
                                                        ? 'z-10 bg-blue-600 text-white focus:z-20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600'
                                                        : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0'
                                                    }`}
                                            >
                                                {pageNumber}
                                            </button>
                                        );
                                    })}
                                    <button
                                        onClick={() => fetchDocuments(pagination.page + 1)}
                                        disabled={pagination.page === pagination.totalPages}
                                        className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <span className="sr-only">Next</span>
                                        <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                            <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                                        </svg>
                                    </button>
                                </nav>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    return (
        <Layout>
            <div className="container mx-auto px-4 py-6">
                <Card>
                    <CardHeader>
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                            <CardTitle>DOCUMENTS</CardTitle>
                            <div className="mt-2 md:mt-0">
                                <div className="relative rounded-md shadow-sm">
                                    <input
                                        type="text"
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        placeholder="Search..."
                                        className="block w-full rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
                                    />
                                    <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                                        <svg className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <p className="text-sm text-gray-500 mt-1">Central repository for all property information</p>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
                            <div>
                                <Link href="/documents/upload">
                                    <Button>Upload Document</Button>
                                </Link>
                            </div>
                            
                            <div className="mt-4 md:mt-0 flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                                <div className="relative">
                                    <select
                                        value={selectedProperty}
                                        onChange={(e) => setSelectedProperty(e.target.value)}
                                        className="block w-full rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
                                    >
                                        <option>All Properties</option>
                                        <option>Property A</option>
                                        <option>Property B</option>
                                        <option>Property C</option>
                                    </select>
                                </div>
                                
                                <div className="relative">
                                    <select
                                        value={selectedCategory}
                                        onChange={(e) => setSelectedCategory(e.target.value)}
                                        className="block w-full rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
                                    >
                                        <option>All Categories</option>
                                        <option>Financial</option>
                                        <option>Legal</option>
                                        <option>Marketing</option>
                                    </select>
                                </div>
                                
                                <div className="relative">
                                    <select
                                        value={selectedDateSort}
                                        onChange={(e) => {
                                            setSelectedDateSort(e.target.value);
                                            if (e.target.value === 'Newest First') {
                                                setSort('createdAt');
                                                setOrder('desc');
                                            } else {
                                                setSort('createdAt');
                                                setOrder('asc');
                                            }
                                        }}
                                        className="block w-full rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
                                    >
                                        <option>Newest First</option>
                                        <option>Oldest First</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                        
                        {/* Breadcrumb navigation */}
                        <div className="mb-4">
                            <nav className="flex" aria-label="Breadcrumb">
                                <ol className="inline-flex items-center space-x-1 md:space-x-3">
                                    {breadcrumbs.map((crumb, index) => (
                                        <li key={crumb.path} className="inline-flex items-center">
                                            {index > 0 && (
                                                <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                                                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd"></path>
                                                </svg>
                                            )}
                                            <Link href={crumb.path}>
                                                <span className={`ml-1 text-sm font-medium ${index === breadcrumbs.length - 1 ? 'text-gray-500' : 'text-blue-600 hover:text-blue-700'}`}>
                                                    {crumb.name}
                                                </span>
                                            </Link>
                                        </li>
                                    ))}
                                </ol>
                            </nav>
                        </div>
                        
                        {/* View toggle and search */}
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
                            <div className="flex space-x-2">
                                <button
                                    onClick={() => setViewMode('list')}
                                    className={`px-3 py-1 rounded-md ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}
                                >
                                    List
                                </button>
                                <button
                                    onClick={() => setViewMode('grid')}
                                    className={`px-3 py-1 rounded-md ${viewMode === 'grid' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}
                                >
                                    Grid
                                </button>
                            </div>
                            
                            <div className="mt-2 sm:mt-0">
                                <div className="relative rounded-md shadow-sm">
                                    <input
                                        type="text"
                                        placeholder="Search Documents..."
                                        className="block w-full rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
                                    />
                                    <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                                        <svg className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="mt-2 sm:mt-0 ml-0 sm:ml-2">
                                <button className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                                    <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                    </svg>
                                    New Folder
                                </button>
                            </div>
                        </div>
                        
                        {isLoading ? (
                            <div className="flex justify-center items-center h-64">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                            </div>
                        ) : (
                            <>
                                {viewMode === 'grid' ? renderGridView() : renderListView()}
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>
            
            {/* Document details panel */}
            {renderDocumentDetails()}
        </Layout>
    );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
    const session = await getSession(context);
    if (!session) {
        return {
            redirect: {
                destination: '/api/auth/signin',
                permanent: false,
            },
        };
    }
    
    try {
        // Fetch initial documents from API
        const response = await fetch(`${process.env.NEXTAUTH_URL}/api/documents?page=1&limit=10`, {
            headers: {
                Cookie: context.req.headers.cookie || '',
            },
        });
        
        if (!response.ok) throw new Error('Failed to fetch documents');
        
        const data = await response.json();
        
        return {
            props: {
                initialDocuments: data.documents,
                initialPagination: data.pagination,
            },
        };
    } catch (error) {
        console.error('Error fetching documents:', error);
        
        return {
            props: {
                initialDocuments: [],
                initialPagination: {
                    page: 1,
                    limit: 10,
                    totalDocuments: 0,
                    totalPages: 0,
                },
            },
        };
    }
};
