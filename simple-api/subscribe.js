// Simple API endpoint using Firestore REST API directly
// No server needed - works with Firebase Hosting static files!

export default async function handler(req, res) {
    // CORS Headers
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
    };

    // Set CORS headers
    Object.entries(corsHeaders).forEach(([key, value]) => {
        res.setHeader(key, value);
    });

    // Handle OPTIONS
    if (req.method === 'OPTIONS') {
        return res.status(204).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    try {
        const { token, hostname, platform } = req.body;

        if (!token) {
            return res.status(400).json({ success: false, error: 'Token required' });
        }

        // Save to Firestore using REST API
        const firestoreUrl = `https://firestore.googleapis.com/v1/projects/push-notification-d1fb7/databases/(default)/documents/push_tokens/${token}`;

        const validPlatforms = ['web', 'android', 'ios'];
        const finalPlatform = validPlatforms.includes(platform) ? platform : 'web';

        const response = await fetch(firestoreUrl + '?updateMask.fieldPaths=token&updateMask.fieldPaths=domain&updateMask.fieldPaths=platform&updateMask.fieldPaths=lastActive', {
            method: 'PATCH',
            headers: {
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

        if (!response.ok) {
            throw new Error('Firestore write failed');
        }

        return res.status(200).json({ success: true });

    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
}
