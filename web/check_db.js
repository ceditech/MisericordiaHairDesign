const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf-8');
env.split('\n').forEach(line => {
    const m = line.match(/^([^=]+)=(.*)$/);
    if(m) {
        let val = m[2].trim();
        if ((val.startsWith("'") && val.endsWith("'")) || (val.startsWith('"') && val.endsWith('"'))) {
            val = val.slice(1, -1);
        }
        process.env[m[1].trim()] = val;
    }
});
const admin = require('firebase-admin');
const accountJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
let serviceAccount = JSON.parse(accountJson);
if (serviceAccount.private_key) {
    serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
}
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();
async function run() {
    const email = 'edxpublishing@gmail.com';
    const snapshot = await db.collection('bookings').where('clientEmail', '==', email).get();
    console.log('Bookings:', snapshot.size);
    snapshot.forEach(doc => console.log(doc.id, doc.data()));
    
    const drafts = await db.collection('bookingDrafts').where('clientEmail', '==', email).get();
    console.log('Drafts:', drafts.size);
    drafts.forEach(doc => console.log(doc.id, doc.data()));
}
run().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
