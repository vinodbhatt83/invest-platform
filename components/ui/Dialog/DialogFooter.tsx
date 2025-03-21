import React from 'react';

export interface DialogFooterProps {
    children: React.ReactNode;
    className?: string;
}

const DialogFooter: React.FC<DialogFooterProps> = ({
    children,
    className = '',
}) => {
    return (
        <div className={`px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6 bg-gray-50 ${className}`}>
            {children}
        </div>
    );
};

export default DialogFooter;
