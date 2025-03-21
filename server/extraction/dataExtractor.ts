import { ExtractedField } from '../../types/extraction';
import { confidenceScoring } from './confidenceScoring';

/**
 * Service for extracting and processing data from raw document content
 */
export const dataExtractor = {
    /**
     * Process extracted fields, normalizing data and improving extraction quality
     * @param fields Raw extracted fields from document
     * @param fileType Type of document (pdf, image, spreadsheet)
     * @returns Processed and normalized fields
     */
    async processFields(
        fields: ExtractedField[],
        fileType: string
    ): Promise<ExtractedField[]> {
        try {
            // Apply type-specific processing
            let processedFields = [...fields];

            switch (fileType) {
                case 'pdf':
                    processedFields = await this.processPdfFields(processedFields);
                    break;
                case 'image':
                    processedFields = await this.processImageFields(processedFields);
                    break;
                case 'spreadsheet':
                    processedFields = await this.processSpreadsheetFields(processedFields);
                    break;
                default:
                    // Default processing for other file types
                    break;
            }

            // Apply common processing to all fields
            processedFields = await this.applyCommonProcessing(processedFields);

            // Recalculate confidence scores
            processedFields = processedFields.map(field => ({
                ...field,
                confidence: confidenceScoring.calculateFieldConfidence(field),
            }));

            return processedFields;
        } catch (error) {
            console.error('Error processing fields:', error);
            // Return original fields if processing fails
            return fields;
        }
    },

    /**
     * Process fields extracted from PDF documents
     * @param fields Raw extracted fields
     * @returns Processed fields
     */
    async processPdfFields(fields: ExtractedField[]): Promise<ExtractedField[]> {
        // Apply PDF-specific processing rules
        return fields.map(field => {
            let processedValue = field.value;

            // Remove common PDF artifacts
            processedValue = processedValue.replace(/\s{2,}/g, ' ').trim(); // Remove extra spaces
            processedValue = processedValue.replace(/\r\n|\r|\n/g, ' '); // Normalize line breaks

            // Identify and improve key fields based on patterns or field names
            if (field.name.toLowerCase().includes('date')) {
                processedValue = this.normalizeDateFormat(processedValue);
            }

            if (field.name.toLowerCase().includes('amount') ||
                field.name.toLowerCase().includes('total') ||
                field.name.toLowerCase().includes('price')) {
                processedValue = this.normalizeAmountFormat(processedValue);
            }

            return {
                ...field,
                value: processedValue,
            };
        });
    },

    /**
     * Process fields extracted from image documents
     * @param fields Raw extracted fields
     * @returns Processed fields
     */
    async processImageFields(fields: ExtractedField[]): Promise<ExtractedField[]> {
        // Apply image-specific processing rules
        return fields.map(field => {
            let processedValue = field.value;

            // Correct common OCR errors
            processedValue = processedValue.replace(/0/g, 'O'); // Often confused
            processedValue = processedValue.replace(/1/g, 'I'); // Often confused
            processedValue = processedValue.replace(/\$/g, 'S'); // Often confused

            // Apply field-specific corrections
            if (field.name.toLowerCase().includes('email')) {
                processedValue = this.normalizeEmail(processedValue);
            }

            if (field.name.toLowerCase().includes('phone')) {
                processedValue = this.normalizePhoneNumber(processedValue);
            }

            return {
                ...field,
                value: processedValue,
            };
        });
    },

    /**
     * Process fields extracted from spreadsheet documents
     * @param fields Raw extracted fields
     * @returns Processed fields
     */
    async processSpreadsheetFields(fields: ExtractedField[]): Promise<ExtractedField[]> {
        // Apply spreadsheet-specific processing rules
        return fields.map(field => {
            let processedValue = field.value;

            // Handle spreadsheet-specific formatting issues
            processedValue = processedValue.replace(/^=['"](.+)['"]$/, '$1'); // Remove formula quotes
            processedValue = processedValue.replace(/^=/, ''); // Remove formula prefix

            // Normalize numerical data
            if (field.name.toLowerCase().includes('amount') ||
                field.name.toLowerCase().includes('total') ||
                field.name.toLowerCase().includes('price')) {
                processedValue = this.normalizeAmountFormat(processedValue);
            }

            return {
                ...field,
                value: processedValue,
            };
        });
    },

    /**
     * Apply common processing to all fields regardless of document type
     * @param fields Extracted fields
     * @returns Processed fields
     */
    async applyCommonProcessing(fields: ExtractedField[]): Promise<ExtractedField[]> {
        return fields.map(field => {
            let processedValue = field.value;

            // Basic cleanup
            processedValue = processedValue.trim();

            // Remove control characters
            processedValue = processedValue.replace(/[\x00-\x1F\x7F]/g, '');

            // Handle common data types based on field name hints
            if (field.name.toLowerCase().includes('email')) {
                processedValue = this.normalizeEmail(processedValue);
            } else if (field.name.toLowerCase().includes('phone')) {
                processedValue = this.normalizePhoneNumber(processedValue);
            } else if (field.name.toLowerCase().includes('date')) {
                processedValue = this.normalizeDateFormat(processedValue);
            } else if (/amount|price|total|cost|fee|tax|sum/i.test(field.name)) {
                processedValue = this.normalizeAmountFormat(processedValue);
            } else if (/address|street|city|state|zip|postal/i.test(field.name)) {
                processedValue = this.normalizeAddress(processedValue);
            } else if (/name|customer|client|vendor|supplier/i.test(field.name)) {
                processedValue = this.normalizeName(processedValue);
            }

            return {
                ...field,
                value: processedValue,
            };
        });
    },

    /**
     * Normalize email address format
     * @param value Raw email value
     * @returns Normalized email
     */
    normalizeEmail(value: string): string {
        // Basic email normalization
        let email = value.toLowerCase().trim();

        // Remove any spaces
        email = email.replace(/\s+/g, '');

        // Add basic validation - if it doesn't have @ or looks invalid, return original
        if (!email.includes('@') || !/^[^@]+@[^@]+\.[^@]+$/.test(email)) {
            return value; // Return original if it doesn't look like a valid email
        }

        return email;
    },

    /**
     * Normalize phone number format
     * @param value Raw phone number value
     * @returns Normalized phone number
     */
    normalizePhoneNumber(value: string): string {
        // Extract only digits
        const digits = value.replace(/\D/g, '');

        // Format based on digit count (assuming US numbers, but can be extended)
        if (digits.length === 10) {
            // Format as (XXX) XXX-XXXX
            return `(${digits.substring(0, 3)}) ${digits.substring(3, 6)}-${digits.substring(6)}`;
        } else if (digits.length === 11 && digits[0] === '1') {
            // Format as 1-XXX-XXX-XXXX (US with country code)
            return `1-${digits.substring(1, 4)}-${digits.substring(4, 7)}-${digits.substring(7)}`;
        }

        // If we can't normalize it well, return the original
        return value;
    },

    /**
     * Normalize date format
     * @param value Raw date value
     * @returns Normalized date in YYYY-MM-DD format when possible
     */
    normalizeDateFormat(value: string): string {
        // Try to parse as a date
        const dateValue = value.trim();

        // Common date formats to try
        const dateFormats = [
            // MM/DD/YYYY
            {
                regex: /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
                formatter: (match: RegExpMatchArray) => `${match[3]}-${match[1].padStart(2, '0')}-${match[2].padStart(2, '0')}`
            },
            // DD/MM/YYYY
            {
                regex: /^(\d{1,2})-(\d{1,2})-(\d{4})$/,
                formatter: (match: RegExpMatchArray) => `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`
            },
            // Month Name DD, YYYY
            {
                regex: /^([A-Za-z]+)\s+(\d{1,2})(?:,|\s+)?\s*(\d{4})$/,
                formatter: (match: RegExpMatchArray) => {
                    const months: Record<string, string> = {
                        'january': '01', 'february': '02', 'march': '03', 'april': '04',
                        'may': '05', 'june': '06', 'july': '07', 'august': '08',
                        'september': '09', 'october': '10', 'november': '11', 'december': '12',
                        'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04',
                        'jun': '06', 'jul': '07', 'aug': '08', 'sep': '09',
                        'oct': '10', 'nov': '11', 'dec': '12'
                    };
                    const month = months[match[1].toLowerCase()];
                    return month ? `${match[3]}-${month}-${match[2].padStart(2, '0')}` : match[0];
                }
            }
        ];

        // Try each format
        for (const format of dateFormats) {
            const match = dateValue.match(format.regex);
            if (match) {
                return format.formatter(match);
            }
        }

        // If we can't parse it, return the original
        return dateValue;
    },

    /**
     * Normalize monetary amount format
     * @param value Raw amount value
     * @returns Normalized amount
     */
    normalizeAmountFormat(value: string): string {
        // Strip currency symbols and other non-numeric chars except decimal points
        let amount = value.replace(/[^0-9.-]/g, '');

        // Ensure there's only one decimal point
        const decimalPoints = amount.match(/\./g);
        if (decimalPoints && decimalPoints.length > 1) {
            // If multiple decimal points, keep the first one and remove others
            const parts = amount.split('.');
            amount = parts[0] + '.' + parts.slice(1).join('');
        }

        // Try to parse as a number and format with 2 decimal places
        try {
            const numAmount = parseFloat(amount);
            if (!isNaN(numAmount)) {
                return numAmount.toFixed(2);
            }
        } catch (e) {
            // If parsing fails, return the cleaned string
        }

        return amount;
    },

    /**
     * Normalize address format
     * @param value Raw address value
     * @returns Normalized address
     */
    normalizeAddress(value: string): string {
        // Basic address normalization
        let address = value.trim();

        // Replace multiple spaces with a single space
        address = address.replace(/\s{2,}/g, ' ');

        // Ensure proper capitalization for common address elements
        address = address.replace(/\b(street|st|avenue|ave|road|rd|boulevard|blvd|drive|dr|lane|ln|court|ct|plaza|plz|square|sq)\b/gi,
            match => match.charAt(0).toUpperCase() + match.slice(1).toLowerCase());

        // Uppercase state abbreviations
        address = address.replace(/\b([a-z]{2})\b/g, match => match.toUpperCase());

        return address;
    },

    /**
     * Normalize name format
     * @param value Raw name value
     * @returns Normalized name
     */
    normalizeName(value: string): string {
        // Basic name normalization - proper case for each word
        return value.trim()
            .toLowerCase()
            .replace(/\b\w/g, char => char.toUpperCase());
    }
};