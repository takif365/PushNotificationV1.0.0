export const NOTIFICATION_DEFAULTS = {
    icon: '/icon.png',
    badge: '/badge.png',
    dir: 'ltr',
    lang: 'en',
    requireInteraction: false,
    vibrate: [200, 100, 200],
};

export const ERROR_MESSAGES = {
    PERMISSION_DENIED: 'Notification permission denied',
    NOT_SUPPORTED: 'Browser does not support notifications',
    REGISTRATION_FAILED: 'Service Worker registration failed',
    SUBSCRIPTION_FAILED: 'Push subscription failed',
    NETWORK_ERROR: 'Network connection error',
};

export const RATE_LIMITS = {
    SUBSCRIBE: { limit: 5, window: 3600 },
    SEND: { limit: 1000, window: 3600 },
    TRACK: { limit: 100, window: 60 },
};

export const BATCH_CONFIG = {
    SIZE: 100,
    CONCURRENT: 5,
    DELAY_MS: 100,
    MAX_RETRIES: 2,
};

export const DATABASE_CONFIG = {
    MAX_FAILED_ATTEMPTS: 3,
    LOG_RETENTION_DAYS: 30,
    CLEANUP_INTERVAL_HOURS: 24,
};
