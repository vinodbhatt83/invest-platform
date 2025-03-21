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

interface VersionHistoryProps {
  documentId: string;
  versions: Version[];
  onVersionSelect: (version: string) => void;
  onCreateVersion?: () => void;
  className?: string;
}

const VersionHistory: React.FC<VersionHistoryProps> = ({
  documentId,
  versions,
  onVersionSelect,
  onCreateVersion,
  className = '',
}) => {
  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-md font-medium">Version History</CardTitle>
        {onCreateVersion && (
          <Button
            size="sm"
            variant="outline"
            onClick={onCreateVersion}
            className="h-8 px-2 text-xs"
          >
            Create New Version
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {versions.length === 0 ? (
            <p className="text-sm text-gray-500 italic">No version history available</p>
          ) : (
            versions.map((version) => (
              <div key={version.version} className="flex items-center py-2 border-b border-gray-100 last:border-0">
                <div className={`w-3 h-3 rounded-full mr-2 ${version.isCurrent ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                <div className="flex-1">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">{version.version}</span>
                    <span className="text-xs text-gray-500">{version.date}</span>
                  </div>
                  {version.userName && (
                    <p className="text-xs text-gray-500">
                      Updated by {version.userName}
                    </p>
                  )}
                  {version.notes && (
                    <p className="text-xs text-gray-500 mt-1 italic">
                      "{version.notes}"
                    </p>
                  )}
                </div>
                <button
                  className={`text-blue-600 text-sm font-medium ml-2 ${
                    version.isCurrent ? '' : 'hover:underline'
                  }`}
                  onClick={() => onVersionSelect(version.version)}
                  disabled={version.isCurrent}
                >
                  {version.isCurrent ? 'Current' : 'View'}
                </button>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default VersionHistory;
