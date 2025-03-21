// lib/validation.ts
import { z } from 'zod';

// lib/validation.ts - Update this function to be more forgiving with types
export const validateSchema = <T>(schema: z.ZodType<any, any, any>, data: any): { success: true; data: T } | { success: false; error: string } => {
    try {
        const result = schema.parse(data);
        return { success: true, data: result as T };
    } catch (error) {
        if (error instanceof z.ZodError) {
            return {
                success: false,
                error: error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', '),
            };
        }
        return {
            success: false,
            error: 'Unknown validation error',
        };
    }
};

// Common validation schemas
export const emailSchema = z.string().email('Invalid email address');

export const passwordSchema = z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/\d/, 'Password must contain at least one number');

export const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format');

export const uuidSchema = z.string().uuid('Invalid UUID format');

export const positiveNumberSchema = z.number().positive('Must be a positive number');

// Helper function to safely parse dates
export const parseDate = (dateString: string): Date | null => {
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? null : date;
};