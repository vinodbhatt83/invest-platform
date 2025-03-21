// components/documents/version-control/VersionCompare.tsx
import React from 'react';
import { diffWords, diffLines } from 'diff';
import { formatBytes } from "@/lib/utils";
import { format } from 'date-fns';
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FileIcon } from "lucide-react";

interface VersionCompareProps {
    oldVersion: {
        versionNumber: number;
        fileName: string;
        fileSize: number;
        fileType: string;
        content?: string;
        metadata?: Record<string, any>;
        createdAt: Date;
        createdBy: string;
    };
    newVersion: {
        versionNumber: number;
        fileName: string;
        fileSize: number;
        fileType: string;
        content?: string;
        metadata?: Record<string, any>;
        createdAt: Date;
        createdBy: string;
    };
    type?: 'inline' | 'side-by-side' | 'both';
}

const VersionCompare: React.FC<VersionCompareProps> = ({
    oldVersion,
    newVersion,
    type = 'both'
}) => {
    // Check if we can do a text-based comparison
    const canCompareText = () => {
        return Boolean(
            oldVersion.content &&
            newVersion.content &&
            oldVersion.fileType === newVersion.fileType &&
            isTextBasedFile(oldVersion.fileType)
        );
    };

    // Check if this is a text-based file type
    const isTextBasedFile = (fileType: string) => {
        const textTypes = [
            'text/plain', 'text/csv', 'text/markdown',
            'application/json', 'application/xml',
            'text/html', 'text/css', 'text/javascript'
        ];
        return textTypes.includes(fileType);
    };

    // Render metadata comparison for all file types
    const renderMetadataComparison = () => {
        const metadataChanges = [];

        // Basic file metadata
        if (oldVersion.fileName !== newVersion.fileName) {
            metadataChanges.push({
                property: 'File Name',
                oldValue: oldVersion.fileName,
                newValue: newVersion.fileName
            });
        }

        if (oldVersion.fileSize !== newVersion.fileSize) {
            metadataChanges.push({
                property: 'File Size',
                oldValue: formatBytes(oldVersion.fileSize),
                newValue: formatBytes(newVersion.fileSize)
            });
        }

        if (oldVersion.fileType !== newVersion.fileType) {
            metadataChanges.push({
                property: 'File Type',
                oldValue: oldVersion.fileType,
                newValue: newVersion.fileType
            });
        }

        // Extended metadata if available
        if (oldVersion.metadata && newVersion.metadata) {
            const allKeys = new Set([
                ...Object.keys(oldVersion.metadata),
                ...Object.keys(newVersion.metadata)
            ]);

            allKeys.forEach(key => {
                const oldValue = oldVersion.metadata?.[key];
                const newValue = newVersion.metadata?.[key];

                if (oldValue !== newValue) {
                    metadataChanges.push({
                        property: key,
                        oldValue: oldValue ?? 'N/A',
                        newValue: newValue ?? 'N/A'
                    });
                }
            });
        }

        if (metadataChanges.length === 0) {
            return (
                <Alert>
                    <AlertDescription>
                        No metadata changes detected between versions.
                    </AlertDescription>
                </Alert>
            );
        }

        return (
            <div className="border rounded-md p-4">
                <h3 className="font-medium mb-2">Metadata Changes</h3>
                <table className="w-full">
                    <thead>
                        <tr className="border-b">
                            <th className="text-left py-2">Property</th>
                            <th className="text-left py-2">Version {oldVersion.versionNumber}</th>
                            <th className="text-left py-2">Version {newVersion.versionNumber}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {metadataChanges.map((change, index) => (
                            <tr key={index} className="border-b">
                                <td className="py-2 font-medium">{change.property}</td>
                                <td className="py-2">{String(change.oldValue)}</td>
                                <td className="py-2">{String(change.newValue)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

    const renderTextDiff = () => {
        if (!canCompareText()) return null;

        const wordDiff = diffWords(oldVersion.content!, newVersion.content!);
        const lineDiff = diffLines(oldVersion.content!, newVersion.content!);

        const renderSideBySide = () => (
            <div className="grid grid-cols-2 gap-4">
                <div className="border rounded-md p-4 bg-muted/20">
                    <h3 className="font-medium mb-2">Version {oldVersion.versionNumber}</h3>
                    <div className="whitespace-pre-wrap">
                        {lineDiff.map((part, i) => (
                            <span
                                key={i}
                                className={part.added
                                    ? 'hidden'
                                    : part.removed
                                        ? 'bg-red-100 line-through'
                                        : ''
                                }
                            >
                                {part.value}
                            </span>
                        ))}
                    </div>
                </div>

                <div className="border rounded-md p-4 bg-muted/20">
                    <h3 className="font-medium mb-2">Version {newVersion.versionNumber}</h3>
                    <div className="whitespace-pre-wrap">
                        {lineDiff.map((part, i) => (
                            <span
                                key={i}
                                className={part.removed
                                    ? 'hidden'
                                    : part.added
                                        ? 'bg-green-100'
                                        : ''
                                }
                            >
                                {part.value}
                            </span>
                        ))}
                    </div>
                </div>
            </div>
        );

        const renderInline = () => (
            <div className="border rounded-md p-4">
                <h3 className="font-medium mb-2">Inline Diff</h3>
                <div className="whitespace-pre-wrap">
                    {wordDiff.map((part, i) => (
                        <span
                            key={i}
                            className={part.added
                                ? 'bg-green-100'
                                : part.removed
                                    ? 'bg-red-100 line-through'
                                    : ''
                            }
                        >
                            {part.value}
                        </span>
                    ))}
                </div>
            </div>
        );

        return (
            <div className="space-y-8">
                {(type === 'side-by-side' || type === 'both') && renderSideBySide()}
                {(type === 'inline' || type === 'both') && renderInline()}
            </div>
        );
    };

    // Render a message for non-text file types
    const renderBinaryFilesMessage = () => {
        if (canCompareText()) return null;

        return (
            <Alert>
                <AlertDescription className="flex flex-col gap-1">
                    <div className="font-medium">
                        Detailed text comparison is not available for this file type.
                    </div>
                    <div>
                        You can download both versions to compare them using external applications.
                    </div>
                </AlertDescription>
            </Alert>
        );
    };

    return (
        <div className="space-y-8">
            {renderMetadataComparison()}
            {renderBinaryFilesMessage()}
            {renderTextDiff()}
        </div>
    );
};

export default VersionCompare;