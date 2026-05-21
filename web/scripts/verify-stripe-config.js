const fs = require('fs');
const path = require('path');
const Stripe = require('stripe');

// Simple parser for .env.local since dotenv is not a direct dependency
function parseEnv() {
    const envPath = path.join(__dirname, '../.env.local');
    const content = fs.readFileSync(envPath, 'utf8');
    const lines = content.split('\n');
    const env = {};
    for (const line of lines) {
        const match = line.match(/^([^#\s=]+)\s*=\s*(.*)$/);
        if (match) {
            let value = match[2].trim();
            // Remove quotes if present
            if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
                value = value.substring(1, value.length - 1);
            }
            env[match[1]] = value;
        }
    }
    return env;
}

async function verify() {
  console.log('--- Stripe Configuration Verification ---');
  const env = parseEnv();
  const secretKey = env.STRIPE_SECRET_KEY;
  
  if (!secretKey) {
    console.error('❌ STRIPE_SECRET_KEY is missing from .env.local');
    process.exit(1);
  }
  console.log(`✅ Found Secret Key: ${secretKey.substring(0, 7)}... (length: ${secretKey.length})`);

  try {
    const stripe = new Stripe(secretKey, {
        typescript: true,
        appInfo: { name: "Dede's Braids (Verification)", version: "1.0.0" },
        maxNetworkRetries: 3,
        timeout: 30000, 
    });

    console.log('✅ Stripe instance created.');
    console.log('Testing connectivity to Stripe API...');
    
    // Test connectivity
    const balance = await stripe.balance.retrieve();
    console.log('✅ Connectivity successful! Stripe account balance retrieved.');
    console.log('Current Default API Version used by SDK:', stripe.getApiField('version'));
    
    console.log('\n--- SUCCESS: Stripe is correctly configured ---');
  } catch (err) {
    console.error('\n❌ ERROR: Stripe communication failed!');
    console.error('Reason:', err.message);
    process.exit(1);
  }
}

verify();
