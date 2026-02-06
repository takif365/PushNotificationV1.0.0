
require('dotenv').config({ path: '.env.local' });
const { admin, db } = require('../lib/firebase-admin');

async function testInit() {
    console.log('Testing Firebase Admin Initialization...');
    try {
        if (admin.apps.length) {
            console.log('Admin app initialized successfully.');
            // Try a simple operation
            const collections = await db.listCollections();
            console.log(`Successfully connected to Firestore. Found ${collections.length} collections.`);
        } else {
            console.error('Admin app NOT initialized.');
        }
    } catch (error) {
        console.error('Initialization Failed:', error);
    }
}

testInit();
