import React from 'react';

export interface DialogHeaderProps {
    children: React.ReactNode;
    className?: string;
}

const DialogHeader: React.FC<DialogHeaderProps> = ({
    children,
    className = '',
}) => {
    return (
        <div className={`px-4 py-4 sm:px-6 border-b border-gray-200 ${className}`}>
            {children}
        </div>
    );
};

export default DialogHeader;
