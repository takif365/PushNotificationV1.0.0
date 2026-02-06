/**
 * Generate a custom Service Worker for a specific domain
 * This allows tracking which domain each notification comes from
 */
export function generateServiceWorker(domain, firebaseConfig) {
    return `
// ============================================================================
// Auto-generated Service Worker for: ${domain.name}
// Domain ID: ${domain.id}
// Generated: ${new Date().toISOString()}
// ============================================================================

importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// 1. Configuration & Caching (Best Practices)
const SW_VERSION = 'v1.0.1';
const CACHE_NAME = 'app-cache-' + SW_VERSION;
const OPTIONAL_ASSETS = ['/icon.png', '/badge.png'];

// 2. Install - Robust Caching (Promise.allSettled)
self.addEventListener('install', (event) => {
    console.log('[SW] Installing for ' + '${domain.name}');
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return Promise.allSettled(
                OPTIONAL_ASSETS.map(url => 
                    cache.add(url).catch(err => {
                        console.warn('[SW] Failed to cache ' + url);
                        return null;
                    })
                )
            );
        }).then(() => self.skipWaiting())
    );
});

// 3. Activate - Cleanup
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// 4. Firebase Initialization
firebase.initializeApp({
    apiKey: "${firebaseConfig.apiKey}",
    authDomain: "${firebaseConfig.authDomain}",
    projectId: "${firebaseConfig.projectId}",
    storageBucket: "${firebaseConfig.storageBucket}",
    messagingSenderId: "${firebaseConfig.messagingSenderId}",
    appId: "${firebaseConfig.appId}"
});

const messaging = firebase.messaging();

// 5. Background Message Handler (Data-Only Strict)
messaging.onBackgroundMessage((payload) => {
    // STRICT: Only read from data.
    const title = payload.data?.title || "New Message";
    const body = payload.data?.body || "";
    const clickUrl = payload.data?.url || "/";
    const icon = payload.data?.icon || '/icon.png';

    return self.registration.showNotification(title, {
        body: body,
        icon: icon,
        badge: '/badge.png',
        data: { url: clickUrl },
        tag: 'pns-campaign-unique',
        renotify: true
    });
});

// 6. Notification Click Handler (Strict)
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    // STRICT: Fetch URL from data.url
    const url = event.notification.data?.url || '/';
    const campaignId = event.notification.data?.campaignId;

    const promiseChain = Promise.all([
        // 1. Track Click (Fire & Forget)
        campaignId ? fetch('/api/track-click', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ campaignId })
        }).catch(err => console.error('[SW] Track click failed:', err)) : Promise.resolve(),

        // 2. Open Window
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
            // STRICT: Open Window directly
            if (clients.openWindow) return clients.openWindow(url);
        })
    ]);

    event.waitUntil(promiseChain);
});

// 7. Error Handling
self.addEventListener('error', (event) => { console.error('[SW] Error:', event.error); });
self.addEventListener('unhandledrejection', (event) => { console.error('[SW] Unhandled rejection:', event.reason); });
    `.trim();
}
