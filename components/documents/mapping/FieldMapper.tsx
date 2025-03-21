import React from 'react';

interface ExtractedField {
    id: string;
    name: string;
    value: string;
    confidence: number;
}

interface TargetField {
    id: string;
    name: string;
    description?: string;
    required: boolean;
    type: 'text' | 'number' | 'date' | 'boolean' | 'enum';
    options?: string[]; // For enum type
}

interface FieldMapperProps {
    targetField: TargetField;
    extractedFields: ExtractedField[];
    selectedExtractedFieldId: string | null;
    onChange?: (extractedFieldId: string | null) => void;
    isReadOnly?: boolean;
}

const FieldMapper: React.FC<FieldMapperProps> = ({
    targetField,
    extractedFields,
    selectedExtractedFieldId,
    onChange,
    isReadOnly = false,
}) => {
    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const value = e.target.value;
        if (onChange) {
            onChange(value === '' ? null : value);
        }
    };

    // Get the selected extracted field if any
    const selectedField = selectedExtractedFieldId
        ? extractedFields.find((field) => field.id === selectedExtractedFieldId)
        : null;

    return (
        <div className="border border-gray-200 rounded-lg p-4 bg-white">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                <div className="flex-1">
                    <div className="flex items-center">
                        <h4 className="text-sm font-medium text-gray-900">{targetField.name}</h4>
                        {targetField.required && (
                            <span className="ml-1 text-red-500">*</span>
                        )}
                    </div>
                    {targetField.description && (
                        <p className="mt-1 text-xs text-gray-500">{targetField.description}</p>
                    )}
                    <div className="mt-1 text-xs text-gray-500">
                        Type: {targetField.type.charAt(0).toUpperCase() + targetField.type.slice(1)}
                        {targetField.type === 'enum' && targetField.options && (
                            <span> ({targetField.options.join(', ')})</span>
                        )}
                    </div>
                </div>

                <div className="flex-1">
                    <label
                        htmlFor={`mapping-${targetField.id}`}
                        className="block text-xs font-medium text-gray-700 mb-1"
                    >
                        Map to extracted field:
                    </label>
                    <select
                        id={`mapping-${targetField.id}`}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                        value={selectedExtractedFieldId || ''}
                        onChange={handleChange}
                        disabled={isReadOnly}
                    >
                        <option value="">-- Select a field --</option>
                        {extractedFields.map((field) => (
                            <option key={field.id} value={field.id}>
                                {field.name} ({formatValuePreview(field.value)})
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {selectedField && (
                <div className="mt-3 p-3 bg-gray-50 rounded-md text-sm">
                    <div className="font-medium text-gray-700">Preview:</div>
                    <div className="mt-1 break-words">{selectedField.value}</div>
                </div>
            )}
        </div>
    );
};

// Helper to format value preview
const formatValuePreview = (value: string): string => {
    if (!value) return 'empty';
    if (value.length <= 20) return value;
    return `${value.substring(0, 20)}...`;
};

export default FieldMapper;