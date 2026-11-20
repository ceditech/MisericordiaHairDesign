import { errorMessage } from "@/src/lib/errors";
import { applicationDefault, cert, getApps, initializeApp, type Credential } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

// Initialize Firebase Admin SDK
// This only executes on the server side
if (!getApps().length) {
    let credential: Credential | undefined;
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
            credential = cert(serviceAccount);
        } catch (e: unknown) {
            console.error("❌ Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY:", errorMessage(e));
        }
    } else {
        console.warn("⚠️ FIREBASE_SERVICE_ACCOUNT_KEY is missing. Falling back to default credentials.");
    }

    try {
        initializeApp({
            projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'dedesbraids',
            credential: credential || applicationDefault()
        });
        console.log("✅ Firebase Admin initialized successfully");
    } catch (e: unknown) {
        console.error("❌ Firebase Admin initialization failed:", errorMessage(e));
        console.error("👉 ACTION REQUIRED: Add a valid FIREBASE_SERVICE_ACCOUNT_KEY to .env.local");
    }
}

export const adminDb = getFirestore();
export const adminAuth = getAuth();
export const adminStorage = getStorage();
