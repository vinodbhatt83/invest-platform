import React, { useMemo } from 'react';

interface FileValidatorProps {
    file: File;
    allowedFileTypes?: string[];
    maxFileSize?: number;
    children: (props: { isValid: boolean; errors: string[] }) => React.ReactNode;
}

const FileValidator: React.FC<FileValidatorProps> = ({
    file,
    allowedFileTypes = [],
    maxFileSize,
    children,
}) => {
    const validation = useMemo(() => {
        const errors: string[] = [];

        // Check file type
        if (allowedFileTypes.length > 0) {
            const fileExtension = `.${file.name.split('.').pop()?.toLowerCase()}`;
            const mimeType = file.type.toLowerCase();

            const isAllowedType = allowedFileTypes.some((type) => {
                // Check if it's a file extension (starts with a dot)
                if (type.startsWith('.')) {
                    return fileExtension === type.toLowerCase();
                }
                // Otherwise, check MIME type
                return mimeType === type.toLowerCase();
            });

            if (!isAllowedType) {
                errors.push(`File type not allowed. Accepted formats: ${allowedFileTypes.join(', ')}`);
            }
        }

        // Check file size
        if (maxFileSize && file.size > maxFileSize) {
            const sizeMB = (maxFileSize / (1024 * 1024)).toFixed(1);
            errors.push(`File size exceeds the maximum allowed size (${sizeMB} MB)`);
        }

        return {
            isValid: errors.length === 0,
            errors,
        };
    }, [file, allowedFileTypes, maxFileSize]);

    return <>{children(validation)}</>;
};

export default FileValidator;