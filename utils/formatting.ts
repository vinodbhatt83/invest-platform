// utils/formatting.ts
export const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const formatCurrency = (
    amount: number,
    currency: string = 'USD',
    locale: string = 'en-US'
): string => {
    return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
    }).format(amount);
};

export const formatPercentage = (
    value: number,
    decimals: number = 2,
    includeSymbol: boolean = true
): string => {
    const formatted = (value * 100).toFixed(decimals);
    return includeSymbol ? `${formatted}%` : formatted;
};

export const truncateText = (
    text: string,
    maxLength: number,
    ellipsis: string = '...'
): string => {
    if (!text || text.length <= maxLength) return text;
    return text.slice(0, maxLength) + ellipsis;
};

export const formatPhoneNumber = (
    phoneNumber: string,
    format: 'national' | 'international' = 'national'
): string => {
    // Simple formatting for US numbers
    if (!phoneNumber) return '';

    // Remove all non-digits
    const cleaned = phoneNumber.replace(/\D/g, '');

    if (format === 'national' && cleaned.length === 10) {
        return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`;
    } else if (format === 'international' && cleaned.length === 10) {
        return `+1 ${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6, 10)}`;
    }

    return phoneNumber;
};