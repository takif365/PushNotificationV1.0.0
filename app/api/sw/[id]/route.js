import { db } from '@/lib/firebase-admin';
import { generateServiceWorker } from '@/lib/generate-sw';

// GET: Serve domain-specific service worker
export async function GET(req, { params }) {
    try {
        const { id } = params;

        const domainDoc = await db.collection('domains').doc(id).get();

        if (!domainDoc.exists) {
            return new Response('Service Worker not found', { status: 404 });
        }

        const domainData = domainDoc.data();

        // Generate Fresh SW Code (Ensures updates propagate instantly)
        const firebaseConfig = {
            apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
            authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
            projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
            storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
            messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
            appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
        };

        const serviceWorkerCode = generateServiceWorker({ ...domainData, id: domainDoc.id }, firebaseConfig);

        return new Response(serviceWorkerCode, {
            headers: {
                'Content-Type': 'application/javascript',
                'Service-Worker-Allowed': '/',
                'Cache-Control': 'no-cache'
            }
        });
    } catch (error) {
        console.error('[API] Service Worker error:', error);
        return new Response('Internal Server Error', { status: 500 });
    }
}
