import { ExtractedField } from '../../../types/extraction';
import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';
import * as csv from 'fast-csv';

/**
 * Spreadsheet extraction strategy for Excel, CSV, and other tabular data formats
 */
export const spreadsheetStrategy = {
    /**
     * Check if this strategy supports the given file type
     * @param fileType The file type
     * @param extension The file extension
     * @returns True if supported, false otherwise
     */
    supportsFileType(fileType: string, extension: string): boolean {
        return fileType === 'spreadsheet' ||
            ['.csv', '.xls', '.xlsx', '.xlsm', '.ods'].includes(extension.toLowerCase());
    },

    /**
     * Extract data from a spreadsheet file
     * @param filePath Path to the spreadsheet file
     * @returns Array of extracted fields
     */
    async extractData(filePath: string): Promise<ExtractedField[]> {
        try {
            const extension = path.extname(filePath).toLowerCase();

            // Handle CSV files differently from Excel files
            if (extension === '.csv') {
                return await this.extractFromCSV(filePath);
            } else {
                return await this.extractFromExcel(filePath);
            }
        } catch (error) {
            console.error('Spreadsheet extraction error:', error);
            throw new Error(`Failed to extract data from spreadsheet: ${(error as Error).message}`);
        }
    },

    /**
     * Extract data from a CSV file
     * @param filePath Path to the CSV file
     * @returns Array of extracted fields
     */
    async extractFromCSV(filePath: string): Promise<ExtractedField[]> {
        return new Promise((resolve, reject) => {
            const rows: any[] = [];

            fs.createReadStream(filePath)
                .pipe(csv.parse({ headers: true }))
                .on('data', (row) => rows.push(row))
                .on('error', (error) => reject(error))
                .on('end', () => {
                    try {
                        const fields = this.processSpreadsheetData(rows);
                        resolve(fields);
                    } catch (e) {
                        reject(e);
                    }
                });
        });
    },

    /**
     * Extract data from an Excel file
     * @param filePath Path to the Excel file
     * @returns Array of extracted fields
     */
    async extractFromExcel(filePath: string): Promise<ExtractedField[]> {
        // Read the Excel file
        const workbook = XLSX.readFile(filePath, { raw: true });

        // Get the first sheet
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        // Convert to JSON
        const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        // Process headers and data
        if (rows.length < 2) {
            return []; // Not enough data
        }

        // Create proper objects with headers as keys
        const headers = rows[0] as string[];
        const data = rows.slice(1).map(row => {
            const obj: Record<string, any> = {};
            (row as any[]).forEach((cell, i) => {
                if (i < headers.length && headers[i]) {
                    obj[headers[i]] = cell;
                }
            });
            return obj;
        });

        return this.processSpreadsheetData(data);
    },

    /**
     * Process spreadsheet data to extract fields
     * @param data The data rows from the spreadsheet
     * @returns Array of extracted fields
     */
    processSpreadsheetData(data: any[]): ExtractedField[] {
        if (!data || data.length === 0) {
            return [];
        }

        const extractedFields: ExtractedField[] = [];

        // Get all column headers
        const headers = Object.keys(data[0]);

        // Process each column
        headers.forEach(header => {
            // Skip empty headers
            if (!header || header.trim() === '') {
                return;
            }

            // Get all values for this column
            const values = data.map(row => row[header]).filter(Boolean);

            // Skip columns with no data
            if (values.length === 0) {
                return;
            }

            // Determine best representative value
            const value = this.determineRepresentativeValue(values, header);

            // Calculate confidence based on data consistency
            const confidence = this.calculateValueConfidence(values, header);

            // Add to extracted fields
            extractedFields.push({
                name: header,
                value: String(value),
                confidence,
                id: '',
                extractedDataId: ''
            });
        });

        // Extract overall metadata
        this.extractMetadata(data, extractedFields);

        return extractedFields;
    },

    /**
     * Determine the most representative value for a column
     * @param values Array of values from the column
     * @param header The column header
     * @returns Representative value
     */
    determineRepresentativeValue(values: any[], header: string): any {
        const headerLower = header.toLowerCase();

        // For certain fields, use the first non-empty value
        if (
            headerLower.includes('id') ||
            headerLower.includes('number') ||
            headerLower.includes('date') ||
            headerLower.includes('name')
        ) {
            return values[0];
        }

        // For amount fields, use sum if numbers
        if (
            headerLower.includes('amount') ||
            headerLower.includes('total') ||
            headerLower.includes('price') ||
            headerLower.includes('cost') ||
            headerLower.includes('value')
        ) {
            // Check if all values are numbers
            const numbers = values.map(v => parseFloat(String(v))).filter(n => !isNaN(n));
            if (numbers.length === values.length) {
                // Calculate sum
                const sum = numbers.reduce((a, b) => a + b, 0);
                return sum.toFixed(2);
            }
        }

        // Default: use first value
        return values[0];
    },

    /**
     * Calculate confidence score for a column
     * @param values Array of values from the column
     * @param header The column header
     * @returns Confidence score (0-1)
     */
    calculateValueConfidence(values: any[], header: string): number {
        if (values.length === 0) return 0;

        const headerLower = header.toLowerCase();
        let baseConfidence = 0.7; // Default confidence

        // Increase confidence for important fields
        if (
            headerLower.includes('total') ||
            headerLower.includes('amount') ||
            headerLower.includes('invoice') ||
            headerLower.includes('date') ||
            headerLower.includes('customer') ||
            headerLower.includes('vendor') ||
            headerLower.includes('id')
        ) {
            baseConfidence = 0.85;
        }

        // Adjust based on data consistency
        const nonEmptyValues = values.filter(v => v !== null && v !== undefined && String(v).trim() !== '');
        const consistencyFactor = nonEmptyValues.length / values.length;

        // For numeric fields, check if all values are numbers
        if (
            headerLower.includes('amount') ||
            headerLower.includes('price') ||
            headerLower.includes('cost') ||
            headerLower.includes('total')
        ) {
            const validNumbers = values.filter(v => !isNaN(parseFloat(String(v))));
            const numberConsistency = validNumbers.length / values.length;
            return baseConfidence * (consistencyFactor * 0.5 + numberConsistency * 0.5);
        }

        // For dates, check format consistency
        if (headerLower.includes('date')) {
            // Simple date format check (more sophisticated checks could be implemented)
            const datePattern = /^\d{1,4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,4}$/;
            const validDates = values.filter(v => datePattern.test(String(v)));
            const dateConsistency = validDates.length / values.length;
            return baseConfidence * (consistencyFactor * 0.5 + dateConsistency * 0.5);
        }

        return baseConfidence * consistencyFactor;
    },

    /**
     * Extract metadata from spreadsheet data
     * @param data The data rows
     * @param extractedFields Array to add metadata fields to
     */
    extractMetadata(data: any[], extractedFields: ExtractedField[]): void {
        // Add row count as metadata
        extractedFields.push({
            name: '_metadata_row_count',
            value: String(data.length),
            confidence: 1.0,
            id: '',
            extractedDataId: ''
        });

        // Try to identify what type of document this is
        const documentType = this.identifyDocumentType(data, extractedFields);
        if (documentType) {
            extractedFields.push({
                name: 'Document Type',
                value: documentType,
                confidence: 0.8,
                id: '',
                extractedDataId: ''
            });
        }

        // Extract summary data if possible
        this.extractSummaryData(data, extractedFields);
    },

    /**
     * Attempt to identify the type of document
     * @param data The data rows
     * @param extractedFields Current extracted fields
     * @returns Identified document type or undefined
     */
    identifyDocumentType(data: any[], extractedFields: ExtractedField[]): string | undefined {
        // Get all headers
        const headers = Object.keys(data[0]).map(h => h.toLowerCase());

        // Check for invoice
        if (
            headers.some(h => h.includes('invoice')) ||
            (headers.some(h => h.includes('total')) && headers.some(h => h.includes('item')))
        ) {
            return 'Invoice';
        }

        // Check for expense report
        if (
            headers.some(h => h.includes('expense')) ||
            headers.some(h => h.includes('claim'))
        ) {
            return 'Expense Report';
        }

        // Check for purchase order
        if (
            headers.some(h => h.includes('order')) ||
            headers.some(h => h.includes('purchase'))
        ) {
            return 'Purchase Order';
        }

        // Check for inventory
        if (
            headers.some(h => h.includes('inventory')) ||
            headers.some(h => h.includes('stock')) ||
            headers.some(h => h.includes('quantity'))
        ) {
            return 'Inventory';
        }

        return undefined;
    },

    /**
     * Extract summary data from the spreadsheet
     * @param data The data rows
     * @param extractedFields Array to add summary fields to
     */
    extractSummaryData(data: any[], extractedFields: ExtractedField[]): void {
        // Find numeric columns
        const headers = Object.keys(data[0]);
        headers.forEach(header => {
            const headerLower = header.toLowerCase();

            // Look for amount/total columns
            if (
                headerLower.includes('amount') ||
                headerLower.includes('total') ||
                headerLower.includes('price') ||
                headerLower.includes('cost')
            ) {
                const values = data.map(row => parseFloat(String(row[header]))).filter(n => !isNaN(n));

                if (values.length > 0) {
                    // Calculate sum
                    const sum = values.reduce((a, b) => a + b, 0);

                    // Add summary field
                    extractedFields.push({
                        name: `Sum of ${header}`,
                        value: sum.toFixed(2),
                        confidence: 0.85,
                        id: '',
                        extractedDataId: ''
                    });

                    // If looks like monetary amounts, add grand total
                    if (
                        headerLower.includes('total') ||
                        headerLower.includes('amount')
                    ) {
                        const existingTotal = extractedFields.find(f => f.name === 'Grand Total');
                        if (!existingTotal) {
                            extractedFields.push({
                                name: 'Grand Total',
                                value: sum.toFixed(2),
                                confidence: 0.8,
                                id: '',
                                extractedDataId: ''
                            });
                        }
                    }
                }
            }
        });
    }
};