import { db, getAccessToken } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic'; // Ensure Next.js doesn't cache this

export async function GET(req) {
    try {
        // Security Check
        const authHeader = req.headers.get('authorization');
        const expectedSecret = process.env.CRON_SECRET;

        if (authHeader !== `Bearer ${expectedSecret}`) {
            console.error('[Cron] ⛔ Unauthorized access attempt.');
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const now = new Date();
        const isoNow = now.toISOString();

        console.log(`[Cron] 🕒 Checking scheduled campaigns at ${isoNow}`);

        // Query: Status='scheduled' AND scheduledAt <= Now (Lexicographical String Comparison)
        // Note: scheduledAt MUST be stored as ISO String for this to work.
        const snapshot = await db.collection('campaigns')
            .where('status', '==', 'scheduled')
            .where('scheduledAt', '<=', isoNow)
            .get();

        if (snapshot.empty) {
            console.log('[Cron] ✅ No pending scheduled campaigns.');
            return Response.json({ success: true, processed: 0 });
        }

        console.log(`[Cron] 🚀 Found ${snapshot.size} campaigns to process.`);

        const accessToken = await getAccessToken();
        const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'push-notification-d1fb7';
        const results = [];

        for (const doc of snapshot.docs) {
            const campaignId = doc.id;
            const campaign = doc.data();

            console.log(`[Cron] ⚡ Executing Campaign: ${campaignId} ("${campaign.title}")`);

            try {
                // 1. Fetch Tokens (Targeting Logic)
                let query = db.collection('push_tokens');

                // Domain Targeting
                if (campaign.targeting?.domainId && campaign.targeting.domainId !== 'all') {
                    const domainDoc = await db.collection('domains').doc(campaign.targeting.domainId).get();
                    if (domainDoc.exists) {
                        query = query.where('domain', '==', domainDoc.data().domain);
                    }
                }

                // Platform Targeting
                if (campaign.targeting?.platform && campaign.targeting.platform !== 'all') {
                    query = query.where('platform', '==', campaign.targeting.platform);
                }

                const tokensSnapshot = await query.get();

                // Deduplicate tokens
                const uniqueTokens = [];
                const seen = new Set();
                tokensSnapshot.docs.forEach(td => {
                    const t = td.data().token;
                    if (t && !seen.has(t)) {
                        seen.add(t);
                        uniqueTokens.push({ id: td.id, token: t });
                    }
                });

                if (uniqueTokens.length === 0) {
                    console.warn(`[Cron] ⚠️ Campaign ${campaignId} has no matching tokens.`);
                    await db.collection('campaigns').doc(campaignId).update({
                        status: 'failed',
                        error: 'No active subscribers found for criteria'
                    });
                    results.push({ id: campaignId, status: 'failed', reason: 'No tokens' });
                    continue;
                }

                // 2. Prepare FCM Push
                // Use a simplified batch approach or serial loop (FCM v1 requires per-message or batch API, but batch is limited)
                // We'll loop for now as per previous logic, but this can be optimized with Promise.all

                let sentCount = 0;
                let failCount = 0;
                const deadTokens = [];

                // Tracking URL Construction
                const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://push-notification-v1-0-0-vsu4.vercel.app';
                const targetUrl = campaign.actionUrl || '/';
                const trackingLink = (targetUrl.includes('/api/track-click'))
                    ? targetUrl
                    : `${baseUrl}/api/track-click?campaignId=${campaignId}&targetUrl=${encodeURIComponent(targetUrl)}`;

                const promises = uniqueTokens.map(async (tDoc) => {
                    try {
                        const payload = {
                            message: {
                                token: tDoc.token,
                                data: {
                                    title: campaign.title,
                                    body: campaign.body,
                                    icon: campaign.icon || '/icon.png',
                                    url: trackingLink,
                                    campaignId: campaignId
                                },
                                android: { priority: 'high' }
                            }
                        };

                        const fcmRes = await fetch(
                            `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
                            {
                                method: 'POST',
                                headers: {
                                    'Authorization': `Bearer ${accessToken}`,
                                    'Content-Type': 'application/json'
                                },
                                body: JSON.stringify(payload)
                            }
                        );

                        if (fcmRes.ok) {
                            return { status: 'ok' };
                        } else {
                            const err = await fcmRes.json();
                            if (err.error?.details?.[0]?.errorCode === 'UNREGISTERED') {
                                return { status: 'dead', id: tDoc.id };
                            }
                            return { status: 'error' };
                        }
                    } catch (e) {
                        return { status: 'error' };
                    }
                });

                const sendResults = await Promise.all(promises);

                // Aggregate Results
                sendResults.forEach(r => {
                    if (r.status === 'ok') sentCount++;
                    if (r.status === 'error') failCount++;
                    if (r.status === 'dead') {
                        failCount++;
                        if (r.id) deadTokens.push(r.id);
                    }
                });

                // 3. Cleanup Dead Tokens
                if (deadTokens.length > 0) {
                    console.log(`[Cron] 🧹 Cleaning up ${deadTokens.length} dead tokens...`);
                    const batch = db.batch();
                    deadTokens.forEach(tid => batch.delete(db.collection('push_tokens').doc(tid)));
                    await batch.commit();
                }

                // 4. Update Campaign Status
                const finalStatus = sentCount > 0 ? 'sent' : 'failed';

                await db.collection('campaigns').doc(campaignId).update({
                    status: finalStatus,
                    sentAt: FieldValue.serverTimestamp(),
                    'stats.totalSent': sentCount,
                    'stats.totalFailed': failCount,
                    'stats.totalTargeted': uniqueTokens.length,
                    processedAt: FieldValue.serverTimestamp() // Audit trail
                });

                // Update Global Stats
                if (sentCount > 0) {
                    await db.collection('stats').doc('global').set({
                        totalReach: FieldValue.increment(sentCount)
                    }, { merge: true });
                }

                console.log(`[Cron] ✅ Campaign ${campaignId} finished: ${sentCount} Sent, ${failCount} Failed.`);
                results.push({ id: campaignId, status: finalStatus, sent: sentCount });

            } catch (err) {
                console.error(`[Cron] ❌ Error processing ${campaignId}:`, err);
                await db.collection('campaigns').doc(campaignId).update({
                    status: 'failed',
                    error: err.message
                });
            }
        }

        return Response.json({ success: true, processed: results.length, details: results });
    } catch (error) {
        console.error('[Cron] 🔥 Fatal Scheduler Error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
}
