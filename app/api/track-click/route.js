import { db } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

/**
 * Click Tracking API Route for Push Notifications
 * 
 * This endpoint handles click tracking when users interact with push notifications.
 * It increments the totalClicks counter for the specified campaign and redirects
 * the user to their intended destination.
 * 
 * Query Parameters:
 * - campaignId: The unique identifier of the campaign to track
 * - targetUrl: The destination URL where the user should be redirected
 * 
 * @example
 * GET /api/track-click?campaignId=abc123&targetUrl=https://example.com
 */
export async function GET(req) {
    try {
        // Extract query parameters from the URL
        const { searchParams } = new URL(req.url);
        const campaignId = searchParams.get('campaignId');
        const targetUrl = searchParams.get('targetUrl');

        // Default fallback URL if targetUrl is not provided
        const DEFAULT_HOMEPAGE = 'https://ff88.site';
        const redirectUrl = targetUrl || DEFAULT_HOMEPAGE;

        // If campaignId is provided, increment the click count
        if (campaignId) {
            try {
                // Reference to the campaign document in Firestore
                const campaignRef = db.collection('campaigns').doc(campaignId);
                const globalStatsRef = db.collection('stats').doc('global');

                const batch = db.batch();

                // 1. Campaign-specific increment (Atomic)
                batch.update(campaignRef, {
                    'stats.totalClicks': FieldValue.increment(1),
                    lastClickedAt: FieldValue.serverTimestamp()
                });

                // 2. Global persistent increment (Atomic)
                // Using set with merge=true ensures document creation if it doesn't exist
                batch.set(globalStatsRef, {
                    totalClicks: FieldValue.increment(1)
                }, { merge: true });

                // Commit both updates atomically
                await batch.commit();

                console.log(`[Track-Click] Successfully incremented clicks for campaign: ${campaignId} + Global`);
            } catch (error) {
                // Log the error but don't fail the redirect
                // User experience is more important than tracking accuracy
                console.error(`[Track-Click] Failed to update stats for campaign ${campaignId}:`, error);
            }
        } else {
            console.warn('[Track-Click] No campaignId provided, skipping tracking');
        }

        // Create redirect response with proper headers
        const response = new Response(null, {
            status: 307, // Temporary redirect
            headers: {
                'Location': redirectUrl,
                // CORS headers for localhost development
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
                // Cache control to prevent caching of tracking URLs
                'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            }
        });

        return response;

    } catch (error) {
        console.error('[Track-Click] Unexpected error:', error);

        // Even if there's an error, try to redirect the user
        // Better user experience than showing an error page
        const { searchParams } = new URL(req.url);
        const targetUrl = searchParams.get('targetUrl');
        const fallbackUrl = targetUrl || 'https://ff88.site';

        return new Response(null, {
            status: 307,
            headers: {
                'Location': fallbackUrl,
                'Access-Control-Allow-Origin': '*'
            }
        });
    }
}

/**
 * Handle CORS preflight requests
 * Required for cross-origin requests from different domains
 */
export async function OPTIONS(req) {
    return new Response(null, {
        status: 204,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        }
    });
}

/**
 * Legacy POST endpoint support
 * Kept for backward compatibility with existing service workers
 */
export async function POST(req) {
    try {
        const body = await req.json();
        const { campaignId } = body;

        if (!campaignId) {
            return Response.json({ error: 'Campaign ID required' }, { status: 400 });
        }

        const campaignRef = db.collection('campaigns').doc(campaignId);

        // Atomic increment
        await campaignRef.update({
            'stats.totalClicks': FieldValue.increment(1),
            lastClickedAt: FieldValue.serverTimestamp()
        });

        return Response.json({ success: true });
    } catch (error) {
        console.error('[API] Track click error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
}
