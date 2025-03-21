// components/documents/version-control/CreateVersionDialog.tsx
import React, { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FileIcon } from "lucide-react";

interface CreateVersionDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (comment: string) => void;
    isSaving: boolean;
    fileName?: string;
}

const CreateVersionDialog: React.FC<CreateVersionDialogProps> = ({
    isOpen,
    onClose,
    onSave,
    isSaving,
    fileName
}) => {
    const [comment, setComment] = useState('');

    const handleSave = () => {
        onSave(comment);
        setComment('');
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Save New Version</DialogTitle>
                </DialogHeader>

                {fileName && (
                    <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-md">
                        <FileIcon className="h-5 w-5 text-muted-foreground" />
                        <span className="text-sm truncate">{fileName}</span>
                    </div>
                )}

                <div className="py-4">
                    <Label htmlFor="version-comment">Version Comment (Optional)</Label>
                    <Textarea
                        id="version-comment"
                        placeholder="Describe what changed in this version..."
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        className="mt-2"
                    />
                </div>
                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={onClose}
                        disabled={isSaving}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={isSaving}
                    >
                        {isSaving ? 'Saving...' : 'Save Version'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default CreateVersionDialog;