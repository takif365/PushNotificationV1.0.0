import { initializeApp, getApps, getApp } from "firebase/app";
import { getMessaging, getToken } from "firebase/messaging";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Helper to check if config is valid
const isConfigValid = !!(firebaseConfig.apiKey && firebaseConfig.projectId);

let app;
let db;
let messaging = null;

if (isConfigValid) {
    try {
        app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
        db = getFirestore(app);
        if (typeof window !== 'undefined') {
            messaging = getMessaging(app);
        }
    } catch (error) {
        console.error("Firebase initialization failed:", error);
    }
}

export { app, db, messaging, isConfigValid };

export const requestForToken = async () => {
    if (!messaging) {
        console.warn("Messaging not initialized. Check Firebase config.");
        return null;
    }
    try {
        const currentToken = await getToken(messaging, {
            vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
        });
        return currentToken;
    } catch (err) {
        console.error('An error occurred while retrieving token. ', err);
        return null;
    }
};
