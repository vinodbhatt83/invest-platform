// utils/dates.ts
export const formatDate = (
    date: Date | string | number,
    format: 'short' | 'medium' | 'long' = 'medium',
    locale: string = 'en-US'
): string => {
    if (!date) return '';

    const dateObj = typeof date === 'string' || typeof date === 'number'
        ? new Date(date)
        : date;

    const options: Intl.DateTimeFormatOptions = {
        year: 'numeric',
        month: format === 'short' ? 'numeric' : 'long',
        day: 'numeric'
    };

    return new Intl.DateTimeFormat(locale, options).format(dateObj);
};

export const formatDateTime = (
    date: Date | string | number,
    format: 'short' | 'medium' | 'long' = 'medium',
    locale: string = 'en-US'
): string => {
    if (!date) return '';

    const dateObj = typeof date === 'string' || typeof date === 'number'
        ? new Date(date)
        : date;

    const options: Intl.DateTimeFormatOptions = {
        year: 'numeric',
        month: format === 'short' ? 'numeric' : 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric'
    };

    return new Intl.DateTimeFormat(locale, options).format(dateObj);
};

export const getRelativeTime = (date: Date | string | number): string => {
    const dateObj = typeof date === 'string' || typeof date === 'number'
        ? new Date(date)
        : date;

    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - dateObj.getTime()) / 1000);

    if (diffInSeconds < 60) {
        return diffInSeconds === 1 ? '1 second ago' : `${diffInSeconds} seconds ago`;
    }

    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) {
        return diffInMinutes === 1 ? '1 minute ago' : `${diffInMinutes} minutes ago`;
    }

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
        return diffInHours === 1 ? '1 hour ago' : `${diffInHours} hours ago`;
    }

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 30) {
        return diffInDays === 1 ? '1 day ago' : `${diffInDays} days ago`;
    }

    const diffInMonths = Math.floor(diffInDays / 30);
    if (diffInMonths < 12) {
        return diffInMonths === 1 ? '1 month ago' : `${diffInMonths} months ago`;
    }

    const diffInYears = Math.floor(diffInMonths / 12);
    return diffInYears === 1 ? '1 year ago' : `${diffInYears} years ago`;
};

export const addDays = (date: Date, days: number): Date => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
};

export const isDateInPast = (date: Date | string | number): boolean => {
    const dateObj = typeof date === 'string' || typeof date === 'number'
        ? new Date(date)
        : date;

    return dateObj < new Date();
};