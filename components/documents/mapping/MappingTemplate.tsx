import React from 'react';
import Button from '../../ui/Button';

interface TemplateMapping {
    id: string;
    name: string;
    description?: string;
    targetSystemId: string;
    mappings: {
        extractedFieldName: string;
        targetFieldId: string;
    }[];
}

interface MappingTemplateProps {
    template: TemplateMapping;
    onApply?: () => void;
}

const MappingTemplate: React.FC<MappingTemplateProps> = ({
    template,
    onApply,
}) => {
    const handleApply = () => {
        if (onApply) {
            onApply();
        }
    };

    return (
        <div className="border border-gray-200 rounded-lg p-4 bg-white hover:shadow-md transition-shadow">
            <h4 className="text-sm font-medium text-gray-900">{template.name}</h4>
            {template.description && (
                <p className="mt-1 text-xs text-gray-500">{template.description}</p>
            )}
            <div className="mt-2 text-xs text-gray-500">
                {template.mappings.length} field mapping{template.mappings.length !== 1 ? 's' : ''}
            </div>
            <div className="mt-3">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={handleApply}
                >
                    Apply Template
                </Button>
            </div>
        </div>
    );
};

export default MappingTemplate;