const webpush = require('web-push');
const fs = require('fs');
const path = require('path');

console.log('🔑 Generating VAPID keys...\n');

const vapidKeys = webpush.generateVAPIDKeys();

console.log('✅ VAPID keys generated successfully!\n');
console.log('📋 Add these to your .env.local file:\n');
console.log(`NEXT_PUBLIC_VAPID_PUBLIC_KEY=${vapidKeys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${vapidKeys.privateKey}`);
console.log(`VAPID_EMAIL=mailto:admin@example.com\n`);

const envPath = path.join(process.cwd(), '.env.local');
const envContent = `
# VAPID Keys (generated on ${new Date().toISOString()})
NEXT_PUBLIC_VAPID_PUBLIC_KEY=${vapidKeys.publicKey}
VAPID_PRIVATE_KEY=${vapidKeys.privateKey}
VAPID_EMAIL=mailto:admin@example.com

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# API Security
API_SECRET_KEY=${Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)}

# Configuration
RATE_LIMIT_WINDOW_SECONDS=3600
RATE_LIMIT_MAX_REQUESTS=100
BATCH_SIZE=100
SEND_DELAY_MS=100
MAX_CONCURRENT_SENDS=10

# Feature Flags
ENABLE_WELCOME_NOTIFICATION=true
ENABLE_CLICK_TRACKING=true
ENABLE_AUTO_CLEANUP=true
`;

try {
  if (fs.existsSync(envPath)) {
    console.log('⚠️  .env.local already exists. Please add keys manually.');
  } else {
    fs.writeFileSync(envPath, envContent.trim());
    console.log('✅ Keys and initial config written to .env.local');
  }
} catch (error) {
  console.error('❌ Error writing to .env.local:', error.message);
}
