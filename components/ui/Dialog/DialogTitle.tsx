import React from 'react';
import { Dialog as HeadlessDialog } from '@headlessui/react';

export interface DialogTitleProps {
    children: React.ReactNode;
    className?: string;
}

const DialogTitle: React.FC<DialogTitleProps> = ({
    children,
    className = '',
}) => {
    return (
        <HeadlessDialog.Title
            as="h3"
            className={`text-lg font-medium leading-6 text-gray-900 ${className}`}
        >
            {children}
        </HeadlessDialog.Title>
    );
};

export default DialogTitle;
