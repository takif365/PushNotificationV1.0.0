import admin from 'firebase-admin';
import serviceAccount from '@/service-account.json';

function getFirebaseAdmin() {
    if (admin.apps.length > 0) return admin.app();

    try {
        return admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            projectId: serviceAccount.project_id
        });
    } catch (error) {
        console.error('❌ Firebase admin initialization error:', error);
        return null;
    }
}

const app = getFirebaseAdmin();

// Export services
const db = app ? app.firestore() : null;
const fcm = app ? app.messaging() : null;
const auth = app ? app.auth() : null;

// Helper: Get FCM Access Token for HTTP v1 API
export async function getAccessToken() {
    if (!app) {
        throw new Error('Firebase Admin not initialized');
    }
    try {
        // Use the credential directly from the initialized app options
        const token = await app.options.credential.getAccessToken();
        return token.access_token;
    } catch (error) {
        console.error('[FCM] Failed to get access token:', error);
        throw error;
    }
}

// Helper: Verify ID Token
export async function verifyIdToken(token) {
    if (!auth) {
        console.error('[Auth] Firebase Admin not initialized');
        return null;
    }
    try {
        const decodedToken = await auth.verifyIdToken(token);
        return decodedToken;
    } catch (error) {
        console.error('[Auth] Failed to verify token:', error);
        return null;
    }
}

export { admin, db, fcm, auth };
