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
        const { campaignId, test } = body;

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

        // CRITICAL FIX: Tokens are saved with 'domain' (hostname string) NOT 'domainId'.
        // We must lookup the hostname from the domainId.

        if (campaign.targeting?.domainId && campaign.targeting.domainId !== 'all') {
            const domainDoc = await db.collection('domains').doc(campaign.targeting.domainId).get();
            if (domainDoc.exists) {
                const domainName = domainDoc.data().domain; // e.g. "ff88.site"
                console.log(`[Campaign] Targeting specific domain: ${domainName} (ID: ${campaign.targeting.domainId})`);
                query = query.where('domain', '==', domainName);
            } else {
                console.warn(`[Campaign] Domain ID ${campaign.targeting.domainId} not found.`);
                // Fallback: query by domainId just in case schema changes later, though unlikely to match anything now.
                query = query.where('domainId', '==', campaign.targeting.domainId);
            }
        } else {
            // Target 'all' domains for this user
            const userDomains = await db.collection('domains').where('userId', '==', decodedToken.uid).get();

            if (!userDomains.empty) {
                const domainNames = userDomains.docs.map(d => d.data().domain).filter(Boolean);
                console.log(`[Campaign] Targeting all user domains: ${domainNames.join(', ')}`);

                if (domainNames.length > 0) {
                    // Firestore 'in' query limit is 10. 
                    // For now, slice to 10. In production, we'd need batching.
                    query = query.where('domain', 'in', domainNames.slice(0, 10));
                } else {
                    // User has no domains with valid names
                    console.log('[Campaign] User has domains but no valid domain names.');
                }
            } else {
                console.log('[Campaign] User has no domains.');
            }
        }

        if (campaign.targeting?.platform && campaign.targeting.platform !== 'all') {
            console.log(`[Campaign] Filtering by platform: ${campaign.targeting.platform}`);
            query = query.where('platform', '==', campaign.targeting.platform);
        }

        const tokensSnapshot = await query.get();
        console.log(`[Campaign] Found ${tokensSnapshot.size} tokens targeted.`);

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
            // Return early but success, so stats update to 0
            await db.collection('campaigns').doc(campaignId).update({
                status: 'sent',
                sentAt: new Date(),
                'stats.totalSent': 0,
                'stats.totalFailed': 0,
                'stats.totalTargeted': 0
            });
            return Response.json({ success: true, results });
        }

        // Get FCM access token
        const accessToken = await getAccessToken();
        // Hardcode Project ID to ensure it works as per manual fix
        const projectId = 'push-notification-d1fb7';

        // Send notifications
        for (const tokenDoc of tokens) {
            try {
                // Construct message
                // Construct message - STRICT DATA-ONLY
                // NO 'notification' key allows Service Worker to handle display 100%
                const messagePayload = {
                    message: {
                        token: tokenDoc.token,
                        data: {
                            // Visuals
                            title: campaign.title,
                            body: campaign.body,
                            icon: campaign.icon || '/icon.png',
                            // Logic
                            url: (campaign.actionUrl && campaign.actionUrl.includes('/api/track-click'))
                                ? campaign.actionUrl
                                : `${process.env.NEXT_PUBLIC_APP_URL || 'https://ff88.site'}/api/track-click?campaignId=${campaignId}&targetUrl=${encodeURIComponent(campaign.actionUrl || '/')}`,
                            // Tracking
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

                    console.error(`[FCM] Send Error for ${tokenDoc.id.substring(0, 8)}...: ${errorMessage} (${errorCode})`);

                    // STRICT CLEANUP: Only delete if token is truly dead.
                    // 'UNREGISTERED' is the code for a token that is no longer valid.
                    // 'INVALID_ARGUMENT' often means payload error, DO NOT DELETE.
                    if (errorCode === 'UNREGISTERED' || errorMessage.includes('registration-token-not-registered')) {
                        console.warn(`[Cleanup] Marking dead token: ${tokenDoc.id}`);
                        results.deadTokens.push(tokenDoc.id);
                    }
                }
            } catch (err) {
                results.failed++;
                console.error(`[FCM] Exception:`, err.message);
            }
        }

        // Cleanup dead tokens
        if (results.deadTokens.length > 0) {
            console.log(`[Cleanup] Deleting ${results.deadTokens.length} dead tokens...`);
            const batch = db.batch();
            results.deadTokens.forEach(tokenId => {
                batch.delete(db.collection('push_tokens').doc(tokenId));
            });
            await batch.commit();
        }

        // Update campaign stats
        // Transition logic: sent if > 0 sent, failed if 0 sent (and total > 0)
        let finalStatus = 'sent';
        if (results.sent === 0 && results.total > 0) {
            finalStatus = 'failed';
        }

        await db.collection('campaigns').doc(campaignId).update({
            status: finalStatus,
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
        console.error('[API] Send campaign error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
}
