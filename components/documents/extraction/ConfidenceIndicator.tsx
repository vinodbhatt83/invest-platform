import React from 'react';
import { twMerge } from 'tailwind-merge';

interface ConfidenceIndicatorProps {
    score: number; // Between 0 and 1
    size?: 'sm' | 'md' | 'lg';
    showLabel?: boolean;
    showPercentage?: boolean;
    className?: string;
}

const ConfidenceIndicator: React.FC<ConfidenceIndicatorProps> = ({
    score,
    size = 'md',
    showLabel = false,
    showPercentage = true,
    className,
}) => {
    // Ensure score is between 0 and 1
    const normalizedScore = Math.max(0, Math.min(1, score));

    // Calculate color based on score
    const getColor = () => {
        if (normalizedScore >= 0.8) return 'bg-green-500';
        if (normalizedScore >= 0.6) return 'bg-blue-500';
        if (normalizedScore >= 0.4) return 'bg-yellow-500';
        if (normalizedScore >= 0.2) return 'bg-orange-500';
        return 'bg-red-500';
    };

    // Text color for the percentage
    const getTextColor = () => {
        if (normalizedScore >= 0.8) return 'text-green-700';
        if (normalizedScore >= 0.6) return 'text-blue-700';
        if (normalizedScore >= 0.4) return 'text-yellow-700';
        if (normalizedScore >= 0.2) return 'text-orange-700';
        return 'text-red-700';
    };

    // Calculate dimensions based on size
    const dimensions = {
        sm: {
            container: 'h-1.5',
            wrapper: 'text-xs',
        },
        md: {
            container: 'h-2',
            wrapper: 'text-sm',
        },
        lg: {
            container: 'h-3',
            wrapper: 'text-base',
        },
    };

    // Format percentage
    const percentage = Math.round(normalizedScore * 100);

    return (
        <div className={twMerge('flex flex-col', dimensions[size].wrapper, className)}>
            {showLabel && (
                <div className="flex justify-between items-center mb-1">
                    <span className="text-gray-700 font-medium">Confidence</span>
                    {showPercentage && (
                        <span className={`font-semibold ${getTextColor()}`}>{percentage}%</span>
                    )}
                </div>
            )}
            <div className={`w-full bg-gray-200 rounded-full overflow-hidden ${dimensions[size].container}`}>
                <div
                    className={`${getColor()} h-full rounded-full transition-all duration-300`}
                    style={{ width: `${percentage}%` }}
                />
            </div>
            {!showLabel && showPercentage && (
                <div className="text-right mt-1">
                    <span className={`font-semibold ${getTextColor()}`}>{percentage}%</span>
                </div>
            )}
        </div>
    );
};

export default ConfidenceIndicator;