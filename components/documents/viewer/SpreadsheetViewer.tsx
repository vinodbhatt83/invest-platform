import React, { useState, useEffect } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import Button from '../../ui/Button';

interface SpreadsheetViewerProps {
    fileUrl: string;
    onError?: (error: Error) => void;
}

interface SheetData {
    headers: string[];
    data: any[][];
    sheetNames: string[];
    activeSheet: string;
}

const SpreadsheetViewer: React.FC<SpreadsheetViewerProps> = ({ fileUrl, onError }) => {
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [sheetData, setSheetData] = useState<SheetData | null>(null);
    const [currentPage, setCurrentPage] = useState<number>(1);
    const rowsPerPage = 20;

    useEffect(() => {
        const fetchAndParseFile = async () => {
            try {
                setIsLoading(true);

                const response = await fetch(fileUrl);
                if (!response.ok) {
                    throw new Error('Failed to fetch file');
                }

                const fileExtension = fileUrl.split('.').pop()?.toLowerCase();

                if (fileExtension === 'csv') {
                    // Handle CSV
                    const text = await response.text();

                    Papa.parse(text, {
                        header: true,
                        skipEmptyLines: true,
                        complete: (results) => {
                            const headers = results.meta.fields || [];
                            const rows = results.data as Record<string, any>[];

                            // Convert rows to 2D array
                            const data = rows.map(row => headers.map(header => row[header]));

                            setSheetData({
                                headers,
                                data,
                                sheetNames: ['Sheet1'],
                                activeSheet: 'Sheet1'
                            });

                            setIsLoading(false);
                        },
                        error: (error) => {
                            throw new Error(`CSV parsing error: ${error.message}`);
                        }
                    });
                } else {
                    // Handle Excel files (xls, xlsx, etc.)
                    const arrayBuffer = await response.arrayBuffer();
                    const workbook = XLSX.read(arrayBuffer, { type: 'array' });

                    const sheetNames = workbook.SheetNames;

                    if (sheetNames.length === 0) {
                        throw new Error('No sheets found in the workbook');
                    }

                    const firstSheetName = sheetNames[0];
                    const worksheet = workbook.Sheets[firstSheetName];

                    // Convert sheet to JSON
                    const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { header: 1 });

                    if (jsonData.length === 0) {
                        setSheetData({
                            headers: [],
                            data: [],
                            sheetNames,
                            activeSheet: firstSheetName
                        });
                    } else {
                        const headers = jsonData[0] as string[];
                        const data = jsonData.slice(1) as any[][];;

                        setSheetData({
                            headers,
                            data,
                            sheetNames,
                            activeSheet: firstSheetName
                        });
                    }

                    setIsLoading(false);
                }
            } catch (error) {
                setIsLoading(false);
                if (onError) {
                    onError(error instanceof Error ? error : new Error('Failed to load spreadsheet'));
                }
            }
        };

        fetchAndParseFile();
    }, [fileUrl, onError]);

    const handleSheetChange = async (sheetName: string) => {
        try {
            if (!sheetData || sheetData.activeSheet === sheetName) return;

            setIsLoading(true);

            const response = await fetch(fileUrl);
            const arrayBuffer = await response.arrayBuffer();
            const workbook = XLSX.read(arrayBuffer, { type: 'array' });

            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { header: 1 });

            if (jsonData.length === 0) {
                setSheetData({
                    ...sheetData,
                    headers: [],
                    data: [],
                    activeSheet: sheetName
                });
            } else {
                const headers = jsonData[0] as string[];
                const data = jsonData.slice(1) as any[][];;

                setSheetData({
                    ...sheetData,
                    headers,
                    data,
                    activeSheet: sheetName
                });
            }

            setCurrentPage(1);
            setIsLoading(false);
        } catch (error) {
            setIsLoading(false);
            if (onError) {
                onError(error instanceof Error ? error : new Error('Failed to load sheet'));
            }
        }
    };

    const totalPages = sheetData?.data
        ? Math.ceil(sheetData.data.length / rowsPerPage)
        : 0;

    const paginatedData = sheetData?.data
        ? sheetData.data.slice(
            (currentPage - 1) * rowsPerPage,
            currentPage * rowsPerPage
        )
        : [];

    return (
        <div className="flex flex-col">
            {isLoading ? (
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
            ) : (
                <>
                    {/* Sheet selector */}
                    {sheetData?.sheetNames.length > 1 && (
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Sheet:
                            </label>
                            <select
                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                                value={sheetData.activeSheet}
                                onChange={(e) => handleSheetChange(e.target.value)}
                            >
                                {sheetData.sheetNames.map((name) => (
                                    <option key={name} value={name}>
                                        {name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Table */}
                    <div className="overflow-x-auto border rounded-lg">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    {sheetData?.headers.map((header, index) => (
                                        <th
                                            key={index}
                                            scope="col"
                                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                        >
                                            {header || `Column ${index + 1}`}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {paginatedData.map((row, rowIndex) => (
                                    <tr key={rowIndex}>
                                        {row.map((cell, cellIndex) => (
                                            <td
                                                key={cellIndex}
                                                className="px-6 py-4 whitespace-nowrap text-sm text-gray-500"
                                            >
                                                {cell !== null && cell !== undefined ? String(cell) : ''}
                                            </td>
                                        ))}
                                    </tr>
                                ))}

                                {paginatedData.length === 0 && (
                                    <tr>
                                        <td
                                            colSpan={sheetData?.headers.length || 1}
                                            className="px-6 py-4 text-center text-sm text-gray-500"
                                        >
                                            No data available
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6 mt-4 rounded-lg">
                            <div className="flex flex-1 justify-between sm:hidden">
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                                    disabled={currentPage === 1}
                                >
                                    Previous
                                </Button>
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                                    disabled={currentPage === totalPages}
                                >
                                    Next
                                </Button>
                            </div>
                            <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                                <div>
                                    <p className="text-sm text-gray-700">
                                        Showing <span className="font-medium">{(currentPage - 1) * rowsPerPage + 1}</span> to{' '}
                                        <span className="font-medium">
                                            {Math.min(currentPage * rowsPerPage, (sheetData?.data.length || 0))}
                                        </span>{' '}
                                        of <span className="font-medium">{sheetData?.data.length}</span> results
                                    </p>
                                </div>
                                <div>
                                    <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            className="rounded-l-md"
                                            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                                            disabled={currentPage === 1}
                                        >
                                            <span className="sr-only">Previous</span>
                                            <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                                <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
                                            </svg>
                                        </Button>

                                        {Array.from({ length: Math.min(5, totalPages) }).map((_, index) => {
                                            let pageNumber;
                                            if (totalPages <= 5) {
                                                pageNumber = index + 1;
                                            } else if (currentPage <= 3) {
                                                pageNumber = index + 1;
                                            } else if (currentPage >= totalPages - 2) {
                                                pageNumber = totalPages - 4 + index;
                                            } else {
                                                pageNumber = currentPage - 2 + index;
                                            }

                                            return (
                                                <button
                                                    key={pageNumber}
                                                    onClick={() => setCurrentPage(pageNumber)}
                                                    className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${currentPage === pageNumber
                                                            ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                                                            : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                                                        } focus:z-20 focus:outline-offset-0`}
                                                >
                                                    {pageNumber}
                                                </button>
                                            );
                                        })}

                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            className="rounded-r-md"
                                            onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                                            disabled={currentPage === totalPages}
                                        >
                                            <span className="sr-only">Next</span>
                                            <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                                <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                                            </svg>
                                        </Button>
                                    </nav>
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default SpreadsheetViewer;