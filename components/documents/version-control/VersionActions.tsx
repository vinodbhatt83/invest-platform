// components/documents/version-control/VersionActions.tsx
import React, { useState, useRef } from 'react';
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    History,
    Upload,
    ChevronDown,
    Download,
    PlusCircle
} from "lucide-react";
import CreateVersionDialog from "./CreateVersionDialog";

interface VersionActionsProps {
    documentId: string;
    currentFileName: string;
    currentFileType: string;
    onShowHistory: () => void;
    onUploadVersion: (file: File, comment: string) => void;
    onDownloadCurrent: () => void;
    isProcessing: boolean;
}

const VersionActions: React.FC<VersionActionsProps> = ({
    documentId,
    currentFileName,
    currentFileType,
    onShowHistory,
    onUploadVersion,
    onDownloadCurrent,
    isProcessing,
}) => {
    const [saveDialogOpen, setSaveDialogOpen] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Validate that the uploaded file matches the expected type
    const validateFileType = (file: File): boolean => {
        // This is a simple validation - you may need more specific rules
        if (currentFileType.includes('pdf')) {
            return file.type.includes('pdf');
        } else if (currentFileType.includes('spreadsheet') || currentFileType.includes('excel')) {
            return file.type.includes('spreadsheet') ||
                file.type.includes('excel') ||
                file.type.includes('csv') ||
                file.name.endsWith('.xlsx') ||
                file.name.endsWith('.xls');
        } else if (currentFileType.includes('document') || currentFileType.includes('word')) {
            return file.type.includes('document') ||
                file.type.includes('word') ||
                file.name.endsWith('.docx') ||
                file.name.endsWith('.doc');
        } else if (currentFileType.includes('image')) {
            return file.type.includes('image');
        }

        // For other file types, we can check by extension
        const currentExt = currentFileName.split('.').pop()?.toLowerCase();
        const newExt = file.name.split('.').pop()?.toLowerCase();

        return currentExt === newExt;
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!validateFileType(file)) {
            alert(`Please upload a file of the same type as the current document (${currentFileType}).`);
            return;
        }

        setSelectedFile(file);
        setSaveDialogOpen(true);
    };

    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    const handleSaveConfirm = (comment: string) => {
        if (selectedFile) {
            onUploadVersion(selectedFile, comment);
            setSaveDialogOpen(false);
            setSelectedFile(null);

            // Reset the file input
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    return (
        <>
            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                onChange={handleFileChange}
            />

            <div className="flex gap-2">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={onShowHistory}
                    className="flex items-center gap-1"
                >
                    <History className="h-4 w-4" />
                    History
                </Button>

                <Button
                    variant="outline"
                    size="sm"
                    onClick={onDownloadCurrent}
                    className="flex items-center gap-1"
                >
                    <Download className="h-4 w-4" />
                    Download
                </Button>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="default"
                            size="sm"
                            disabled={isProcessing}
                            className="flex items-center gap-1"
                        >
                            <Upload className="h-4 w-4" />
                            Upload New Version
                            <ChevronDown className="h-4 w-4 ml-1" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={handleUploadClick}>
                            <PlusCircle className="h-4 w-4 mr-2" />
                            Upload Modified File
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {selectedFile && (
                <CreateVersionDialog
                    isOpen={saveDialogOpen}
                    onClose={() => {
                        setSaveDialogOpen(false);
                        setSelectedFile(null);
                    }}
                    onSave={handleSaveConfirm}
                    isSaving={isProcessing}
                />
            )}
        </>
    );
};

export default VersionActions;