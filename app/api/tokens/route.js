import { db } from '@/lib/firebase-admin';
import { verifyIdToken } from '@/lib/firebase-admin';

export async function GET(req) {
    try {
        const token = req.headers.get('authorization')?.split('Bearer ')[1];
        const decodedToken = await verifyIdToken(token);

        if (!decodedToken) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get query parameters
        const { searchParams } = new URL(req.url);
        const domainId = searchParams.get('domainId');
        const platform = searchParams.get('platform');

        // Build query - get ALL tokens, not filtered by userId
        let query = db.collection('push_tokens');

        if (domainId && domainId !== 'all') {
            query = query.where('domainId', '==', domainId);
        }

        if (platform && platform !== 'all') {
            query = query.where('platform', '==', platform);
        }

        // Execute query
        const snapshot = await query.orderBy('createdAt', 'desc').get();

        const tokens = snapshot.docs.map(doc => {
            const data = doc.data();
            console.log('[API] Token data from Firestore:', {
                id: doc.id,
                ip: data.ip,
                country: data.country,
                country_code: data.country_code,
                ua: data.ua,
                lang: data.lang
            });

            return {
                id: doc.id,
                ...data,
                createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
                lastActive: data.lastActive?.toDate?.()?.toISOString() || null,
            };
        });

        return Response.json({
            tokens,
            total: tokens.length
        });
    } catch (error) {
        console.error('[API] Get tokens error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
}
