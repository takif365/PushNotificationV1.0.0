import { db } from '@/lib/firebase-admin';
import { verifyIdToken } from '@/lib/firebase-admin';
import { generateServiceWorker } from '@/lib/generate-sw';
import { generateSnippet } from '@/lib/generate-snippet';

export const dynamic = 'force-dynamic';

// GET: List all domains
export async function GET(req) {
    try {
        const token = req.headers.get('authorization')?.split('Bearer ')[1];
        const decodedToken = await verifyIdToken(token);

        if (!decodedToken) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get ALL domains
        const domainsSnapshot = await db.collection('domains')
            .orderBy('createdAt', 'desc')
            .get();

        const domains = await Promise.all(domainsSnapshot.docs.map(async (doc) => {
            const data = doc.data();

            // Count subscribers for this domain
            const subscribersSnapshot = await db.collection('push_tokens')
                .where('domainId', '==', doc.id)
                .count()
                .get();

            return {
                id: doc.id,
                ...data,
                subscriberCount: subscribersSnapshot.data().count,
                createdAt: data.createdAt?.toDate?.()?.toISOString() || null
            };
        }));

        return Response.json({ domains });
    } catch (error) {
        console.error('[API] Get domains error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
}

// POST: Create new domain
export async function POST(req) {
    try {
        const token = req.headers.get('authorization')?.split('Bearer ')[1];
        const decodedToken = await verifyIdToken(token);

        if (!decodedToken) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { domain, name, description } = body;

        if (!domain) {
            return Response.json({ error: 'Domain is required' }, { status: 400 });
        }

        // Normalize domain to lowercase for comparison
        const normalizedDomain = domain.toLowerCase();

        // Check if domain already exists for this user (case-insensitive)
        const existingDomains = await db.collection('domains')
            .where('userId', '==', decodedToken.uid)
            .get();

        const domainExists = existingDomains.docs.some(doc => {
            const existingDomain = doc.data().domain || doc.data().name;
            return existingDomain.toLowerCase() === normalizedDomain;
        });

        if (domainExists) {
            return Response.json({
                error: 'This domain is already registered in your account'
            }, { status: 400 });
        }

        // Create domain document
        const domainRef = db.collection('domains').doc();
        const domainId = domainRef.id;

        const firebaseConfig = {
            apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
            authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
            projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
            storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
            messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
            appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
        };

        const domainData = {
            id: domainId,
            userId: decodedToken.uid,
            domain,
            name: name || domain,
            description: description || '',
            createdAt: new Date(),
            isActive: true,
            status: 'active',
            stats: {
                totalSubscribers: 0,
                activeSubscribers: 0,
                lastUpdated: new Date()
            }
        };

        // Generate Service Worker code
        const serviceWorkerCode = generateServiceWorker(domainData, firebaseConfig);

        // Generate snippet code
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        const snippetCode = generateSnippet(domainData, baseUrl);

        domainData.serviceWorkerCode = serviceWorkerCode;
        domainData.snippetCode = snippetCode;
        domainData.serviceWorkerUrl = `${baseUrl}/api/sw/${domainId}`;

        await domainRef.set(domainData);

        return Response.json({
            success: true,
            domain: {
                ...domainData,
                createdAt: domainData.createdAt.toISOString()
            }
        });
    } catch (error) {
        console.error('[API] Create domain error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
}
