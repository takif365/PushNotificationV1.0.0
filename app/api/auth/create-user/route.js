import { db } from '@/lib/firebase-admin';

export async function POST(req) {
    try {
        const body = await req.json();
        const { uid, email, displayName } = body;

        if (!uid || !email) {
            return Response.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Create user document in Firestore
        await db.collection('users').doc(uid).set({
            uid,
            email,
            displayName: displayName || email.split('@')[0],
            createdAt: new Date(),
            plan: 'free',
            totalDomains: 0,
            totalTokens: 0
        });

        return Response.json({ success: true, uid });
    } catch (error) {
        console.error('[API] Create user error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
}
