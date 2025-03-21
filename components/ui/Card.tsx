import React from 'react';
import { twMerge } from 'tailwind-merge';

interface CardProps {
    children: React.ReactNode;
    className?: string;
    padding?: 'none' | 'sm' | 'md' | 'lg';
    shadow?: 'none' | 'sm' | 'md' | 'lg';
    border?: boolean;
    borderRadius?: 'none' | 'sm' | 'md' | 'lg';
}

export const Card: React.FC<CardProps> = ({
    children,
    className,
    padding = 'md',
    shadow = 'md',
    border = true,
    borderRadius = 'md',
}) => {
    const paddingClasses = {
        none: 'p-0',
        sm: 'p-2',
        md: 'p-4',
        lg: 'p-6',
    };

    const shadowClasses = {
        none: 'shadow-none',
        sm: 'shadow-sm',
        md: 'shadow',
        lg: 'shadow-lg',
    };

    const borderRadiusClasses = {
        none: 'rounded-none',
        sm: 'rounded-sm',
        md: 'rounded',
        lg: 'rounded-lg',
    };

    const borderClass = border ? 'border border-gray-200' : '';

    return (
        <div
            className={twMerge(
                'bg-white',
                paddingClasses[padding],
                shadowClasses[shadow],
                borderRadiusClasses[borderRadius],
                borderClass,
                className
            )}
        >
            {children}
        </div>
    );
};

export const CardHeader: React.FC<{ children: React.ReactNode; className?: string }> = ({
    children,
    className
}) => {
    return (
        <div className={twMerge('px-4 py-3 border-b border-gray-200', className)}>
            {children}
        </div>
    );
};

export const CardTitle: React.FC<{ children: React.ReactNode; className?: string }> = ({
    children,
    className
}) => {
    return (
        <h3 className={twMerge('text-lg font-semibold text-gray-800', className)}>
            {children}
        </h3>
    );
};

export const CardContent: React.FC<{ children: React.ReactNode; className?: string }> = ({
    children,
    className
}) => {
    return (
        <div className={twMerge('px-4 py-4', className)}>
            {children}
        </div>
    );
};

export const CardFooter: React.FC<{ children: React.ReactNode; className?: string }> = ({
    children,
    className
}) => {
    return (
        <div className={twMerge('px-4 py-3 bg-gray-50 border-t border-gray-200', className)}>
            {children}
        </div>
    );
};

export default Card;