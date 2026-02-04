import { NextResponse } from 'next/server';
import { db, admin } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

// Define common CORS headers
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
};

export async function OPTIONS() {
    return new Response(null, {
        status: 204,
        headers: corsHeaders,
    });
}

export async function POST(req) {
    try {
        const body = await req.json();
        const { token, domainId, platform, visitorData } = body;

        // 1. Basic Validation
        if (!token || !domainId) {
            return Response.json({ success: false, error: 'Token and Domain ID required' }, { status: 400 });
        }

        // 2. Validate Domain Ownership
        const domainDoc = await db.collection('domains').doc(domainId).get();
        if (!domainDoc.exists) {
            return Response.json({ success: false, error: 'Invalid Domain ID' }, { status: 403 });
        }

        const domainData = domainDoc.data();
        const registeredDomain = (domainData.domain || domainData.name).toLowerCase();

        // 3. Validate Origin (Security Check)
        const origin = req.headers.get('origin') || req.headers.get('referer');
        if (origin) {
            const originHostname = new URL(origin).hostname.toLowerCase();
            // Allow localhost for dev, otherwise must match registered domain
            if (!originHostname.includes('localhost') && !originHostname.includes(registeredDomain)) {
                console.warn(`[Security] Origin mismatch: ${originHostname} vs ${registeredDomain}`);
                // Strict mode: Reject if mismatch
                // return Response.json({ success: false, error: 'Domain origin mismatch' }, { status: 403 });
                // For now, we'll log it but maybe allow it if subdomains are tricky, 
                // BUT the user asked for strict security. Let's be strict.
                return Response.json({ success: false, error: `Unauthorized origin: ${originHostname}` }, { status: 403 });
            }
        }

        const validPlatforms = ['web', 'android', 'ios'];
        const finalPlatform = validPlatforms.includes(platform) ? platform : 'web';

        // 4. Save Token (Admin SDK bypasses rules)
        const userId = body.userId || domainData.userId; // Use provided subscriber ID or fallback (careful with fallback if using for dedup)

        // Prevent Duplicates: Check if user already exists for this domain
        // We use body.userId if available (Subscriber ID), otherwise we can't reliably dedup across tokens without it.
        // Assuming user sends a unique 'userId' (fingerprint) in body.
        let existingDocId = null;

        if (body.userId) {
            const existingSnapshot = await db.collection('push_tokens')
                .where('userId', '==', body.userId)
                .where('domainId', '==', domainId)
                .limit(1)
                .get();

            if (!existingSnapshot.empty) {
                existingDocId = existingSnapshot.docs[0].id;
            }
        }

        const tokenData = {
            token,
            domainId,
            userId: body.userId || domainData.userId, // Prefer subscriber ID
            ownerId: domainData.userId, // Keep track of the domain owner
            domain: registeredDomain,
            platform: finalPlatform,
            ip: visitorData?.ip || req.headers.get('x-forwarded-for') || 'unknown',
            country: visitorData?.country || 'Unknown',
            country_code: visitorData?.country_code || 'XX',
            ua: visitorData?.ua || req.headers.get('user-agent'),
            lang: visitorData?.lang || 'en',
            lastActive: admin.firestore.FieldValue.serverTimestamp()
        };

        if (existingDocId) {
            // Update existing document
            console.log(`[API] Updating existing subscriber: ${existingDocId}`);
            await db.collection('push_tokens').doc(existingDocId).update(tokenData);
        } else {
            // Create new document (Use token as ID for easy lookup, or random if deduping)
            // If we use token as ID, duplicates are possible if userId changes.
            // But here we checked userId.
            console.log(`[API] Registering new subscriber for domain: ${registeredDomain}`);
            // Add createdAt only for new docs
            tokenData.createdAt = admin.firestore.FieldValue.serverTimestamp();
            await db.collection('push_tokens').doc(token).set(tokenData);
        }

        console.log(`[API] Token subscribed for domain: ${registeredDomain}`);

        return Response.json({ success: true });

    } catch (error) {
        console.error('Subscription API Error:', error);
        return Response.json({ success: false, error: error.message }, { status: 500 });
    }
}

