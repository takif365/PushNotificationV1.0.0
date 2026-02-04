// Firebase Push Notification System - Unified Service Worker (v10.1 - Robust & Data-Only)
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// 1. Configuration & Caching (Best Practices)
const SW_VERSION = 'v1.0.1';
const CACHE_NAME = `app-cache-${SW_VERSION}`;
const OPTIONAL_ASSETS = [
    '/icon.png',
    '/badge.png'
];

// 2. Install - Robust Caching (Promise.allSettled)
self.addEventListener('install', (event) => {
    console.log(`[SW ${SW_VERSION}] Installing...`);
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return Promise.allSettled(
                OPTIONAL_ASSETS.map(url =>
                    cache.add(url).catch(err => {
                        console.warn(`[SW] Failed to cache ${url}:`, err.message);
                        return null;
                    })
                )
            );
        }).then(() => {
            console.log(`[SW ${SW_VERSION}] Installed successfully`);
            return self.skipWaiting();
        })
    );
});

// 3. Activate - Cleanup
self.addEventListener('activate', (event) => {
    console.log(`[SW ${SW_VERSION}] Activating...`);
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
    apiKey: "AIzaSyB0grieksKtM28Q8sDqRJtIlCiVOa4O2TI",
    authDomain: "{{NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN}}",
    projectId: "{{NEXT_PUBLIC_FIREBASE_PROJECT_ID}}",
    messagingSenderId: "{{NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID}}",
    appId: "{{NEXT_PUBLIC_FIREBASE_APP_ID}}"
});

const messaging = firebase.messaging();

// 5. Background Message Handler (Data-Only Strict)
messaging.onBackgroundMessage((payload) => {
    // STRICT: Only read from data.
    const title = payload.data?.title || "New Message";
    const body = payload.data?.body || "";
    const clickUrl = payload.data?.url || "/"; // STRICT: URL from data
    const icon = payload.data?.icon || '/icon.png';

    return self.registration.showNotification(title, {
        body: body,
        icon: icon,
        badge: '/badge.png',
        data: { url: clickUrl }, // Pass URL to notification data
        tag: 'pns-campaign-unique',
        renotify: true
    });
});

// 6. Notification Click Handler (Strict)
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    // STRICT: Fetch URL from data.url
    const url = event.notification.data?.url || '/';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
            // STRICT: Open Window directly
            if (clients.openWindow) return clients.openWindow(url);
        })
    );
});

// 7. Error Handling
self.addEventListener('error', (event) => {
    console.error('[SW] Error:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
    console.error('[SW] Unhandled rejection:', event.reason);
});
