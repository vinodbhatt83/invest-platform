// components/documents/version-control/VersionHistory.tsx
import React, { useState } from 'react';
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
import { ArrowLeft, ArrowRight, RotateCcw, Eye, Download } from "lucide-react";
import VersionSelector from "./VersionSelector";

interface DocumentVersion {
  id: string;
  documentId: string;
  versionNumber: number;
  fileName: string;
  fileSize: number;
  fileType: string;
  fileUrl?: string;
  createdAt: Date;
  createdBy: string;
  changes?: string;
  comment?: string;
}

interface VersionHistoryProps {
  isOpen: boolean;
  onClose: () => void;
  documentId: string;
  currentVersion: number;
  versions: DocumentVersion[];
  onRestoreVersion: (versionId: string) => void;
  onViewVersion: (versionId: string) => void;
  onCompareVersions: (versionId1: string, versionId2: string) => void;
  onDownloadVersion: (versionId: string) => void;
}

const VersionHistory: React.FC<VersionHistoryProps> = ({
  isOpen,
  onClose,
  documentId,
  currentVersion,
  versions,
  onRestoreVersion,
  onViewVersion,
  onCompareVersions,
  onDownloadVersion
}) => {
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [compareVersionId, setCompareVersionId] = useState<string | null>(null);

  const sortedVersions = [...versions].sort((a, b) => b.versionNumber - a.versionNumber);

  const handleVersionSelect = (versionId: string) => {
    if (compareMode) {
      if (compareVersionId === versionId) {
        setCompareVersionId(null);
      } else if (compareVersionId === null) {
        setCompareVersionId(versionId);
      } else {
        onCompareVersions(compareVersionId, versionId);
        setCompareMode(false);
        setCompareVersionId(null);
      }
    } else {
      setSelectedVersionId(versionId === selectedVersionId ? null : versionId);
    }
  };

  const handleRestoreVersion = () => {
    if (selectedVersionId) {
      onRestoreVersion(selectedVersionId);
      onClose();
    }
  };

  const handleViewVersion = () => {
    if (selectedVersionId) {
      onViewVersion(selectedVersionId);
    }
  };

  const handleDownloadVersion = () => {
    if (selectedVersionId) {
      onDownloadVersion(selectedVersionId);
    }
  };

  const toggleCompareMode = () => {
    setCompareMode(!compareMode);
    setCompareVersionId(null);
  };

  // Check if file type can be compared
  const canCompareFiles = () => {
    if (!selectedVersionId || !compareVersionId) return true;

    const selectedVersion = versions.find(v => v.id === selectedVersionId);
    const compareVersion = versions.find(v => v.id === compareVersionId);

    if (!selectedVersion || !compareVersion) return true;

    // Text-based files can be compared
    const comparableTypes = [
      'text/plain', 'text/csv', 'text/markdown',
      'application/json', 'application/xml',
      'text/html', 'text/css', 'text/javascript'
    ];

    return comparableTypes.includes(selectedVersion.fileType) &&
      selectedVersion.fileType === compareVersion.fileType;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Version History</DialogTitle>
          <DialogDescription>
            View, download, compare, and restore previous versions of this document.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap gap-2 my-2">
          <Button
            variant={compareMode ? "default" : "outline"}
            size="sm"
            onClick={toggleCompareMode}
            className="flex items-center gap-1"
            disabled={!canCompareFiles()}
          >
            <ArrowLeft className="h-4 w-4" />
            <ArrowRight className="h-4 w-4" />
            Compare Versions
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleViewVersion}
            disabled={!selectedVersionId || compareMode}
            className="flex items-center gap-1"
          >
            <Eye className="h-4 w-4" />
            View Version
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadVersion}
            disabled={!selectedVersionId || compareMode}
            className="flex items-center gap-1"
          >
            <Download className="h-4 w-4" />
            Download
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleRestoreVersion}
            disabled={!selectedVersionId || compareMode || selectedVersionId === sortedVersions[0]?.id}
            className="flex items-center gap-1"
          >
            <RotateCcw className="h-4 w-4" />
            Restore Version
          </Button>
        </div>

        {compareMode && (
          <div className="text-sm text-muted-foreground mb-2">
            {compareVersionId ? "Now select a second version to compare" : "Select first version to compare"}
          </div>
        )}

        <ScrollArea className="flex-1 pr-4">
          <VersionSelector
            versions={versions}
            currentVersion={currentVersion}
            selectedVersionId={selectedVersionId}
            compareVersionId={compareVersionId}
            compareMode={compareMode}
            onSelect={handleVersionSelect}
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

export default VersionHistory;