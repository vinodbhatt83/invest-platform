import jwt from 'jsonwebtoken';

// Get JWT secret from environment variables
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// User type for token payload
export type UserTokenPayload = {
    id: number;
    email: string;
    name: string;
    role: string;
};

// Generate JWT token
export const generateToken = (user: UserTokenPayload): string => {
    return jwt.sign(
        {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
        },
        JWT_SECRET,
        {
            expiresIn: JWT_EXPIRES_IN,
        }
    );
};

// Verify and decode JWT token
export const verifyToken = (token: string): UserTokenPayload | null => {
    try {
        return jwt.verify(token, JWT_SECRET) as UserTokenPayload;
    } catch (error) {
        console.error('JWT verification failed:', error);
        return null;
    }
};

// Parse token from Authorization header
export const parseToken = (authHeader: string | undefined): string | null => {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
    }

    return authHeader.substring(7); // Remove 'Bearer ' prefix
};

export default {
    generateToken,
    verifyToken,
    parseToken,
};