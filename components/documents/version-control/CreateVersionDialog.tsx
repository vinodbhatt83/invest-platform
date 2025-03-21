import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../ui/Dialog';
import Button from '../../ui/Button';
import { useNotification } from '../../ui/Notification';

interface CreateVersionProps {
    documentId: string;
    currentVersion: string;
    isOpen: boolean;
    onClose: () => void;
    onVersionCreated: (newVersion: string) => void;
}

const CreateVersionDialog: React.FC<CreateVersionProps> = ({
    documentId,
    currentVersion,
    isOpen,
    onClose,
    onVersionCreated,
}) => {
    const [notes, setNotes] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const { showNotification } = useNotification();

    // Generate next version number based on current version
    const getNextVersion = (currentVersion: string): string => {
        if (!currentVersion || !currentVersion.startsWith('v')) {
            return 'v1.0';
        }

        const versionNumber = currentVersion.substring(1);
        const parts = versionNumber.split('.');

        if (parts.length !== 2) {
            return 'v1.0';
        }

        const major = parseInt(parts[0]);
        const minor = parseInt(parts[1]);

        // Increment minor version
        return `v${major}.${minor + 1}`;
    };

    const nextVersion = getNextVersion(currentVersion);

    const handleCreateVersion = async () => {
        if (isCreating) return;

        setIsCreating(true);

        try {
            const response = await fetch(`/api/documents/${documentId}/versions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    version: nextVersion,
                    notes: notes.trim() || `Created version ${nextVersion}`,
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to create new version');
            }

            const data = await response.json();

            showNotification({
                type: 'success',
                title: 'Version Created',
                message: `Version ${nextVersion} has been created successfully`,
            });

            onVersionCreated(nextVersion);
            onClose();
        } catch (error) {
            console.error('Error creating version:', error);
            showNotification({
                type: 'error',
                title: 'Error',
                message: 'Failed to create new version',
            });
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Create New Version</DialogTitle>
                </DialogHeader>
                <div className="py-4">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Current Version
                            </label>
                            <div className="px-3 py-2 bg-gray-100 rounded-md text-sm">
                                {currentVersion}
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                New Version
                            </label>
                            <div className="px-3 py-2 bg-blue-50 rounded-md text-sm font-medium text-blue-700">
                                {nextVersion}
                            </div>
                        </div>
                        <div>
                            <label htmlFor="version-notes" className="block text-sm font-medium text-gray-700 mb-1">
                                Version Notes (Optional)
                            </label>
                            <textarea
                                id="version-notes"
                                rows={3}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                placeholder="Describe what changed in this version..."
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                            />
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={isCreating}>
                        Cancel
                    </Button>
                    <Button onClick={handleCreateVersion} isLoading={isCreating}>
                        Create Version
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default CreateVersionDialog;
