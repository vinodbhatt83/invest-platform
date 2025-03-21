import { queueService } from '../../lib/queue';
import prisma from '../../lib/prisma';
import { documentParser } from '../extraction/documentParser';

/**
 * Worker service for processing document jobs in the background
 */
export const workerService = {
    /**
     * Initialize the worker service
     */
    init() {
        // Set up document processing handler
        queueService.setupDocumentProcessor(this.processDocument.bind(this));

        // Set up queue event handlers
        queueService.setupQueueHandlers('document-processing', {
            completed: (job, result) => {
                console.log(`Document processing completed for job ${job.id}: ${result}`);
            },
            failed: (job, error) => {
                console.error(`Document processing failed for job ${job.id}: ${error.message}`);
                this.handleFailedJob(job.data.documentId, error.message).catch(console.error);
            },
        });
    },

    /**
     * Process a document extraction job
     * @param job The document job to process
     * @returns Processing result
     */
    async processDocument(job: any) {
        const { documentId } = job.data;
        console.log(`Processing document ${documentId}`);

        try {
            // Get document from database
            const document = await prisma.document.findUnique({
                where: { id: documentId },
            });

            if (!document) {
                throw new Error(`Document ${documentId} not found`);
            }

            // Update document status to processing if it's not already
            if (document.status !== 'processing') {
                await prisma.document.update({
                    where: { id: documentId },
                    data: { status: 'processing' },
                });
            }

            // Check if there's an existing extracted data record
            let extractedData = await prisma.extractedData.findFirst({
                where: { documentId },
            });

            if (!extractedData) {
                // Create a new extracted data record if none exists
                extractedData = await prisma.extractedData.create({
                    data: {
                        documentId,
                        status: 'processing',
                        confidence: 0,
                    },
                });
            } else if (extractedData.status !== 'processing') {
                // Update existing record status
                await prisma.extractedData.update({
                    where: { id: extractedData.id },
                    data: { status: 'processing' },
                });
            }

            // Process the document using the document parser
            const { fields, confidence } = await documentParser.parseDocument(
                document.fileUrl,
                document.fileType
            );

            // Update the extracted data with parsed fields
            await prisma.extractedData.update({
                where: { id: extractedData.id },
                data: {
                    status: 'completed',
                    confidence,
                    updatedAt: new Date(),
                },
            });

            // Delete any existing fields and create new ones
            await prisma.extractedField.deleteMany({
                where: { extractedDataId: extractedData.id },
            });

            // Create extracted fields in batches to avoid query size limits
            const batchSize = 50;
            for (let i = 0; i < fields.length; i += batchSize) {
                const batch = fields.slice(i, i + batchSize);
                await prisma.extractedField.createMany({
                    data: batch.map(field => ({
                        extractedDataId: extractedData!.id,
                        name: field.name,
                        value: field.value,
                        confidence: field.confidence,
                        isValid: true, // Initially set all fields as valid
                    })),
                });
            }

            // Update document status to completed
            await prisma.document.update({
                where: { id: documentId },
                data: {
                    status: 'completed',
                    updatedAt: new Date(),
                },
            });

            return {
                documentId,
                status: 'completed',
                fieldsCount: fields.length,
            };
        } catch (error) {
            console.error(`Error processing document ${documentId}:`, error);
            // Update document and extraction status to failed
            await this.handleFailedJob(documentId, (error as Error).message);
            throw error;
        }
    },

    /**
     * Handle a failed job by updating statuses
     * @param documentId The document ID
     * @param errorMessage The error message
     */
    async handleFailedJob(documentId: string, errorMessage: string): Promise<void> {
        try {
            // Update document status
            await prisma.document.update({
                where: { id: documentId },
                data: {
                    status: 'failed',
                    updatedAt: new Date(),
                },
            });

            // Update extracted data if it exists
            const extractedData = await prisma.extractedData.findFirst({
                where: { documentId },
            });

            if (extractedData) {
                await prisma.extractedData.update({
                    where: { id: extractedData.id },
                    data: {
                        status: 'failed',
                        error: errorMessage,
                        updatedAt: new Date(),
                    },
                });
            }
        } catch (err) {
            console.error('Error handling failed job:', err);
        }
    },
};

export default workerService;