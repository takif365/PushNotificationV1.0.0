// Cloudflare Worker - Push Notification API Gateway
// رابط مجاني بديل عن Firebase Functions

export default {
    async fetch(request, env) {
        // CORS Headers
        const corsHeaders = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
            'Content-Type': 'application/json',
        };

        // Handle OPTIONS (Preflight)
        if (request.method === 'OPTIONS') {
            return new Response(null, {
                status: 204,
                headers: corsHeaders,
            });
        }

        // Handle POST only
        if (request.method !== 'POST') {
            return new Response(
                JSON.stringify({ success: false, error: 'Method not allowed' }),
                { status: 405, headers: corsHeaders }
            );
        }

        try {
            const body = await request.json();
            const { token, hostname, platform } = body;

            if (!token) {
                return new Response(
                    JSON.stringify({ success: false, error: 'Token required' }),
                    { status: 400, headers: corsHeaders }
                );
            }

            // Firebase Admin API - حفظ التوكن في Firestore
            const firebaseProjectId = env.FIREBASE_PROJECT_ID;
            const firebaseUrl = `https://firestore.googleapis.com/v1/projects/${firebaseProjectId}/databases/(default)/documents/push_tokens/${token}`;

            const validPlatforms = ['web', 'android', 'ios'];
            const finalPlatform = validPlatforms.includes(platform) ? platform : 'web';

            // إنشاء Access Token لـ Firebase
            const accessToken = await getFirebaseAccessToken(env);

            // حفظ البيانات في Firestore
            const firestoreResponse = await fetch(firebaseUrl + '?updateMask.fieldPaths=token&updateMask.fieldPaths=domain&updateMask.fieldPaths=platform&updateMask.fieldPaths=lastActive', {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    fields: {
                        token: { stringValue: token },
                        domain: { stringValue: hostname || 'unknown' },
                        platform: { stringValue: finalPlatform },
                        createdAt: { timestampValue: new Date().toISOString() },
                        lastActive: { timestampValue: new Date().toISOString() }
                    }
                })
            });

            if (!firestoreResponse.ok) {
                throw new Error('Failed to save to Firestore');
            }

            return new Response(
                JSON.stringify({ success: true, message: 'Token saved successfully' }),
                { status: 200, headers: corsHeaders }
            );

        } catch (error) {
            console.error('Worker Error:', error);
            return new Response(
                JSON.stringify({ success: false, error: error.message }),
                { status: 500, headers: corsHeaders }
            );
        }
    }
};

// الحصول على Access Token لـ Firebase Admin
async function getFirebaseAccessToken(env) {
    const jwtHeader = btoa(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));

    const now = Math.floor(Date.now() / 1000);
    const jwtClaimSet = btoa(JSON.stringify({
        iss: env.FIREBASE_CLIENT_EMAIL,
        scope: 'https://www.googleapis.com/auth/datastore',
        aud: 'https://oauth2.googleapis.com/token',
        exp: now + 3600,
        iat: now
    }));

    const unsignedJwt = `${jwtHeader}.${jwtClaimSet}`;

    // توقيع JWT باستخدام Private Key
    const privateKey = await crypto.subtle.importKey(
        'pkcs8',
        str2ab(atob(env.FIREBASE_PRIVATE_KEY_BASE64)),
        { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
        false,
        ['sign']
    );

    const signature = await crypto.subtle.sign(
        'RSASSA-PKCS1-v1_5',
        privateKey,
        new TextEncoder().encode(unsignedJwt)
    );

    const signedJwt = `${unsignedJwt}.${btoa(String.fromCharCode(...new Uint8Array(signature)))}`;

    // الحصول على Access Token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${signedJwt}`
    });

    const tokenData = await tokenResponse.json();
    return tokenData.access_token;
}

// Helper function
function str2ab(str) {
    const buf = new ArrayBuffer(str.length);
    const bufView = new Uint8Array(buf);
    for (let i = 0; i < str.length; i++) {
        bufView[i] = str.charCodeAt(i);
    }
    return buf;
}
