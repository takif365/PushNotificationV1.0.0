import { db } from '@/lib/firebase-admin';
import { verifyIdToken } from '@/lib/firebase-admin';

export async function DELETE(req, { params }) {
    try {
        const token = req.headers.get('authorization')?.split('Bearer ')[1];
        const decodedToken = await verifyIdToken(token);

        if (!decodedToken) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;

        // Verify ownership
        const campaignDoc = await db.collection('campaigns').doc(id).get();
        if (!campaignDoc.exists) {
            return Response.json({ error: 'Campaign not found' }, { status: 404 });
        }

        if (campaignDoc.data().userId !== decodedToken.uid) {
            return Response.json({ error: 'Unauthorized' }, { status: 403 });
        }

        // Delete campaign
        await db.collection('campaigns').doc(id).delete();

        return Response.json({ success: true });
    } catch (error) {
        console.error('[API] Delete campaign error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
}
