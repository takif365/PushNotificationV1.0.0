import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';

if (!admin.apps.length) {
  try {
    const serviceAccountPath = path.join(process.cwd(), 'service-account.json');

    if (fs.existsSync(serviceAccountPath)) {
      const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      console.log("Firebase Admin Initialized Successfully (via JSON)");
    } else {
      const privateKey = (process.env.FIREBASE_PRIVATE_KEY || '')
        .replace(/\\n/g, '\n')
        .trim()
        .replace(/^["']|["']$/g, '');

      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: privateKey,
        }),
      });
      console.log("Firebase Admin Initialized Successfully (via Env Vars)");
    }
  } catch (error) {
    console.error("Firebase Admin Initialization Error:", error);
  }
}

const app = admin.apps[0];
export const db = app ? app.firestore() : null;
export const fcm = app ? app.messaging() : null;
export const auth = app ? app.auth() : null;

// Helper functions needed for API calls
export async function getAccessToken() {
  if (!app) throw new Error('Not initialized');
  const token = await app.options.credential.getAccessToken();
  return token.access_token;
}

// هذه هي الوظيفة التي يطلبها الـ API حالياً
export async function verifyIdToken(token) {
  if (!auth) {
    console.error("Auth not initialized");
    return null;
  }
  try {
    return await auth.verifyIdToken(token);
  } catch (error) {
    console.error("Error verifying ID token:", error);
    return null;
  }
}

export { admin };