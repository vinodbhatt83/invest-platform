import React from 'react';

export interface DialogContentProps {
    children: React.ReactNode;
    className?: string;
}

const DialogContent: React.FC<DialogContentProps> = ({
    children,
    className = '',
}) => {
    return (
        <div className={`px-4 pb-4 pt-5 sm:p-6 ${className}`}>
            {children}
        </div>
    );
};

export default DialogContent;
