import { dataExtractor } from './dataExtractor';
import { confidenceScoring } from './confidenceScoring';
import { ExtractedField } from '../../types/extraction';
import path from 'path';
import axios from 'axios';
import { Readable } from 'stream';
import * as fs from 'fs';
import * as os from 'os';

// Import strategies
import { pdfStrategy } from './extractionStrategies/pdfStrategy';
import { spreadsheetStrategy } from './extractionStrategies/spreadsheetStrategy';
import { imageStrategy } from './extractionStrategies/imageStrategy';

// Define extraction strategy interface
interface ExtractionStrategy {
    extractData(filePath: string): Promise<ExtractedField[]>;
    supportsFileType(fileType: string, extension: string): boolean;
}

// Configure extraction strategies
const extractionStrategies: ExtractionStrategy[] = [
    pdfStrategy,
    spreadsheetStrategy,
    imageStrategy,
];

/**
 * Document parser for extracting data from documents
 */
export const documentParser = {
    /**
     * Parse document and extract data
     * @param fileUrl The URL of the file to parse
     * @param fileType The type of file (e.g., pdf, image, spreadsheet)
     * @returns Object containing extracted fields and overall confidence score
     */
    async parseDocument(fileUrl: string, fileType: string): Promise<{
        fields: ExtractedField[];
        confidence: number;
    }> {
        try {
            // Download file to temp location
            const filePath = await this.downloadFile(fileUrl);

            try {
                // Get file extension
                const extension = path.extname(fileUrl).toLowerCase();

                // Find appropriate extraction strategy
                const strategy = this.getExtractionStrategy(fileType, extension);

                if (!strategy) {
                    throw new Error(`No extraction strategy available for file type: ${fileType}`);
                }

                // Extract raw fields using the strategy
                const extractedFields = await strategy.extractData(filePath);

                // Process extracted fields through data extractor for additional refinement
                const processedFields = await dataExtractor.processFields(extractedFields, fileType);

                // Calculate overall confidence score
                const confidence = confidenceScoring.calculateOverallConfidence(processedFields);

                return {
                    fields: processedFields,
                    confidence,
                };
            } finally {
                // Clean up temp file
                this.cleanupTempFile(filePath);
            }
        } catch (error) {
            console.error('Document parsing error:', error);
            throw new Error(`Failed to parse document: ${(error as Error).message}`);
        }
    },

    /**
     * Get the appropriate extraction strategy for the file type
     * @param fileType The type of file
     * @param extension The file extension
     * @returns Extraction strategy or null if none found
     */
    getExtractionStrategy(fileType: string, extension: string): ExtractionStrategy | null {
        return extractionStrategies.find(strategy =>
            strategy.supportsFileType(fileType, extension)
        ) || null;
    },

    /**
     * Download file from URL to temp location
     * @param fileUrl The URL of the file to download
     * @returns Path to the downloaded temp file
     */
    async downloadFile(fileUrl: string): Promise<string> {
        try {
            const response = await axios({
                method: 'GET',
                url: fileUrl,
                responseType: 'stream',
            });

            // Create temp file path
            const tempDir = os.tmpdir();
            const tempFilePath = path.join(tempDir, `doc-${Date.now()}-${Math.random().toString(36).substring(2, 10)}${path.extname(fileUrl)}`);

            // Save stream to file
            const writer = fs.createWriteStream(tempFilePath);

            return new Promise<string>((resolve, reject) => {
                response.data.pipe(writer);

                writer.on('finish', () => {
                    resolve(tempFilePath);
                });

                writer.on('error', (err) => {
                    reject(new Error(`Failed to download file: ${err.message}`));
                });
            });
        } catch (error) {
            throw new Error(`Failed to download file: ${(error as Error).message}`);
        }
    },

    /**
     * Clean up temporary file
     * @param filePath Path to the temporary file
     */
    cleanupTempFile(filePath: string): void {
        try {
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        } catch (error) {
            console.error('Failed to delete temp file:', error);
            // Don't throw, just log the error
        }
    }
};