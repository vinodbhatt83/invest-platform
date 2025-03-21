import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../ui/Dialog';
import Button from '../../ui/Button';
import { useNotification } from '../../ui/Notification';

interface VersionCompareDialogProps {
    documentId: string;
    isOpen: boolean;
    onClose: () => void;
    versionA: string;
    versionB: string;
}

const VersionCompareDialog: React.FC<VersionCompareDialogProps> = ({
    documentId,
    isOpen,
    onClose,
    versionA,
    versionB,
}) => {
    const [isLoading, setIsLoading] = useState(false);
    const [compareData, setCompareData] = useState<{
        versionA: { content: string; metadata: any };
        versionB: { content: string; metadata: any };
        differences: { type: 'added' | 'removed' | 'changed'; path: string; valueA?: any; valueB?: any }[];
    } | null>(null);
    const { showNotification } = useNotification();

    // Fetch comparison data when dialog opens
    React.useEffect(() => {
        if (isOpen && versionA && versionB) {
            fetchComparisonData();
        }
    }, [isOpen, versionA, versionB]);

    const fetchComparisonData = async () => {
        setIsLoading(true);
        try {
            const response = await fetch(`/api/documents/${documentId}/compare?versionA=${versionA}&versionB=${versionB}`);

            if (!response.ok) {
                throw new Error('Failed to compare versions');
            }

            const data = await response.json();
            setCompareData(data);
        } catch (error) {
            console.error('Error comparing versions:', error);
            showNotification({
                type: 'error',
                title: 'Error',
                message: 'Failed to compare document versions',
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl">
                <DialogHeader>
                    <DialogTitle>Compare Versions</DialogTitle>
                </DialogHeader>
                <div className="py-4">
                    {isLoading ? (
                        <div className="flex items-center justify-center h-64">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                        </div>
                    ) : compareData ? (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <div className="text-sm font-medium text-gray-700">
                                    Version {versionA}
                                    <span className="text-xs text-gray-500 ml-2">
                                        {compareData.versionA.metadata?.date}
                                    </span>
                                </div>
                                <div className="text-sm font-medium text-gray-700">
                                    Version {versionB}
                                    <span className="text-xs text-gray-500 ml-2">
                                        {compareData.versionB.metadata?.date}
                                    </span>
                                </div>
                            </div>

                            <div className="border rounded-md overflow-hidden">
                                <div className="bg-gray-50 px-4 py-2 border-b">
                                    <h3 className="text-sm font-medium text-gray-700">Changes</h3>
                                </div>
                                <div className="divide-y">
                                    {compareData.differences.length === 0 ? (
                                        <div className="px-4 py-3 text-sm text-gray-500 italic">
                                            No differences found between these versions
                                        </div>
                                    ) : (
                                        compareData.differences.map((diff, index) => (
                                            <div key={index} className="px-4 py-3">
                                                <div className="flex items-start">
                                                    <div className={`w-2 h-2 rounded-full mt-1 mr-2 ${diff.type === 'added' ? 'bg-green-500' :
                                                        diff.type === 'removed' ? 'bg-red-500' : 'bg-yellow-500'
                                                        }`}></div>
                                                    <div>
                                                        <p className="text-sm font-medium">
                                                            {diff.path}
                                                            <span className={`ml-2 text-xs font-normal ${diff.type === 'added' ? 'text-green-600' :
                                                                diff.type === 'removed' ? 'text-red-600' : 'text-yellow-600'
                                                                }`}>
                                                                {diff.type === 'added' ? 'Added' :
                                                                    diff.type === 'removed' ? 'Removed' : 'Changed'}
                                                            </span>
                                                        </p>
                                                        {diff.type === 'changed' && (
                                                            <div className="mt-1 grid grid-cols-2 gap-4 text-xs">
                                                                <div className="bg-red-50 p-2 rounded">
                                                                    <pre className="whitespace-pre-wrap">{JSON.stringify(diff.valueA, null, 2)}</pre>
                                                                </div>
                                                                <div className="bg-green-50 p-2 rounded">
                                                                    <pre className="whitespace-pre-wrap">{JSON.stringify(diff.valueB, null, 2)}</pre>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-8">
                            <p className="text-gray-500">No comparison data available</p>
                        </div>
                    )}
                </div>
                <DialogFooter>
                    <Button onClick={onClose}>
                        Close
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default VersionCompareDialog;
