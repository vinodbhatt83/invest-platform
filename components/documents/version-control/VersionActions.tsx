import React, { useState } from 'react';
import { Card, CardHeader, CardContent, CardTitle } from '../../ui/Card';
import Button from '../../ui/Button';
import { useNotification } from '../../ui/Notification';

interface VersionActionsProps {
    documentId: string;
    currentVersion: string;
    onCreateVersion: () => void;
    onCompareVersions: () => void;
    className?: string;
}

const VersionActions: React.FC<VersionActionsProps> = ({
    documentId,
    currentVersion,
    onCreateVersion,
    onCompareVersions,
    className = '',
}) => {
    const [isExporting, setIsExporting] = useState(false);
    const { showNotification } = useNotification();

    const handleExportVersionHistory = async () => {
        if (isExporting) return;

        setIsExporting(true);

        try {
            const response = await fetch(`/api/documents/${documentId}/versions/export`);

            if (!response.ok) {
                throw new Error('Failed to export version history');
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `document_${documentId}_version_history.csv`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);

            showNotification({
                type: 'success',
                title: 'Export Complete',
                message: 'Version history has been exported successfully',
            });
        } catch (error) {
            console.error('Error exporting version history:', error);
            showNotification({
                type: 'error',
                title: 'Export Failed',
                message: 'Failed to export version history',
            });
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <Card className={className}>
            <CardHeader className="pb-2">
                <CardTitle className="text-md font-medium">Version Actions</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-3">
                    <Button
                        onClick={onCreateVersion}
                        className="w-full justify-center"
                        size="sm"
                    >
                        Create New Version
                    </Button>

                    <Button
                        onClick={onCompareVersions}
                        variant="outline"
                        className="w-full justify-center"
                        size="sm"
                    >
                        Compare Versions
                    </Button>

                    <Button
                        onClick={handleExportVersionHistory}
                        variant="outline"
                        className="w-full justify-center"
                        size="sm"
                        isLoading={isExporting}
                    >
                        Export Version History
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
};

export default VersionActions;
