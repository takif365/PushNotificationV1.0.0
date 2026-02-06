import { db } from '@/lib/firebase-admin';
import { verifyIdToken } from '@/lib/firebase-admin';

// DELETE: Delete domain by ID
export async function DELETE(req, context) {
    try {
        const token = req.headers.get('authorization')?.split('Bearer ')[1];
        const decodedToken = await verifyIdToken(token);

        if (!decodedToken) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // In Next.js 13+, params needs to be awaited
        const { id: domainId } = await context.params;

        if (!domainId) {
            return Response.json({ error: 'Domain ID is required' }, { status: 400 });
        }

        // Get domain document
        const domainRef = db.collection('domains').doc(domainId);
        const domainDoc = await domainRef.get();

        if (!domainDoc.exists) {
            return Response.json({ error: 'Domain not found' }, { status: 404 });
        }

        const domainData = domainDoc.data();

        // Check if user owns this domain
        if (domainData.userId !== decodedToken.uid) {
            return Response.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Delete all push tokens associated with this domain
        const tokensSnapshot = await db.collection('push_tokens')
            .where('domainId', '==', domainId)
            .get();

        const batch = db.batch();
        tokensSnapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
        });

        // Delete the domain itself
        batch.delete(domainRef);

        await batch.commit();

        return Response.json({
            success: true,
            message: 'Domain deleted successfully',
            deletedTokens: tokensSnapshot.size
        });
    } catch (error) {
        console.error('[API] Delete domain error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
}
