import { ExtractedField } from '../../types/extraction';

/**
 * Service for calculating confidence scores for extracted data
 */
export const confidenceScoring = {
    /**
     * Calculate the overall confidence score for a set of extracted fields
     * @param fields The extracted fields
     * @returns A confidence score between 0 and 1
     */
    calculateOverallConfidence(fields: ExtractedField[]): number {
        if (fields.length === 0) {
            return 0;
        }

        // Calculate the weighted average confidence score
        let totalWeight = 0;
        let weightedSum = 0;

        for (const field of fields) {
            // Determine field weight based on importance
            const weight = this.getFieldWeight(field);

            // Calculate confidence score for this field
            const fieldConfidence = field.confidence;

            weightedSum += fieldConfidence * weight;
            totalWeight += weight;
        }

        // Return the weighted average, ensuring it's between 0 and 1
        return Math.min(1, Math.max(0, weightedSum / totalWeight));
    },

    /**
     * Calculate confidence score for an individual field
     * @param field The extracted field
     * @returns A confidence score between 0 and 1
     */
    calculateFieldConfidence(field: ExtractedField): number {
        let score = field.confidence || 0;

        // Adjust confidence based on field content quality
        const contentQualityScore = this.assessContentQuality(field);

        // Combine the original confidence with content quality assessment
        // Using a weighted average (70% original confidence, 30% content quality)
        score = 0.7 * score + 0.3 * contentQualityScore;

        // Ensure the score is between 0 and 1
        return Math.min(1, Math.max(0, score));
    },

    /**
     * Get the importance weight for a field based on its name
     * @param field The extracted field
     * @returns A weight value (higher = more important)
     */
    getFieldWeight(field: ExtractedField): number {
        const name = field.name.toLowerCase();

        // High importance fields (weight = 2.0)
        if (
            name.includes('total') ||
            name.includes('amount') ||
            name.includes('invoice') ||
            name.includes('date') ||
            name.includes('customer') ||
            name.includes('vendor') ||
            name.includes('id')
        ) {
            return 2.0;
        }

        // Medium importance fields (weight = 1.5)
        if (
            name.includes('address') ||
            name.includes('email') ||
            name.includes('phone') ||
            name.includes('tax') ||
            name.includes('description')
        ) {
            return 1.5;
        }

        // Default weight for all other fields
        return 1.0;
    },

    /**
     * Assess the quality of field content based on expected patterns and validation
     * @param field The extracted field
     * @returns A quality score between 0 and 1
     */
    assessContentQuality(field: ExtractedField): number {
        const name = field.name.toLowerCase();
        const value = field.value;

        // Empty values get a low score
        if (!value || value.trim() === '') {
            return 0.1;
        }

        // Check for expected patterns based on field name
        if (name.includes('email')) {
            // Basic email validation
            return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value) ? 0.95 : 0.3;
        }

        if (name.includes('phone')) {
            // Basic phone number validation (at least 7 digits)
            return /\d{7,}/.test(value.replace(/\D/g, '')) ? 0.9 : 0.4;
        }

        if (name.includes('date')) {
            // Basic date validation
            return /\d{1,4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,4}/.test(value) ||
                /\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4}/i.test(value) ?
                0.9 : 0.4;
        }

        if (name.includes('amount') || name.includes('total') || name.includes('price')) {
            // Numeric validation for amounts
            return /^[\$£€]?\s*\d+(?:,\d{3})*(?:\.\d{2})?$/.test(value) ? 0.95 : 0.3;
        }

        if (name.includes('zip') || name.includes('postal')) {
            // Basic postal code validation
            return /^\d{5}(?:-\d{4})?$/.test(value) || // US
                /^[A-Z]\d[A-Z]\s*\d[A-Z]\d$/.test(value) ? // Canada
                0.9 : 0.5;
        }

        // For fields with expected content length
        if (value.length > 100 && (name.includes('description') || name.includes('notes'))) {
            return 0.8; // Long text in description fields is good
        }

        if (value.length < 3 && !name.includes('id') && !name.includes('code')) {
            return 0.4; // Very short values for non-id fields are suspect
        }

        // Default quality score based on content length and variety
        const lengthScore = Math.min(1, value.length / 20); // Max score at 20+ chars
        const varietyScore = this.calculateVarietyScore(value);

        return (lengthScore * 0.6) + (varietyScore * 0.4);
    },

    /**
     * Calculate a score based on the variety of characters in a string
     * Higher variety suggests more information-rich content
     * @param value The string to analyze
     * @returns A score between 0 and 1
     */
    calculateVarietyScore(value: string): number {
        if (!value || value.length === 0) return 0;

        // Count unique characters
        const uniqueChars = new Set(value.split('')).size;

        // Calculate variety as a ratio of unique characters to length
        // with a bonus for moderate-length strings
        const lengthFactor = Math.min(1, value.length / 15); // Max at 15+ chars
        const variety = uniqueChars / Math.min(value.length, 20); // Cap at 20 to avoid penalizing long text

        return variety * lengthFactor;
    }
};