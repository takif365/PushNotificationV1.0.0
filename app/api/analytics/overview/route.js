import { db, verifyIdToken } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

export async function GET(req) {
    try {
        const token = req.headers.get('authorization')?.split('Bearer ')[1];

        if (!token) {
            return Response.json({ error: 'Unauthorized: No token provided' }, { status: 401 });
        }

        const decodedToken = await verifyIdToken(token);

        if (!decodedToken) {
            return Response.json({ error: 'Unauthorized: Invalid token' }, { status: 401 });
        }

        if (!db) {
            console.error('[API] Database not initialized');
            throw new Error('Database connection failed');
        }

        // Get all collections data
        const [domainsSnapshot, tokensSnapshot, campaignsSnapshot, globalStatsSnapshot] = await Promise.all([
            db.collection('domains').get(),
            db.collection('push_tokens').get(),
            db.collection('campaigns').get(),
            db.collection('stats').doc('global').get()
        ]);

        // Count statistics
        const totalDomains = domainsSnapshot.size;
        const totalSubscribers = tokensSnapshot.size;
        const totalCampaigns = campaignsSnapshot.size;

        // GLOBAL PERSISTENT STATS
        const globalStats = globalStatsSnapshot.exists ? globalStatsSnapshot.data() : {};
        const totalClicks = globalStats.totalClicks || 0;
        const totalReach = globalStats.totalReach || 0;

        // Calculate click rate (Global CTR)
        const clickRate = totalReach > 0
            ? ((totalClicks / totalReach) * 100).toFixed(1)
            : 0;

        // Calculate new subscribers (last 24h)
        const now = new Date();
        const yesterday = new Date(now.getTime() - (24 * 60 * 60 * 1000));
        let newSubscribers24h = 0;

        tokensSnapshot.docs.forEach(doc => {
            const data = doc.data();
            // Check createdAt if it exists and is a Timestamp
            if (data.createdAt && data.createdAt.toDate) {
                const created = data.createdAt.toDate();
                if (created > yesterday) {
                    newSubscribers24h++;
                }
            } else if (data.createdAt) { // Fallback for standard date strings/objects
                const created = new Date(data.createdAt);
                if (created > yesterday) {
                    newSubscribers24h++;
                }
            }
        });

        return Response.json({
            totalDomains,
            totalSubscribers,
            totalCampaigns,
            campaignsSent: totalCampaigns,
            deliveredNotifications: totalReach, // Backward compat + new naming
            totalReach,
            totalClicks,
            clickRate: parseFloat(clickRate),
            newSubscribers24h,
            successRate: 98.5
        });
    } catch (error) {
        console.error('[API] Get analytics error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
}
