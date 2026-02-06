import { db, getAccessToken } from '@/lib/firebase-admin';
import { verifyIdToken } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(req) {
    try {
        const token = req.headers.get('authorization')?.split('Bearer ')[1];
        const decodedToken = await verifyIdToken(token);

        if (!decodedToken) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { campaignId } = body;

        console.log(`[API] Resending campaign: ${campaignId}`);

        // Get campaign
        const campaignDoc = await db.collection('campaigns').doc(campaignId).get();
        if (!campaignDoc.exists) {
            return Response.json({ error: 'Campaign not found' }, { status: 404 });
        }

        const campaign = campaignDoc.data();

        // Verify ownership
        if (campaign.userId !== decodedToken.uid) {
            return Response.json({ error: 'Unauthorized' }, { status: 403 });
        }

        // Get targeted tokens
        let query = db.collection('push_tokens');

        if (campaign.targeting?.domainId && campaign.targeting.domainId !== 'all') {
            const domainDoc = await db.collection('domains').doc(campaign.targeting.domainId).get();
            if (domainDoc.exists) {
                const domainName = domainDoc.data().domain;
                query = query.where('domain', '==', domainName);
            } else {
                query = query.where('domainId', '==', campaign.targeting.domainId);
            }
        } else {
            const userDomains = await db.collection('domains').where('userId', '==', decodedToken.uid).get();
            if (!userDomains.empty) {
                const domainNames = userDomains.docs.map(d => d.data().domain).filter(Boolean);
                if (domainNames.length > 0) {
                    query = query.where('domain', 'in', domainNames.slice(0, 10));
                }
            }
        }

        if (campaign.targeting?.platform && campaign.targeting.platform !== 'all') {
            query = query.where('platform', '==', campaign.targeting.platform);
        }

        const tokensSnapshot = await query.get();
        // Deduplicate tokens by token string
        const uniqueTokensMap = new Map();
        tokensSnapshot.docs.forEach(doc => {
            const data = doc.data();
            if (data.token && !uniqueTokensMap.has(data.token)) {
                uniqueTokensMap.set(data.token, {
                    id: doc.id,
                    ...data
                });
            }
        });

        const tokens = Array.from(uniqueTokensMap.values());

        const results = {
            total: tokens.length,
            sent: 0,
            failed: 0,
            deadTokens: []
        };

        if (results.total === 0) {
            return Response.json({ success: true, results });
        }

        const accessToken = await getAccessToken();
        const projectId = 'push-notification-d1fb7';

        for (const tokenDoc of tokens) {
            try {
                const messagePayload = {
                    message: {
                        token: tokenDoc.token,
                        data: {
                            title: campaign.title,
                            body: campaign.body,
                            icon: campaign.icon || '/icon.png',
                            // Logic
                            url: (campaign.actionUrl && campaign.actionUrl.includes('/api/track-click'))
                                ? campaign.actionUrl
                                : `${process.env.NEXT_PUBLIC_APP_URL || 'https://push-notification-v1-0-0-vsu4.vercel.app'}/api/track-click?campaignId=${campaignId}&targetUrl=${encodeURIComponent(campaign.actionUrl || '/')}`,
                            campaignId: campaignId,
                            domainId: tokenDoc.domain || ''
                        },
                        android: {
                            priority: 'high'
                        }
                    }
                };

                const response = await fetch(
                    `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
                    {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${accessToken}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(messagePayload)
                    }
                );

                if (response.ok) {
                    results.sent++;
                } else {
                    const error = await response.json();
                    results.failed++;
                    const errorCode = error.error?.details?.[0]?.errorCode;
                    const errorMessage = error.error?.message || '';

                    if (errorCode === 'UNREGISTERED' || errorMessage.includes('registration-token-not-registered')) {
                        results.deadTokens.push(tokenDoc.id);
                    }
                }
            } catch (err) {
                results.failed++;
                console.error(`[FCM] Exception:`, err.message);
            }
        }

        if (results.deadTokens.length > 0) {
            const batch = db.batch();
            results.deadTokens.forEach(tokenId => {
                batch.delete(db.collection('push_tokens').doc(tokenId));
            });
            await batch.commit();
        }

        // Update campaign stats
        await db.collection('campaigns').doc(campaignId).update({
            status: 'sent',
            sentAt: new Date(),
            'stats.totalSent': results.sent,
            'stats.totalFailed': results.failed,
            'stats.totalTargeted': results.total
        });

        // PERSISTENT GLOBAL STATS: Increment Total Reach
        if (results.sent > 0) {
            await db.collection('stats').doc('global').set({
                totalReach: FieldValue.increment(results.sent)
            }, { merge: true });
        }

        return Response.json({
            success: true,
            results: {
                ...results,
                cleanedUp: results.deadTokens.length
            }
        });
    } catch (error) {
        console.error('[API] Resend campaign error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
}
