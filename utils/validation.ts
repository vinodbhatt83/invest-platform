// utils/validation.ts
import { z, ZodType } from 'zod';

export function validateSchema<Output, Input = Output>(
    schema: ZodType<Output, z.ZodTypeDef, Input>,
    data: Input
) {
    try {
        const result = schema.parse(data);
        return { success: true as const, data: result };
    } catch (error) {
        if (error instanceof z.ZodError) {
            return {
                success: false as const,
                error: error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
            };
        }
        return { success: false as const, error: 'Validation failed' };
    }
}

export const validateEmail = (email: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

export const validatePassword = (password: string): { valid: boolean; message?: string } => {
    if (password.length < 8) {
        return { valid: false, message: 'Password must be at least 8 characters' };
    }

    // Check for at least one uppercase letter
    if (!/[A-Z]/.test(password)) {
        return { valid: false, message: 'Password must contain at least one uppercase letter' };
    }

    // Check for at least one number
    if (!/\d/.test(password)) {
        return { valid: false, message: 'Password must contain at least one number' };
    }

    return { valid: true };
};

export const validateUrl = (url: string): boolean => {
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
};

export const validatePhone = (phone: string): boolean => {
    // Basic validation for 10-digit numbers (US format)
    return /^\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/.test(phone);
};