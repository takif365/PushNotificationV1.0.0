import { db, verifyIdToken, getAccessToken } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';

// GET: List campaigns
export async function GET(req) {
    try {
        const token = req.headers.get('authorization')?.split('Bearer ')[1];
        const decodedToken = await verifyIdToken(token);

        if (!decodedToken) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get ALL campaigns
        const campaignsSnapshot = await db.collection('campaigns')
            .orderBy('createdAt', 'desc')
            .get();

        const campaigns = campaignsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || null,
            sentAt: doc.data().sentAt?.toDate?.()?.toISOString() || null
        }));

        return Response.json({ campaigns });
    } catch (error) {
        console.error('[API] Get campaigns error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
}

// POST: Create and Send campaign immediately
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

        // 1. Create Campaign Document
        const campaignRef = body.id ? db.collection('campaigns').doc(body.id) : db.collection('campaigns').doc();
        const campaignId = campaignRef.id;

        const campaignData = {
            id: campaignId,
            userId: decodedToken.uid,
            title,
            body: bodyText,
            icon: icon || null,
            actionUrl: actionUrl || '/',
            targeting: {
                domainId: targeting?.domainId || 'all',
                platform: targeting?.platform || 'all'
            },
            status: 'processing', // Temporary status while sending
            createdAt: new Date(), // Stored as Date object
            stats: {
                totalTargeted: 0,
                totalSent: 0,
                totalFailed: 0
            }
        };

        await campaignRef.set(campaignData);

        // 2. Immediate Sening Logic
        console.log(`[API] Starting immediate send for campaign: ${campaignId}`);

        // Build Query
        let query = db.collection('push_tokens');

        if (campaignData.targeting.domainId && campaignData.targeting.domainId !== 'all') {
            const domainDoc = await db.collection('domains').doc(campaignData.targeting.domainId).get();
            if (domainDoc.exists) {
                const domainName = domainDoc.data().domain;
                query = query.where('domain', '==', domainName);
            } else {
                // Fallback based on ID if name not found/matching schema
                query = query.where('domainId', '==', campaignData.targeting.domainId);
            }
        } else {
            // Target all user domains
            const userDomains = await db.collection('domains').where('userId', '==', decodedToken.uid).get();
            if (!userDomains.empty) {
                const domainNames = userDomains.docs.map(d => d.data().domain).filter(Boolean);
                if (domainNames.length > 0) {
                    // Limit 10 for 'in' query safety, or loop in production.
                    query = query.where('domain', 'in', domainNames.slice(0, 10));
                }
            }
        }

        if (campaignData.targeting.platform && campaignData.targeting.platform !== 'all') {
            query = query.where('platform', '==', campaignData.targeting.platform);
        }

        const tokensSnapshot = await query.get();
        console.log(`[API] Found ${tokensSnapshot.size} tokens targeted.`);

        // Deduplicate
        const uniqueTokensMap = new Map();
        tokensSnapshot.docs.forEach(doc => {
            const data = doc.data();
            if (data.token && !uniqueTokensMap.has(data.token)) {
                uniqueTokensMap.set(data.token, { id: doc.id, ...data });
            }
        });
        const tokens = Array.from(uniqueTokensMap.values());

        const results = {
            total: tokens.length,
            sent: 0,
            failed: 0,
            deadTokens: []
        };

        if (results.total > 0) {
            // Get Access Token
            const accessToken = await getAccessToken();
            const projectId = process.env.FIREBASE_PROJECT_ID || 'push-notification-d1fb7';

            // Send Parallel Batches
            const BATCH_SIZE = 50;
            for (let i = 0; i < tokens.length; i += BATCH_SIZE) {
                const batch = tokens.slice(i, i + BATCH_SIZE);

                await Promise.all(batch.map(async (tokenDoc) => {
                    try {
                        const messagePayload = {
                            message: {
                                token: tokenDoc.token,
                                data: {
                                    title: campaignData.title,
                                    body: campaignData.body,
                                    icon: campaignData.icon || '/icon.png',
                                    url: (campaignData.actionUrl && campaignData.actionUrl.includes('/api/track-click'))
                                        ? campaignData.actionUrl
                                        : `${process.env.NEXT_PUBLIC_APP_URL || 'https://ff88.site'}/api/track-click?campaignId=${campaignId}&targetUrl=${encodeURIComponent(campaignData.actionUrl || '/')}`,
                                    campaignId: campaignId,
                                    domainId: tokenDoc.domain || ''
                                },
                                android: {
                                    priority: 'high',
                                    ttl: '86400s'
                                },
                                apns: {
                                    headers: {
                                        'apns-priority': '10',
                                        'apns-expiration': Math.floor(Date.now() / 1000) + 86400 + ''
                                    },
                                    payload: {
                                        aps: {
                                            alert: {
                                                title: campaignData.title,
                                                body: campaignData.body
                                            },
                                            sound: 'default'
                                        }
                                    }
                                },
                                webpush: {
                                    headers: {
                                        Urgency: 'high'
                                    }
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
                }));
            } // End Batch Loop

            // cleanup dead tokens
            if (results.deadTokens.length > 0) {
                const batch = db.batch();
                results.deadTokens.forEach(tokenId => {
                    batch.delete(db.collection('push_tokens').doc(tokenId));
                });
                await batch.commit();
            }
        }

        // 3. Update Status & Stats
        const updateData = {
            status: 'sent',
            sentAt: new Date(),
            'stats.totalSent': results.sent,
            'stats.totalFailed': results.failed,
            'stats.totalTargeted': results.total
        };

        await campaignRef.update(updateData);

        // Global Stats
        if (results.sent > 0) {
            await db.collection('stats').doc('global').set({
                totalReach: FieldValue.increment(results.sent)
            }, { merge: true });
        }

        return Response.json({
            success: true,
            campaign: {
                ...campaignData,
                ...updateData,
                createdAt: campaignData.createdAt.toISOString()
            },
            results
        });

    } catch (error) {
        console.error('[API] Create/Send campaign error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
}
