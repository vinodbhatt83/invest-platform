import { ExtractedField } from '../../../types/extraction';
import * as pdfjsLib from 'pdfjs-dist';
import * as fs from 'fs';

// Load PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = '../../node_modules/pdfjs-dist/build/pdf.worker.js';

/**
 * PDF extraction strategy
 */
export const pdfStrategy = {
    /**
     * Check if this strategy supports the given file type
     * @param fileType The file type
     * @param extension The file extension
     * @returns True if supported, false otherwise
     */
    supportsFileType(fileType: string, extension: string): boolean {
        return fileType === 'pdf' || extension === '.pdf';
    },

    /**
     * Extract data from a PDF file
     * @param filePath Path to the PDF file
     * @returns Array of extracted fields
     */
    async extractData(filePath: string): Promise<ExtractedField[]> {
        try {
            // Read the file as a buffer
            const data = fs.readFileSync(filePath);

            // Load PDF document
            const pdf = await pdfjsLib.getDocument({ data }).promise;

            // Extract text content from all pages
            const textContent = await this.extractTextFromPDF(pdf);

            // Process text content to extract structured fields
            const fields = await this.processTextContent(textContent);

            return fields;
        } catch (error) {
            console.error('PDF extraction error:', error);
            throw new Error(`Failed to extract data from PDF: ${(error as Error).message}`);
        }
    },

    /**
     * Extract text content from all pages of a PDF
     * @param pdf The PDF document
     * @returns Combined text content
     */
    async extractTextFromPDF(pdf: pdfjsLib.PDFDocumentProxy): Promise<string[]> {
        const pageTexts: string[] = [];

        // Process each page
        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
            const page = await pdf.getPage(pageNum);
            const textContent = await page.getTextContent();

            // Extract text from each item
            const pageText = textContent.items.map(item => {
                // TextItem has a 'str' property with the text
                return 'str' in item ? item.str : '';
            }).join(' ');

            pageTexts.push(pageText);
        }

        return pageTexts;
    },

    /**
     * Process extracted text content to identify fields
     * @param textContent Array of text content from each page
     * @returns Array of extracted fields
     */
    async processTextContent(textContent: string[]): Promise<ExtractedField[]> {
        const extractedFields: ExtractedField[] = [];
        const allText = textContent.join('\n');

        // Extract common invoice/document fields using regex patterns

        // Invoice Number
        const invoiceNumberMatch = allText.match(/(?:invoice|bill|receipt)(?:\s+|\s*[:#]\s*)(?:number|num|no|#)?\s*[:#]?\s*(\w+[-\s]?\w+)/i);
        if (invoiceNumberMatch) {
            extractedFields.push({
                name: 'Invoice Number',
                value: invoiceNumberMatch[1].trim(),
                confidence: 0.85,
                id: '',
                extractedDataId: ''
            });
        }

        // Invoice Date
        const dateMatch = allText.match(/(?:invoice|bill|receipt|order|date)(?:\s+|\s*[:#]\s*)(?:date|issued|created)?\s*[:#]?\s*(\d{1,2}[-/\.]\d{1,2}[-/\.]\d{2,4}|\d{2,4}[-/\.]\d{1,2}[-/\.]\d{1,2}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2}(?:,|\s+)\s*\d{2,4})/i);
        if (dateMatch) {
            extractedFields.push({
                name: 'Date',
                value: dateMatch[1].trim(),
                confidence: 0.9,
                id: '',
                extractedDataId: ''
            });
        }

        // Total Amount
        const totalMatch = allText.match(/(?:total|amount|sum|balance|due)(?:\s+|\s*[:#]\s*)(?:due|amount|payable)?\s*[:#]?\s*([$€£]?\s*\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/i);
        if (totalMatch) {
            extractedFields.push({
                name: 'Total Amount',
                value: totalMatch[1].trim(),
                confidence: 0.9,
                id: '',
                extractedDataId: ''
            });
        }

        // Customer/Vendor Name
        const nameMatch = allText.match(/(?:customer|client|vendor|supplier|bill to|sold to)(?:\s+|\s*[:#]\s*)(?:name|company)?\s*[:#]?\s*([A-Za-z0-9\s.,&'-]{2,40}?)(?:\r|\n|,)/i);
        if (nameMatch) {
            extractedFields.push({
                name: 'Customer Name',
                value: nameMatch[1].trim(),
                confidence: 0.75,
                id: '',
                extractedDataId: ''
            });
        }

        // Look for tables of line items
        const tables = this.extractTables(allText);
        if (tables.length > 0) {
            extractedFields.push({
                name: 'Line Items',
                value: JSON.stringify(tables),
                confidence: 0.7,
                id: '',
                extractedDataId: ''
            });
        }

        // Extract key-value pairs from the text
        const keyValuePairs = await this.extractKeyValuePairs(allText);

        // Add key-value pairs that don't overlap with already extracted fields
        for (const [key, value] of Object.entries(keyValuePairs)) {
            // Skip if we already have this field (avoid duplicates)
            const normalizedKey = key.toLowerCase().replace(/\s+/g, '');
            const existingField = extractedFields.find(f =>
                f.name.toLowerCase().replace(/\s+/g, '') === normalizedKey
            );

            if (!existingField && value && (value as string).trim()) {
                extractedFields.push({
                    name: key,
                    value: (value as string).trim(),
                    confidence: 0.7,
                    id: '',
                    extractedDataId: ''
                });
            }
        }

        return extractedFields;
    },

    /**
     * Extract key-value pairs from text using pattern matching
     * @param text The text to extract from
     * @returns Object with key-value pairs
     */
    async extractKeyValuePairs(text: string): Promise<Record<string, string>> {
        const result: Record<string, string> = {};

        // Split text into lines
        const lines = text.split(/\r?\n/);

        // Look for patterns like "Key: Value" or "Key - Value"
        for (const line of lines) {
            // Check for standard key-value separator patterns
            const match = line.match(/^\s*([A-Za-z\s&]{2,25}?)(?:\s*[:|-]\s*|\s{2,})(.+)$/);
            if (match) {
                const key = match[1].trim();
                const value = match[2].trim();

                // Only keep if the key looks reasonable (not too long, not just one letter)
                if (key.length > 1 && key.length < 25 && value) {
                    result[key] = value;
                }
            }
        }

        return result;
    },

    /**
     * Extract tables from text content
     * @param text The text to extract tables from
     * @returns Array of extracted tables
     */
    extractTables(text: string): Array<{ headers: string[], rows: string[][] }> {
        const tables: Array<{ headers: string[], rows: string[][] }> = [];

        // Split into lines
        const lines = text.split(/\r?\n/);

        // Simple algorithm to detect tables: look for consistent patterns of
        // multiple space-separated or tab-separated columns
        let currentTable: string[][] = [];
        let tableHeaders: string[] = [];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            // Split by multiple spaces or tabs
            const columns = line.split(/\s{2,}|\t/).filter(Boolean);

            // If we have multiple columns, it might be a table row
            if (columns.length >= 3) {
                // If this is the first row with multiple columns, it might be headers
                if (currentTable.length === 0) {
                    tableHeaders = columns;
                } else {
                    // Check if column count matches the header
                    if (columns.length === tableHeaders.length) {
                        currentTable.push(columns);
                    }
                }
            } else {
                // Not a table row, if we have a table in progress, finish it
                if (currentTable.length > 0) {
                    tables.push({
                        headers: tableHeaders,
                        rows: currentTable
                    });
                    currentTable = [];
                    tableHeaders = [];
                }
            }
        }

        // Add the last table if any
        if (currentTable.length > 0) {
            tables.push({
                headers: tableHeaders,
                rows: currentTable
            });
        }

        return tables;
    }
};