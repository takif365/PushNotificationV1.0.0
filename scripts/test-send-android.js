const admin = require('firebase-admin');

// Hardcoded credentials for this test script ONLY
const serviceAccount = {
    projectId: "push-notification-d1fb7",
    clientEmail: "firebase-adminsdk-fbsvc@push-notification-d1fb7.iam.gserviceaccount.com",
    privateKey: "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDNAlQlSon4PFz3\n3XdlyVbIU1RcdkuwtilmIw4B3XcVb/Fd3AVVp8nB0Iew+i1G0cO3TCcToqb5dl5P\nKi1g7KVhhAdRp2Whv6TZ4MUE2v1sLp6gyZXCSPxuR2ZMLgHAioUYbNhJGjwoN7Iu\nYOUZnsBLobi5h4rNZJUlZA6oHir6xkghKqqggKMFIDVdDaUE/BE9EjYZ6ird9+0m\n9wwka+dmhpY+UBzp/UB5XfKnnSG5uHTKAyP6YL8FTdZD/L0qPadXOPsIXJr7OEmr\nDL6Tpes56y/L+zu9jXcFeQY8ZnHXpapXWz3Zr0Za4CiqSM83XoYTjj7Gxb1f0yMa\nZwMyEarBAgMBAAECggEAHpEP0cWU37XEWNKlCECmV1URWX3r2Cu47XkhkAagyEn6\nD3gMNZLAYs0ARlNu58XD7DMHCobwZXaQJjaQMIjoOatxWevfG+hSoIfCaHBsY7Jp\nxWh5E1BFjv3HU2lyqm4c3SDxeKjYOljfkMmyrwi7/CrfO45plClAkaQjCU8CMoSU\nT5JcK/9bZDoVNmoFxY2hw1iXNCf90b0N+4cQo1GCNNeSgLD/8ev3g2smlqWHxREb\nzvHlgs69EKOi1hqGCH6kH+jC2muPrDCP8DmOri1AH8vUTwn9JBZRRHoloBk2TLgX\nrwxKVQ7mvDN8LjfiiA4E3x+m7bFxMfrk9asLUsV7KQKBgQD5w4zBHgU0OWQuN4aQ\nNCUfX+JmMa7uKxtB/4+X66vplx9D3cNKB1l+fShWYD+vlriS4QolBjmlfvSqfBFL\nKrsnpWfu2NuRmho1CndjBlpkjwKO4MOr6Lw/KyjsVVvpAS0sdzEwzET3l+fHbWEa\nBr0Hz8bMHcwtGxP9gC1GdEj5BQKBgQDSILawjr4Ltdv6jufQnmWMfSwurJx8siht\n4uFdcey2PUlXbTQ3ZgCArMwK+SwM7ce6nFYUsXh9Nr0N0QcECrs3OlPdFrjt0y4j\nEXyQJxU1WIc+2QBN388Fc7VKbdZgLeX6daeE97DC3wylyASmlfdBoyrvlEgErynG\n5ImyHAnnjQKBgBntLahCSIICTx7pDqPbddsK5gJ7t8/rU5oHQE2h3ieSU2GFHKeL\nmcOilFRbC2FbwO8mQxpSyhse0aD83gKyfdkAt4g4pJo5p+zHmFsEJs/3dGmGdWlb\n8GaSQV4/Ahpuz9Skzstk+OfGsf2mogTEnEy6ScWYdkBcZjfTXV/J5GVNAoGBAJCY\nZl70ux5/1JKEyEys0yBr+n1b1ouQZXXIjGCrRsLZRaDdyvLcRDhHsFlUwdVbwvdN\nIYc34Lv5cPsS/grv/4ivoIohWrx9d+A15kukOVnuQ5Mh7K2p92G/D9/Z2Y1xyDIj\nyFUdxQs0RhXGoDyqMe1/BMq8dRqUFuGA3qgr1zz5AoGBAOpcLhruRDP+kbjudVRF\nGIK48D46/FxyKSAIaAqygaIPNzknR7I5szlVGFi2ZGeaJNpcUaS9vAOvu6ktG0EK\nAuTXIgBMvA1+VX1y44jy3Ok629eRWNK8NhgfNNX374irNvFskKk1LsBngtPbKr9j\nwYdcxWVU1vs9HAV0r5yl6RLB\n-----END PRIVATE KEY-----\n"
};

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();
const fcm = admin.messaging();

async function sendTestCampaign() {
    try {
        console.log('🔍 Finding domain ff88.site...');
        const domainsSnap = await db.collection('domains').where('domain', '==', 'ff88.site').get();

        if (domainsSnap.empty) {
            console.error('❌ Domain ff88.site not found in DB!');
            return;
        }

        const domainId = domainsSnap.docs[0].id;
        console.log(`✅ Found domain ID: ${domainId}`);

        console.log('🔍 Finding Android tokens for this domain...');
        const tokensSnap = await db.collection('push_tokens')
            .where('domainId', '==', domainId)
            // .where('platform', '==', 'android') // Let's try sending to ALL for now to be sure
            .get();

        if (tokensSnap.empty) {
            console.error('❌ No tokens found for ff88.site!');
            return;
        }

        console.log(`✅ Found ${tokensSnap.size} tokens. Sending notifications...`);

        const messages = tokensSnap.docs.map(doc => {
            const token = doc.data().token;
            return {
                token: token,
                notification: {
                    title: 'نظام الإشعارات يعمل! 🎉',
                    body: 'هذه رسالة تجريبية من منصتك الجديدة على أندرويد.'
                },
                webpush: {
                    fcm_options: {
                        link: 'https://www.google.com/'
                    }
                }
            };
        });

        const batchResponses = await Promise.all(
            messages.map(msg => fcm.send(msg)
                .then(res => ({ success: true, id: res }))
                .catch(err => ({ success: false, error: err }))
            )
        );

        let sent = 0;
        let failed = 0;

        batchResponses.forEach(res => {
            if (res.success) sent++;
            else {
                failed++;
                console.error('Failed to send:', res.error);
            }
        });

        console.log('-----------------------------------');
        console.log(`🎉 Results: Sent: ${sent}, Failed: ${failed}`);
        console.log('-----------------------------------');

    } catch (error) {
        console.error('Script error:', error);
    }
}

sendTestCampaign();
