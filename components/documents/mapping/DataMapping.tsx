import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardContent, CardTitle, CardFooter } from '../../ui/Card';
import Button from '../../ui/Button';
import FieldMapper from './FieldMapper';
import MappingTemplate from './MappingTemplate';
import { useNotification } from '../../ui/Notification';

interface ExtractedField {
    id: string;
    name: string;
    value: string;
    confidence: number;
}

interface TargetSystem {
    id: string;
    name: string;
    fields: {
        id: string;
        name: string;
        description?: string;
        required: boolean;
        type: 'text' | 'number' | 'date' | 'boolean' | 'enum';
        options?: string[]; // For enum type
    }[];
}

interface Mapping {
    extractedFieldId: string | null;
    targetFieldId: string;
}

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

interface DataMappingProps {
    extractedFields: ExtractedField[];
    targetSystems: TargetSystem[];
    availableTemplates: TemplateMapping[];
    initialMappings?: Mapping[];
    documentId: string;
    onSave?: (mappings: Mapping[], targetSystemId: string) => Promise<void>;
    isReadOnly?: boolean;
}

const DataMapping: React.FC<DataMappingProps> = ({
    extractedFields,
    targetSystems,
    availableTemplates,
    initialMappings = [],
    documentId,
    onSave,
    isReadOnly = false,
}) => {
    const [selectedSystemId, setSelectedSystemId] = useState<string>(
        targetSystems.length > 0 ? targetSystems[0].id : ''
    );
    const [mappings, setMappings] = useState<Mapping[]>(initialMappings);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const { showNotification } = useNotification();

    // Get the selected target system
    const selectedSystem = targetSystems.find((system) => system.id === selectedSystemId);

    // Update mappings when target system changes
    useEffect(() => {
        if (selectedSystem) {
            // Keep existing mappings for fields that exist in the new system
            const existingMappings = mappings.filter((mapping) =>
                selectedSystem.fields.some((field) => field.id === mapping.targetFieldId)
            );

            // Add new mappings for fields that don't have mappings yet
            const newMappings: Mapping[] = selectedSystem.fields
                .filter(
                    (field) =>
                        !existingMappings.some((mapping) => mapping.targetFieldId === field.id)
                )
                .map((field) => ({
                    extractedFieldId: null,
                    targetFieldId: field.id,
                }));

            setMappings([...existingMappings, ...newMappings]);
        }
    }, [selectedSystemId, selectedSystem]);

    const handleSystemChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        if (isReadOnly) return;
        setSelectedSystemId(e.target.value);
    };

    const handleMappingChange = (targetFieldId: string, extractedFieldId: string | null) => {
        if (isReadOnly) return;

        setMappings((prev) =>
            prev.map((mapping) =>
                mapping.targetFieldId === targetFieldId
                    ? { ...mapping, extractedFieldId }
                    : mapping
            )
        );
    };

    const handleApplyTemplate = (template: TemplateMapping) => {
        if (isReadOnly || !selectedSystem) return;

        // Only apply template if it's for the current target system
        if (template.targetSystemId !== selectedSystemId) {
            showNotification({
                type: 'warning',
                title: 'Template Mismatch',
                message: `This template is for a different target system. Please select the correct system first.`,
            });
            return;
        }

        // Create a map of extracted field names to IDs for easier lookup
        const extractedFieldMap = new Map<string, string>();
        extractedFields.forEach((field) => {
            extractedFieldMap.set(field.name.toLowerCase(), field.id);
        });

        // Apply the template mappings
        const newMappings = [...mappings];

        template.mappings.forEach((templateMapping) => {
            // Find the extracted field ID by name (case insensitive)
            const extractedFieldId = extractedFieldMap.get(templateMapping.extractedFieldName.toLowerCase()) || null;

            // Update the existing mapping
            const mappingIndex = newMappings.findIndex(
                (m) => m.targetFieldId === templateMapping.targetFieldId
            );

            if (mappingIndex >= 0) {
                newMappings[mappingIndex].extractedFieldId = extractedFieldId;
            }
        });

        setMappings(newMappings);

        showNotification({
            type: 'success',
            title: 'Template Applied',
            message: `Template "${template.name}" has been applied successfully.`,
        });
    };

    const handleSave = async () => {
        if (!onSave || !selectedSystem) return;

        setIsLoading(true);
        try {
            await onSave(mappings, selectedSystemId);
            showNotification({
                type: 'success',
                title: 'Mappings Saved',
                message: 'Field mappings have been saved successfully.',
            });
        } catch (error) {
            showNotification({
                type: 'error',
                title: 'Error',
                message: 'Failed to save field mappings.',
            });
        } finally {
            setIsLoading(false);
        }
    };

    // Filter templates for the current target system
    const relevantTemplates = availableTemplates.filter(
        (template) => template.targetSystemId === selectedSystemId
    );

    if (!selectedSystem) {
        return (
            <Card>
                <CardContent className="py-12 text-center">
                    <p className="text-gray-500">No target systems available for mapping.</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                    <CardTitle>Data Mapping</CardTitle>
                    <div className="flex items-center space-x-2">
                        <label htmlFor="target-system" className="text-sm font-medium text-gray-700">
                            Target System:
                        </label>
                        <select
                            id="target-system"
                            className="block w-full max-w-xs rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                            value={selectedSystemId}
                            onChange={handleSystemChange}
                            disabled={isReadOnly}
                        >
                            {targetSystems.map((system) => (
                                <option key={system.id} value={system.id}>
                                    {system.name}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </CardHeader>

            <CardContent>
                {relevantTemplates.length > 0 && !isReadOnly && (
                    <div className="mb-6">
                        <h3 className="text-sm font-medium text-gray-700 mb-2">Apply Mapping Template</h3>
                        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                            {relevantTemplates.map((template) => (
                                <MappingTemplate
                                    key={template.id}
                                    template={template}
                                    onApply={() => handleApplyTemplate(template)}
                                />
                            ))}
                        </div>
                    </div>
                )}

                <div className="space-y-4">
                    <h3 className="text-sm font-medium text-gray-700">Field Mappings</h3>

                    {selectedSystem.fields.map((targetField) => {
                        const mapping = mappings.find((m) => m.targetFieldId === targetField.id);

                        return (
                            <FieldMapper
                                key={targetField.id}
                                targetField={targetField}
                                extractedFields={extractedFields}
                                selectedExtractedFieldId={mapping?.extractedFieldId || null}
                                onChange={(extractedFieldId) => handleMappingChange(targetField.id, extractedFieldId)}
                                isReadOnly={isReadOnly}
                            />
                        );
                    })}
                </div>
            </CardContent>

            {!isReadOnly && (
                <CardFooter className="flex justify-end">
                    <Button
                        onClick={handleSave}
                        disabled={isLoading}
                        isLoading={isLoading}
                    >
                        Save Mappings
                    </Button>
                </CardFooter>
            )}
        </Card>
    );
};

export default DataMapping;