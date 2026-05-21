import * as admin from 'firebase-admin';

// Initialize Firebase Admin SDK
// This only executes on the server side
if (!admin.apps.length) {
    let credential;
    const serviceAccountVar = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

    if (serviceAccountVar) {
        try {
            // Clean the string - some loaders include surrounding quotes in the value
            let cleanVar = serviceAccountVar.trim();
            if ((cleanVar.startsWith("'") && cleanVar.endsWith("'")) || 
                (cleanVar.startsWith('"') && cleanVar.endsWith('"'))) {
                cleanVar = cleanVar.slice(1, -1);
            }
            
            console.log("[Firebase Admin] Attempting to parse service account key (length:", cleanVar.length, ")");
            const serviceAccount = JSON.parse(cleanVar);
            
            if (!serviceAccount.private_key) {
                throw new Error("Service account key is missing 'private_key'. Ensure you copied the full JSON from Firebase Console.");
            }
            credential = admin.credential.cert(serviceAccount);
        } catch (e: any) {
            console.error("❌ Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY:", e.message);
        }
    } else {
        console.warn("⚠️ FIREBASE_SERVICE_ACCOUNT_KEY is missing. Falling back to default credentials.");
    }

    try {
        admin.initializeApp({
            projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'dedesbraids',
            credential: credential || admin.credential.applicationDefault()
        });
        console.log("✅ Firebase Admin initialized successfully");
    } catch (e: any) {
        console.error("❌ Firebase Admin initialization failed:", e.message);
        console.error("👉 ACTION REQUIRED: Add a valid FIREBASE_SERVICE_ACCOUNT_KEY to .env.local");
    }
}

export const adminDb = admin.firestore();
export const adminAuth = admin.auth();
export const adminStorage = admin.storage();
