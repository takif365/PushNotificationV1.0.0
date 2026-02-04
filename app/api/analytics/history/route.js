import { db } from '@/lib/firebase-admin';
import { verifyIdToken } from '@/lib/firebase-admin';

export async function GET(req) {
    try {
        const token = req.headers.get('authorization')?.split('Bearer ')[1];
        const decodedToken = await verifyIdToken(token);

        if (!decodedToken) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Fetch Raw Data
        const [tokensSnapshot, campaignsSnapshot] = await Promise.all([
            db.collection('push_tokens').get(),
            db.collection('campaigns').get()
        ]);

        // Helper to format date as YYYY-MM-DD
        const formatDate = (date) => {
            return date.toISOString().split('T')[0];
        };

        // Determine date range (Last 10 Days)
        const days = 10;
        const labels = [];
        const today = new Date();
        for (let i = days - 1; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            labels.push(formatDate(d));
        }

        // Initialize Data Structures map<date, count>
        const subsMap = {};     // Total subs accumulated up to that day
        const newSubsMap = {};  // New subs on that day
        const clicksMap = {};   // Clicks on that day
        const reachMap = {};    // Reach on that day

        labels.forEach(date => {
            subsMap[date] = 0;
            newSubsMap[date] = 0;
            clicksMap[date] = 0;
            reachMap[date] = 0;
        });

        // 1. Process Subscribers (New & Total)
        // Sort tokens by date to calculate running total
        const sortedTokens = tokensSnapshot.docs.map(doc => {
            const data = doc.data();
            let dateObj;
            if (data.createdAt?.toDate) dateObj = data.createdAt.toDate();
            else if (data.createdAt) dateObj = new Date(data.createdAt);
            else dateObj = new Date(0); // Old
            return { date: dateObj };
        }).sort((a, b) => a.date - b.date);

        // Calculate cumulative total up to the start of our range
        let runningTotal = 0;
        const startDate = new Date(labels[0]);

        sortedTokens.forEach(token => {
            const dateStr = formatDate(token.date);

            if (token.date < startDate) {
                runningTotal++;
            } else if (newSubsMap.hasOwnProperty(dateStr)) {
                newSubsMap[dateStr]++;
                runningTotal++; // Will add to daily total later, but we need running total for the graph
            }
        });

        // Fill Total Subs Map (Cumulative)
        let currentTotal = 0;
        // Re-count strictly for the range to ensure alignment
        // Actually, better approach:
        // We know the total before the window starts (initial runningTotal).
        // Iterate through days labels.
        let cumulative = runningTotal; // Base from before window
        labels.forEach(date => {
            // Add new subs for this specific day
            cumulative += newSubsMap[date];
            subsMap[date] = cumulative;
        });

        // 2. Process Campaigns (Clicks & Reach)
        campaignsSnapshot.docs.forEach(doc => {
            const data = doc.data();
            if (!data.sentAt) return;

            let sentDate;
            if (data.sentAt?.toDate) sentDate = data.sentAt.toDate();
            else sentDate = new Date(data.sentAt);

            const dateStr = formatDate(sentDate);


            if (clicksMap.hasOwnProperty(dateStr)) {
                // Check multiple possible locations for clicks
                const clicks = (data.stats && data.stats.totalClicks) || (data.stats && data.stats.clicks) || data.clicks || 0;
                // Check reach
                const reach = (data.stats && data.stats.totalSent) || (data.stats && data.stats.reach) || data.reach || 0;

                clicksMap[dateStr] += clicks;
                reachMap[dateStr] += reach;
            }
        });

        return Response.json({
            labels,
            datasets: {
                totalClicks: labels.map(d => clicksMap[d]),
                totalReach: labels.map(d => reachMap[d]),
                totalSubscribers: labels.map(d => subsMap[d]),
                newSubscribers: labels.map(d => newSubsMap[d])
            }
        });

    } catch (error) {
        console.error('[API] Get analytics history error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
}
