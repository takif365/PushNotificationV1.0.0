import { db } from '@/lib/firebase-admin';
import { verifyIdToken } from '@/lib/firebase-admin';

// GET: List campaigns
export async function GET(req) {
    try {
        const token = req.headers.get('authorization')?.split('Bearer ')[1];
        const decodedToken = await verifyIdToken(token);

        if (!decodedToken) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get ALL campaigns (No orderBy to prevent excluding docs missing createdAt)
        const campaignsSnapshot = await db.collection('campaigns').get();

        const campaigns = campaignsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || doc.data().createdAt || null,
            sentAt: doc.data().sentAt?.toDate?.()?.toISOString() || doc.data().sentAt || null,
            scheduledAt: doc.data().scheduledAt?.toDate?.()?.toISOString() || doc.data().scheduledAt || null
        }));

        // Sort in memory (safe)
        campaigns.sort((a, b) => {
            const dateA = new Date(a.createdAt || 0).getTime();
            const dateB = new Date(b.createdAt || 0).getTime();
            return dateB - dateA;
        });

        return Response.json({ campaigns });
    } catch (error) {
        console.error('[API] Get campaigns error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
}

// POST: Create campaign
export async function POST(req) {
    try {
        const token = req.headers.get('authorization')?.split('Bearer ')[1];
        const decodedToken = await verifyIdToken(token);

        if (!decodedToken) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { title, message: bodyText, icon, actionUrl, targeting } = body;

        if (!title || !bodyText) {
            return Response.json({ error: 'Title and message are required' }, { status: 400 });
        }

        const campaignRef = body.id ? db.collection('campaigns').doc(body.id) : db.collection('campaigns').doc();

        const campaignData = {
            id: campaignRef.id,
            userId: decodedToken.uid,
            title,
            body: bodyText,
            icon: icon || null,
            actionUrl: actionUrl || '/',
            targeting: {
                domainId: targeting?.domainId || 'all',
                platform: targeting?.platform || 'all'
            },
            status: body.status || 'draft',
            createdAt: new Date(),
            scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : null,
            stats: {
                totalSent: 0,
                totalFailed: 0
            }
        };

        await campaignRef.set(campaignData);

        return Response.json({
            success: true,
            campaign: {
                ...campaignData,
                createdAt: campaignData.createdAt.toISOString()
            }
        });
    } catch (error) {
        console.error('[API] Create campaign error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
}
