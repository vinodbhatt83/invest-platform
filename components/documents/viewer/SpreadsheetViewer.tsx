// components/documents/viewer/SpreadsheetViewer.tsx
import React, { useState, useEffect } from 'react';
import { FileSpreadsheetIcon } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface SpreadsheetViewerProps {
    fileUrl: string;
}

const SpreadsheetViewer: React.FC<SpreadsheetViewerProps> = ({ fileUrl }) => {
    const [data, setData] = useState<any[][]>([]);
    const [sheets, setSheets] = useState<string[]>(['Sheet1']);
    const [activeSheet, setActiveSheet] = useState('Sheet1');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchSpreadsheetData = async () => {
            try {
                setIsLoading(true);

                // For CSV files, this would be a simple fetch
                // For Excel files, you'd need to use a library like SheetJS

                // This is a placeholder implementation for demo purposes
                // In a real app, you'd parse the actual file content

                // Simulating loading data from a CSV
                const response = await fetch(fileUrl);

                if (!response.ok) {
                    throw new Error('Failed to load file');
                }

                // Simple CSV parsing (this is very basic)
                const text = await response.text();
                const rows = text.split('\n').map(row => row.split(','));

                setData(rows);
            } catch (err) {
                console.error('Error loading spreadsheet:', err);
                setError(err instanceof Error ? err.message : 'Unknown error');
            } finally {
                setIsLoading(false);
            }
        };

        fetchSpreadsheetData();
    }, [fileUrl]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="flex flex-col items-center">
                    <FileSpreadsheetIcon className="h-10 w-10 animate-pulse" />
                    <p className="mt-2">Loading spreadsheet data...</p>
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
                Spreadsheet Viewer
            </div>

            <Tabs defaultValue={activeSheet} className="flex-1 flex flex-col">
                <TabsList>
                    {sheets.map(sheet => (
                        <TabsTrigger
                            key={sheet}
                            value={sheet}
                            onClick={() => setActiveSheet(sheet)}
                        >
                            {sheet}
                        </TabsTrigger>
                    ))}
                </TabsList>

                <TabsContent value={activeSheet} className="flex-1 border rounded-md overflow-hidden">
                    <ScrollArea className="h-full">
                        <div className="min-w-max">
                            <table className="w-full border-collapse">
                                <tbody>
                                    {data.map((row, rowIndex) => (
                                        <tr key={rowIndex}>
                                            {row.map((cell, cellIndex) => (
                                                <td
                                                    key={cellIndex}
                                                    className="border px-3 py-2 text-sm"
                                                    style={{
                                                        fontWeight: rowIndex === 0 ? 'bold' : 'normal',
                                                        backgroundColor: rowIndex === 0 ? 'rgb(243, 244, 246)' : 'white',
                                                    }}
                                                >
                                                    {cell}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </ScrollArea>
                </TabsContent>
            </Tabs>

            <div className="text-sm text-muted-foreground mt-2">
                Note: This is a simplified view. For full features, please download the file.
            </div>
        </div>
    );
};

export default SpreadsheetViewer;