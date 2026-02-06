import { NextResponse } from 'next/server';
import { fcm } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

export async function OPTIONS() {
    return new NextResponse(null, {
        status: 204,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
    });
}

export async function POST(req) {
    try {
        const body = await req.json();
        const { domain, title, body: content } = body;

        if (!title || !content) {
            return NextResponse.json({ success: false, error: 'Title and Body required' }, { status: 400 });
        }

        if (!fcm) {
            console.error('PNS Send Error: FCM not initialized. Check your FIREBASE_* environment variables.');
            return NextResponse.json({ success: false, error: 'Messaging service unavailable' }, {
                status: 500,
                headers: { 'Access-Control-Allow-Origin': '*' }
            });
        }

        const payload = {
            // Strict Requirement: Data-Only Payload.
            // Helps preventing double notifications by suppressing browser default behavior.
            data: {
                title: title,
                body: content,
                url: body.url || '/',     // STRICT: Logic mapping
                icon: body.icon || '/icon.png'
            },
            android: {
                priority: 'high'          // STRICT: High priority for instant delivery
            }
        };

        // ADAPTING user snippet to the existing code's topic/token context:
        if (body.token) {
            payload.token = body.token;
        } else if (domain && domain !== 'all') {
            payload.topic = `domain_${domain.replace(/\./g, '_')}`;
        } else {
            payload.topic = 'all';
        }

        await fcm.send(payload);

        const response = NextResponse.json({ success: true, message: 'Notification sequence triggered' });
        response.headers.set('Access-Control-Allow-Origin', '*');
        return response;

    } catch (error) {
        console.error('API Send Error:', error);
        return NextResponse.json({ success: false, error: error.message }, {
            status: 500,
            headers: { 'Access-Control-Allow-Origin': '*' }
        });
    }
}
