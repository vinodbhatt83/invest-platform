// components/documents/version-control/VersionCompareDialog.tsx
import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from 'date-fns';
import { Separator } from "@/components/ui/separator";
import { Download } from "lucide-react";
import VersionCompare from "./VersionCompare";

interface VersionCompareDialogProps {
    isOpen: boolean;
    onClose: () => void;
    oldVersion: {
        id: string;
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
        id: string;
        versionNumber: number;
        fileName: string;
        fileSize: number;
        fileType: string;
        content?: string;
        metadata?: Record<string, any>;
        createdAt: Date;
        createdBy: string;
    };
    onDownloadVersion: (versionId: string) => void;
}

const VersionCompareDialog: React.FC<VersionCompareDialogProps> = ({
    isOpen,
    onClose,
    oldVersion,
    newVersion,
    onDownloadVersion
}) => {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Compare Versions</DialogTitle>
                    <DialogDescription>
                        View the differences between version {oldVersion.versionNumber} and version {newVersion.versionNumber}.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex justify-between my-2 text-sm">
                    <div className="flex-1">
                        <div className="font-medium">Version {oldVersion.versionNumber}</div>
                        <div className="text-muted-foreground">
                            {format(new Date(oldVersion.createdAt), 'PPP p')} by {oldVersion.createdBy}
                        </div>
                        <div className="mt-1 flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => onDownloadVersion(oldVersion.id)}
                                className="h-7"
                            >
                                <Download className="h-3.5 w-3.5 mr-1" />
                                Download
                            </Button>
                        </div>
                    </div>

                    <div className="flex-1 text-right">
                        <div className="font-medium">Version {newVersion.versionNumber}</div>
                        <div className="text-muted-foreground">
                            {format(new Date(newVersion.createdAt), 'PPP p')} by {newVersion.createdBy}
                        </div>
                        <div className="mt-1 flex items-center justify-end gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => onDownloadVersion(newVersion.id)}
                                className="h-7"
                            >
                                <Download className="h-3.5 w-3.5 mr-1" />
                                Download
                            </Button>
                        </div>
                    </div>
                </div>

                <Separator className="my-2" />

                <ScrollArea className="flex-1">
                    <VersionCompare
                        oldVersion={oldVersion}
                        newVersion={newVersion}
                        type="both"
                    />
                </ScrollArea>

                <DialogFooter className="mt-4">
                    <Button variant="outline" onClick={onClose}>
                        Close
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default VersionCompareDialog;