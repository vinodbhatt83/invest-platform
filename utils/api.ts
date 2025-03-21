// utils/api.ts
export class ApiError extends Error {
    statusCode: number;

    constructor(statusCode: number, message: string) {
        super(message);
        this.statusCode = statusCode;
        this.name = 'ApiError';
    }
}

export const fetchAPI = async (
    url: string,
    options: RequestInit = {}
): Promise<any> => {
    const response = await fetch(url, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...options.headers,
        },
    });

    const data = await response.json();

    if (!response.ok) {
        throw new ApiError(response.status, data.error || 'Something went wrong');
    }

    return data;
};

export const apiRoutes = {
    documents: {
        list: '/api/documents',
        create: '/api/documents',
        get: (id: string) => `/api/documents/${id}`,
        update: (id: string) => `/api/documents/${id}`,
        delete: (id: string) => `/api/documents/${id}`,
        upload: '/api/documents/upload',
        process: '/api/documents/process',
        extraction: (id: string) => `/api/documents/${id}/extracted-data`,
        mapping: (id: string) => `/api/documents/${id}/map`,
    },
    auth: {
        login: '/api/auth/signin',
        logout: '/api/auth/signout',
        register: '/api/auth/register',
    },
};