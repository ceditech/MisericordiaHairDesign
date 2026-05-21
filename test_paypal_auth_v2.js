const https = require('https');
const fs = require('fs');
const path = require('path');

// Read .env.local directly
const envPath = path.join(process.cwd(), 'web', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');

function getEnv(key) {
    const match = envContent.match(new RegExp(`^${key}=(.*)$`, 'm'));
    return match ? match[1].trim() : null;
}

const clientId = getEnv('PAYPAL_CLIENT_ID');
const clientSecret = getEnv('PAYPAL_CLIENT_SECRET');

console.log("Testing credentials for Client ID:", clientId ? clientId.substring(0, 10) + "..." : "MISSING");

if (!clientId || !clientSecret) {
    console.error("Missing credentials in .env.local");
    process.exit(1);
}

const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

const req = https.request({
    hostname: 'api-m.sandbox.paypal.com',
    port: 443,
    path: '/v1/oauth2/token',
    method: 'POST',
    headers: {
        'Accept': 'application/json',
        'Accept-Language': 'en_US',
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
    }
}, (res) => {
    let rawData = '';
    res.on('data', (chunk) => { rawData += chunk; });
    res.on('end', () => {
        try {
            const parsedData = JSON.parse(rawData);
            if (res.statusCode === 200) {
                console.log("SUCCESS! Access Token:", parsedData.access_token.substring(0, 10) + "...");
                process.exit(0);
            } else {
                console.error(`FAILED! Status Code: ${res.statusCode}`);
                console.error(parsedData);
                process.exit(1);
            }
        } catch (e) {
            console.error("Error parsing response:", e.message);
            process.exit(1);
        }
    });
});

req.on('error', (e) => {
    console.error("Network Error:", e.message);
    process.exit(1);
});

req.write('grant_type=client_credentials');
req.end();
