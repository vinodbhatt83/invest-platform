// components/documents/version-control/VersionSelector.tsx
import React from 'react';
import { format } from 'date-fns';
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { formatBytes } from "@/lib/utils";
import { FileIcon, FileTextIcon, FilePdfIcon, FileSpreadsheetIcon, FileImageIcon } from "lucide-react";

interface DocumentVersion {
    id: string;
    versionNumber: number;
    fileName: string;
    fileSize: number;
    fileType: string;
    createdAt: Date;
    createdBy: string;
    comment?: string;
    changes?: string;
}

interface VersionSelectorProps {
    versions: DocumentVersion[];
    currentVersion: number;
    selectedVersionId?: string | null;
    compareVersionId?: string | null;
    compareMode?: boolean;
    onSelect: (versionId: string) => void;
}

// Helper function to get appropriate file icon
const getFileIcon = (fileType: string) => {
    if (fileType.includes('pdf')) {
        return <FilePdfIcon className="h-4 w-4" />;
    } else if (fileType.includes('spreadsheet') || fileType.includes('excel') || fileType.includes('csv')) {
        return <FileSpreadsheetIcon className="h-4 w-4" />;
    } else if (fileType.includes('image')) {
        return <FileImageIcon className="h-4 w-4" />;
    } else if (fileType.includes('text') || fileType.includes('document')) {
        return <FileTextIcon className="h-4 w-4" />;
    } else {
        return <FileIcon className="h-4 w-4" />;
    }
};

const VersionSelector: React.FC<VersionSelectorProps> = ({
    versions,
    currentVersion,
    selectedVersionId,
    compareVersionId,
    compareMode = false,
    onSelect,
}) => {
    const sortedVersions = [...versions].sort((a, b) => b.versionNumber - a.versionNumber);

    return (
        <div className="space-y-2">
            {sortedVersions.map((version) => (
                <div
                    key={version.id}
                    className={`
            p-3 border rounded-md cursor-pointer transition-colors
            ${selectedVersionId === version.id ? 'border-primary bg-primary/5' : ''}
            ${compareVersionId === version.id ? 'border-blue-500 bg-blue-500/5' : ''}
          `}
                    onClick={() => onSelect(version.id)}
                >
                    <div className="flex justify-between items-start">
                        <div>
                            <div className="font-medium flex items-center gap-2">
                                Version {version.versionNumber}
                                {version.versionNumber === currentVersion && (
                                    <Badge variant="outline">Current</Badge>
                                )}
                            </div>
                            <div className="text-sm text-muted-foreground">
                                {format(new Date(version.createdAt), 'PPP p')} by {version.createdBy}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                        {getFileIcon(version.fileType)}
                        <span className="truncate" title={version.fileName}>
                            {version.fileName}
                        </span>
                        <span>({formatBytes(version.fileSize)})</span>
                    </div>

                    {version.comment && (
                        <div className="mt-2 text-sm">
                            <p className="text-muted-foreground">{version.comment}</p>
                        </div>
                    )}

                    {version.changes && (
                        <div className="mt-2 text-sm">
                            <Separator className="my-2" />
                            <p className="text-muted-foreground italic">Changes: {version.changes}</p>
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
};

export default VersionSelector;