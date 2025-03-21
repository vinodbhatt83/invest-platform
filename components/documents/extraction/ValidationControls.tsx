import React, { useState, useEffect } from 'react';
import ConfidenceIndicator from './ConfidenceIndicator';

interface Field {
    id: string;
    name: string;
    value: string;
    confidence: number;
    isValid?: boolean;
}

interface ValidationControlsProps {
    field: Field;
    onValueChange?: (value: string) => void;
    onValidationChange?: (isValid: boolean) => void;
    isReadOnly?: boolean;
}

const ValidationControls: React.FC<ValidationControlsProps> = ({
    field,
    onValueChange,
    onValidationChange,
    isReadOnly = false,
}) => {
    const [value, setValue] = useState<string>(field.value);
    const [isValid, setIsValid] = useState<boolean>(field.isValid !== false);
    const [isFocused, setIsFocused] = useState<boolean>(false);

    useEffect(() => {
        setValue(field.value);
        setIsValid(field.isValid !== false);
    }, [field.value, field.isValid]);

    const handleValueChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const newValue = e.target.value;
        setValue(newValue);
        if (onValueChange) {
            onValueChange(newValue);
        }
    };

    const handleApprove = () => {
        setIsValid(true);
        if (onValidationChange) {
            onValidationChange(true);
        }
    };

    const handleReject = () => {
        setIsValid(false);
        if (onValidationChange) {
            onValidationChange(false);
        }
    };

    const handleBlur = () => {
        setIsFocused(false);
        if (onValueChange && value !== field.value) {
            onValueChange(value);
        }
    };

    // Determine if we should show a textarea (for longer text) or an input
    const isMultiline = value.length > 100 || value.includes('\n');

    // Style classes based on validation state
    const getInputClasses = () => {
        const baseClasses = 'block w-full rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm';

        if (isValid === false) {
            return `${baseClasses} border-red-300 text-red-900 focus:border-red-500 focus:ring-red-500`;
        }

        if (isValid === true) {
            return `${baseClasses} border-green-300 text-gray-900`;
        }

        return `${baseClasses} border-gray-300 text-gray-900`;
    };

    return (
        <div className={`p-4 rounded-lg border ${isValid === false
                ? 'border-red-200 bg-red-50'
                : isValid === true
                    ? 'border-green-200 bg-green-50'
                    : 'border-gray-200 bg-white'
            }`}>
            <div className="mb-2 flex justify-between items-start">
                <label htmlFor={`field-${field.id}`} className="block text-sm font-medium text-gray-700">
                    {field.name}
                </label>
                <ConfidenceIndicator
                    score={field.confidence}
                    size="sm"
                    showPercentage={true}
                    showLabel={false}
                />
            </div>

            {isMultiline ? (
                <textarea
                    id={`field-${field.id}`}
                    value={value}
                    onChange={handleValueChange}
                    onFocus={() => setIsFocused(true)}
                    onBlur={handleBlur}
                    rows={3}
                    className={getInputClasses()}
                    readOnly={isReadOnly}
                />
            ) : (
                <input
                    type="text"
                    id={`field-${field.id}`}
                    value={value}
                    onChange={handleValueChange}
                    onFocus={() => setIsFocused(true)}
                    onBlur={handleBlur}
                    className={getInputClasses()}
                    readOnly={isReadOnly}
                />
            )}

            {!isReadOnly && (
                <div className="mt-2 flex justify-end space-x-2">
                    <button
                        type="button"
                        onClick={handleReject}
                        className={`inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded shadow-sm ${isValid === false
                                ? 'text-white bg-red-600 hover:bg-red-700'
                                : 'text-red-700 bg-red-100 hover:bg-red-200'
                            }`}
                    >
                        <svg className="mr-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        Reject
                    </button>
                    <button
                        type="button"
                        onClick={handleApprove}
                        className={`inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded shadow-sm ${isValid === true
                                ? 'text-white bg-green-600 hover:bg-green-700'
                                : 'text-green-700 bg-green-100 hover:bg-green-200'
                            }`}
                    >
                        <svg className="mr-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Approve
                    </button>
                </div>
            )}

            {isValid === false && (
                <p className="mt-2 text-sm text-red-600">
                    This field has been marked as incorrect. Please update the value.
                </p>
            )}
        </div>
    );
};

export default ValidationControls;