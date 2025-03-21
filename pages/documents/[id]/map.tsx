import React, { useState } from 'react';
import { GetServerSideProps } from 'next';
import { getSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Layout from '../../../components/layout/Layout';
import DataMapping from '../../../components/documents/mapping/DataMapping';
import { Card, CardHeader, CardContent, CardTitle } from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import { useNotification } from '../../../components/ui/Notification';

interface ExtractedField {
    id: string;
    name: string;
    value: string;
    confidence: number;
}

interface TargetSystem {
    id: string;
    name: string;
    description?: string;
    fields: {
        id: string;
        name: string;
        description?: string;
        required: boolean;
        type: 'text' | 'number' | 'date' | 'boolean' | 'enum';
        options?: string[];
    }[];
}

interface Mapping {
    extractedFieldId: string | null;
    targetFieldId: string;
}

interface MappingTemplate {
    id: string;
    name: string;
    description?: string;
    targetSystemId: string;
    mappings: {
        extractedFieldName: string;
        targetFieldId: string;
    }[];
}

interface DocumentMapPageProps {
    documentId: string;
    documentName: string;
    extractedFields: ExtractedField[];
    targetSystems: TargetSystem[];
    mappingTemplates: MappingTemplate[];
    existingMappings: {
        targetSystemId: string;
        fields: Mapping[];
    }[];
}

export default function DocumentMapPage({
    documentId,
    documentName,
    extractedFields,
    targetSystems,
    mappingTemplates,
    existingMappings,
}: DocumentMapPageProps) {
    const router = useRouter();
    const { showNotification } = useNotification();
    const [isSaving, setIsSaving] = useState<boolean>(false);
    const [selectedSystemId, setSelectedSystemId] = useState<string>(
        existingMappings.length > 0
            ? existingMappings[0].targetSystemId
            : targetSystems.length > 0
                ? targetSystems[0].id
                : ''
    );

    // Get initial mappings for the selected system
    const getInitialMappings = () => {
        const systemMapping = existingMappings.find(
            (mapping) => mapping.targetSystemId === selectedSystemId
        );
        return systemMapping ? systemMapping.fields : [];
    };

    const handleSaveMapping = async (mappings: Mapping[], targetSystemId: string) => {
        setIsSaving(true);
        try {
            // Check if mapping exists for this system
            const existingMapping = existingMappings.find(
                (mapping) => mapping.targetSystemId === targetSystemId
            );

            const url = `/api/documents/${documentId}/map`;
            const method = existingMapping ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    targetSystemId,
                    fields: mappings,
                }),
            });

            if (!response.ok) throw new Error('Failed to save mapping');

            showNotification({
                type: 'success',
                title: 'Success',
                message: 'Mapping saved successfully',
            });

            return Promise.resolve();
        } catch (error) {
            console.error('Error saving mapping:', error);
            showNotification({
                type: 'error',
                title: 'Error',
                message: 'Failed to save mapping',
            });
            return Promise.reject(error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleSystemChange = (systemId: string) => {
        setSelectedSystemId(systemId);
    };

    return (
        <Layout title={`${documentName} | Map Data | INVEST Platform`}>
            <div className="space-y-6">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Map Data</h1>
                        <p className="mt-1 text-sm text-gray-500">{documentName}</p>
                    </div>
                    <div className="flex space-x-2">
                        <Button
                            variant="secondary"
                            onClick={() => router.push(`/documents/${documentId}`)}
                        >
                            Back to Document
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2">
                        <DataMapping
                            extractedFields={extractedFields}
                            targetSystems={targetSystems}
                            availableTemplates={mappingTemplates}
                            initialMappings={getInitialMappings()}
                            documentId={documentId}
                            onSave={handleSaveMapping}
                        />
                    </div>
                    <div>
                        <Card>
                            <CardHeader>
                                <CardTitle>Mapping Information</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <div>
                                        <h3 className="text-sm font-medium text-gray-700">What is Data Mapping?</h3>
                                        <p className="mt-1 text-sm text-gray-500">
                                            Data mapping connects extracted document data to your target systems, making it available for further processing or integration.
                                        </p>
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-medium text-gray-700">How to Map Data</h3>
                                        <ol className="mt-1 text-sm text-gray-500 space-y-2 list-decimal list-inside pl-2">
                                            <li>Select a target system from the dropdown</li>
                                            <li>For each target field, select a corresponding extracted field</li>
                                            <li>Apply a template if available to quickly map common fields</li>
                                            <li>Click "Save Mappings" when finished</li>
                                        </ol>
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-medium text-gray-700">Mapping Templates</h3>
                                        <p className="mt-1 text-sm text-gray-500">
                                            Mapping templates allow you to save and reuse common mapping patterns across similar documents.
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="mt-6">
                            <CardHeader>
                                <CardTitle>Available Target Systems</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {targetSystems.map((system) => (
                                        <div
                                            key={system.id}
                                            className={`p-3 rounded-lg border cursor-pointer ${selectedSystemId === system.id
                                                    ? 'border-blue-500 bg-blue-50'
                                                    : 'border-gray-200 hover:bg-gray-50'
                                                }`}
                                            onClick={() => handleSystemChange(system.id)}
                                        >
                                            <h3 className="text-sm font-medium text-gray-900">{system.name}</h3>
                                            {system.description && (
                                                <p className="mt-1 text-xs text-gray-500">{system.description}</p>
                                            )}
                                            <div className="mt-2 text-xs text-gray-500">
                                                {system.fields.length} fields available
                                            </div>
                                            {existingMappings.some((mapping) => mapping.targetSystemId === system.id) && (
                                                <div className="mt-1 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                                    Mapped
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </Layout>
    );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
    const session = await getSession(context);

    if (!session) {
        return {
            redirect: {
                destination: '/api/auth/signin',
                permanent: false,
            },
        };
    }

    const { id } = context.params as { id: string };

    try {
        // Fetch document to get basic info and extracted data
        const documentResponse = await fetch(`${process.env.NEXTAUTH_URL}/api/documents/${id}`, {
            headers: {
                Cookie: context.req.headers.cookie || '',
            },
        });

        if (!documentResponse.ok) {
            throw new Error(`Failed to fetch document: ${documentResponse.status}`);
        }

        const { document } = await documentResponse.json();

        // If extraction data doesn't exist yet or is not completed, redirect to document page
        if (!document.extractedData || document.extractedData.status !== 'completed') {
            return {
                redirect: {
                    destination: `/documents/${id}`,
                    permanent: false,
                },
            };
        }

        // Fetch mapping data (target systems, templates, existing mappings)
        const mappingResponse = await fetch(`${process.env.NEXTAUTH_URL}/api/documents/${id}/map`, {
            headers: {
                Cookie: context.req.headers.cookie || '',
            },
        });

        if (!mappingResponse.ok) {
            throw new Error(`Failed to fetch mapping data: ${mappingResponse.status}`);
        }

        const { mappings, targetSystems, mappingTemplates } = await mappingResponse.json();

        // Prepare existing mappings data structure
        const existingMappings = mappings.map((mapping: any) => ({
            targetSystemId: mapping.targetSystemId,
            fields: mapping.fields.map((field: any) => ({
                targetFieldId: field.targetFieldId,
                extractedFieldId: field.extractedFieldId,
            })),
        }));

        return {
            props: {
                documentId: document.id,
                documentName: document.name,
                extractedFields: document.extractedData.fields || [],
                targetSystems,
                mappingTemplates,
                existingMappings,
            },
        };
    } catch (error) {
        console.error('Error fetching data for mapping page:', error);

        return {
            notFound: true,
        };
    }
};