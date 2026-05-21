const fs = require('fs');
const path = require('path');

const keyPath = path.resolve(__dirname, '../../keys/dedesbraids-site-firebase-adminsdk-fbsvc-8e98adc61a.json');
const key = JSON.parse(fs.readFileSync(keyPath, 'utf8'));

// Firebase Admin expects newlines in the private key.
// When stored in .env, we want it to be a single line JSON string.
// So we want the newlines to be escaped as \n inside the JSON string.
const minified = JSON.stringify(key);

console.log('--- Copy this to .env.local ---');
console.log(`FIREBASE_SERVICE_ACCOUNT_KEY='${minified}'`);
