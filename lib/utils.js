/**
 * Validate push subscription data
 */
export function validateSubscription(endpoint, keys) {
    if (!endpoint || typeof endpoint !== 'string') {
        return { valid: false, error: 'Valid endpoint is required' };
    }

    if (!endpoint.startsWith('https://')) {
        return { valid: false, error: 'Endpoint must start with https://' };
    }

    if (!keys || !keys.p256dh || !keys.auth) {
        return { valid: false, error: 'Encryption keys are required' };
    }

    if (keys.p256dh.length < 80 || keys.auth.length < 20) {
        return { valid: false, error: 'Invalid encryption key format' };
    }

    return { valid: true };
}

/**
 * Sanitize user input
 */
export function sanitizeInput(input) {
    if (typeof input !== 'string') return '';

    return input
        .trim()
        .replace(/[<>]/g, '') // Remove angle brackets
        .substring(0, 2000); // Limit length
}

/**
 * Verify API key
 */
export function verifyApiKey(providedKey) {
    const validKey = process.env.API_SECRET_KEY;

    if (!validKey) {
        console.warn('API_SECRET_KEY not configured');
        return true; // Allow if not configured (dev mode)
    }

    return providedKey === validKey;
}

/**
 * Generate random ID
 */
export function generateId() {
    return crypto.randomUUID();
}

/**
 * Format timestamp for display
 */
export function formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    return new Intl.DateTimeFormat('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
    }).format(date);
}

/**
 * Chunk array into smaller arrays
 */
export function chunkArray(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
        chunks.push(array.slice(i, i + size));
    }
    return chunks;
}

/**
 * Sleep/delay function
 */
export function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry function with exponential backoff
 */
export async function retry(fn, maxAttempts = 3, baseDelay = 1000) {
    let lastError;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;

            if (attempt < maxAttempts - 1) {
                const delay = baseDelay * Math.pow(2, attempt);
                await sleep(delay);
            }
        }
    }

    throw lastError;
}
