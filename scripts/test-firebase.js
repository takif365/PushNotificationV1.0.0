const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// 1. Manually load .env.local to match Next.js behavior or manual script behavior
const envPath = path.resolve(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf8');
    envConfig.split('\n').forEach(line => {
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) {
            const key = match[1].trim();
            const value = match[2].trim().replace(/^["'](.*)["']$/, '$1'); // Remove quotes
            if (!process.env[key]) {
                process.env[key] = value;
            }
        }
    });
    console.log('Loaded .env.local');
}

// 2. Attempt Initialization (Copying logic from lib/firebase-admin.js)
console.log('Testing Firebase Admin Initialization...');
console.log('Project ID:', process.env.FIREBASE_PROJECT_ID);
console.log('Client Email:', process.env.FIREBASE_CLIENT_EMAIL);
const rawKey = process.env.FIREBASE_PRIVATE_KEY;
console.log('Private Key length:', rawKey ? rawKey.length : 'MISSING');

try {
    const privateKey = rawKey ? rawKey.replace(/\\n/g, '\n') : undefined;

    // Check if key looks valid (has headers)
    if (privateKey && !privateKey.includes('BEGIN PRIVATE KEY')) {
        console.warn('WARNING: Private key does not contain standard header.');
    }

    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: privateKey,
        }),
    });
    console.log("✅ Firebase Admin Initialized Successfully!");

    // Test actual connection (The error happens here usually)
    console.log("Testing Firestore Connection...");
    const db = admin.firestore();
    db.collection('campaigns').limit(1).get()
        .then(snapshot => {
            console.log(`✅ Firestore Connection Successful! Found ${snapshot.size} docs.`);
            process.exit(0);
        })
        .catch(error => {
            console.error("❌ Firestore Connection Failed:");
            console.error(error);
            process.exit(1);
        });

} catch (error) {
    console.error("❌ Firebase Admin Initialization Error:");
    console.error(error);
}
