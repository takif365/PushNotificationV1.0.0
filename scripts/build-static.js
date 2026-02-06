const fs = require('fs');
const path = require('path');

// Load env vars if in local dev (manual parsing to avoid dependencies)
try {
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
        console.log('Loaded keys:', Object.keys(process.env).filter(k => k.startsWith('NEXT_PUBLIC_')));
        console.log('Loaded env vars from .env.local');
    }
} catch (e) {
    console.warn('Failed to load .env.local', e);
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const SW_TEMPLATE = path.join(__dirname, 'sw-template.js');
const SW_OUTPUT = path.join(__dirname, '../public/sw.js');

const LOADER_TEMPLATE = path.join(__dirname, 'loader-template.js');
const LOADER_OUTPUT = path.join(__dirname, '../public/loader.js');

const REQUIRED_KEYS_SW = [
    'NEXT_PUBLIC_FIREBASE_API_KEY',
    'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
    'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
    'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
    'NEXT_PUBLIC_FIREBASE_APP_ID'
];

const REQUIRED_KEYS_LOADER = [
    'NEXT_PUBLIC_APP_URL',
    'NEXT_PUBLIC_FIREBASE_API_KEY',
    'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
    'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
    'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
    'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
    'NEXT_PUBLIC_FIREBASE_APP_ID',
    'NEXT_PUBLIC_FIREBASE_VAPID_KEY'
];

// ============================================================================
// HELPERS
// ============================================================================

function generateFile(templatePath, outputPath, keys) {
    if (!fs.existsSync(templatePath)) {
        console.warn(`Template not found: ${templatePath}`);
        return;
    }

    console.log(`Generating ${path.basename(outputPath)} from template...`);

    let template = fs.readFileSync(templatePath, 'utf8');
    let missingKeys = [];

    keys.forEach(key => {
        let value = process.env[key];

        // Fallback for NEXT_PUBLIC_APP_URL if not set
        if (key === 'NEXT_PUBLIC_APP_URL' && !value) {
            value = 'http://localhost:3000';
            console.warn('NEXT_PUBLIC_APP_URL not set, defaulting to http://localhost:3000');
        }

        if (!value) {
            missingKeys.push(key);
        } else {
            // Replace all occurrences
            template = template.replace(new RegExp(`{{${key}}}`, 'g'), value);
        }
    });

    if (missingKeys.length > 0) {
        console.warn(`WARNING: Missing environment variables for ${path.basename(outputPath)}:`);
        console.warn(missingKeys.join(', '));
    }

    fs.writeFileSync(outputPath, template);
    console.log(`Success! generated ${outputPath}`);
}

// ============================================================================
// EXECUTION
// ============================================================================

generateFile(SW_TEMPLATE, SW_OUTPUT, REQUIRED_KEYS_SW);
generateFile(LOADER_TEMPLATE, LOADER_OUTPUT, REQUIRED_KEYS_LOADER);
