import React from 'react';
import { Card, CardHeader, CardContent, CardTitle } from '../../ui/Card';
import Button from '../../ui/Button';

interface Version {
    version: string;
    date: string;
    isCurrent: boolean;
    userId?: string;
    userName?: string;
    notes?: string;
}

interface VersionCompareProps {
    documentId: string;
    versions: Version[];
    selectedVersions: string[];
    onSelectVersion: (version: string, selected: boolean) => void;
    onCompare: () => void;
    className?: string;
}

const VersionCompare: React.FC<VersionCompareProps> = ({
    documentId,
    versions,
    selectedVersions,
    onSelectVersion,
    onCompare,
    className = '',
}) => {
    return (
        <Card className={className}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-md font-medium">Compare Versions</CardTitle>
                <Button
                    size="sm"
                    variant="outline"
                    onClick={onCompare}
                    disabled={selectedVersions.length !== 2}
                    className="h-8 px-2 text-xs"
                >
                    Compare Selected
                </Button>
            </CardHeader>
            <CardContent>
                <div className="space-y-2">
                    {versions.length < 2 ? (
                        <p className="text-sm text-gray-500 italic">Need at least two versions to compare</p>
                    ) : (
                        <>
                            <p className="text-sm text-gray-500 mb-2">Select two versions to compare</p>
                            {versions.map((version) => (
                                <div key={version.version} className="flex items-center py-2 border-b border-gray-100 last:border-0">
                                    <input
                                        type="checkbox"
                                        id={`compare-${version.version}`}
                                        checked={selectedVersions.includes(version.version)}
                                        onChange={(e) => onSelectVersion(version.version, e.target.checked)}
                                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                        disabled={selectedVersions.length >= 2 && !selectedVersions.includes(version.version)}
                                    />
                                    <label htmlFor={`compare-${version.version}`} className="ml-2 flex-1">
                                        <div className="flex justify-between">
                                            <span className="text-sm font-medium">{version.version}</span>
                                            <span className="text-xs text-gray-500">{version.date}</span>
                                        </div>
                                        {version.isCurrent && (
                                            <span className="text-xs text-green-600">Current version</span>
                                        )}
                                    </label>
                                </div>
                            ))}
                        </>
                    )}
                </div>
            </CardContent>
        </Card>
    );
};

export default VersionCompare;
