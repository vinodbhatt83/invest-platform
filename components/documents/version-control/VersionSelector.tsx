import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { useNotification } from '../../ui/Notification';

interface VersionSelectorProps {
    documentId: string;
    currentVersion: string;
    versions: {
        version: string;
        date: string;
        isCurrent: boolean;
    }[];
    onVersionChange: (version: string) => void;
    className?: string;
}

const VersionSelector: React.FC<VersionSelectorProps> = ({
    documentId,
    currentVersion,
    versions,
    onVersionChange,
    className = '',
}) => {
    const [isChanging, setIsChanging] = useState(false);
    const { showNotification } = useNotification();
    const router = useRouter();

    const handleVersionChange = async (version: string) => {
        if (version === currentVersion || isChanging) return;

        setIsChanging(true);

        try {
            const response = await fetch(`/api/documents/${documentId}/versions`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ version }),
            });

            if (!response.ok) {
                throw new Error('Failed to change version');
            }

            showNotification({
                type: 'success',
                title: 'Version Changed',
                message: `Switched to version ${version}`,
            });

            onVersionChange(version);

            // Refresh the page to show the selected version
            router.reload();
        } catch (error) {
            console.error('Error changing version:', error);
            showNotification({
                type: 'error',
                title: 'Error',
                message: 'Failed to change document version',
            });
        } finally {
            setIsChanging(false);
        }
    };

    return (
        <div className={`relative ${className}`}>
            <label htmlFor="version-selector" className="block text-sm font-medium text-gray-700 mb-1">
                Version
            </label>
            <select
                id="version-selector"
                value={currentVersion}
                onChange={(e) => handleVersionChange(e.target.value)}
                disabled={isChanging || versions.length <= 1}
                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
            >
                {versions.map((version) => (
                    <option key={version.version} value={version.version}>
                        {version.version} {version.isCurrent ? '(Current)' : ''}
                    </option>
                ))}
            </select>
            {isChanging && (
                <div className="absolute right-2 top-8 h-5 w-5">
                    <svg className="animate-spin h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                </div>
            )}
        </div>
    );
};

export default VersionSelector;
