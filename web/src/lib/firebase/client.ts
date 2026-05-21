import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getFirestore, Firestore, connectFirestoreEmulator } from "firebase/firestore";
import { getAuth, Auth, connectAuthEmulator } from "firebase/auth";
import { getStorage, FirebaseStorage, connectStorageEmulator } from "firebase/storage";
import { getAnalytics, Analytics, isSupported } from "firebase/analytics";

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase
let app: FirebaseApp;
if (!getApps().length) {
    app = initializeApp(firebaseConfig);
} else {
    app = getApp();
}

const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

// Emulator toggle logic
const useEmulators = process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === "true";

if (typeof window !== "undefined" && useEmulators) {
    console.log("🛠️ Using Firebase Emulators");
    connectFirestoreEmulator(db, "localhost", 8080);
    connectAuthEmulator(auth, "http://localhost:9099");
    connectStorageEmulator(storage, "localhost", 9199);
}

/**
 * Returns the initialized Firebase app instance.
 */
export const getFirebaseApp = () => app;

/**
 * Returns the Firestore instance.
 */
export const getDb = (): Firestore => db;

/**
 * Returns the Auth instance.
 */
export const getAuthInstance = (): Auth => auth;

/**
 * Returns the Storage instance.
 */
export const getStorageInstance = (): FirebaseStorage => storage;

/**
 * Returns the Analytics instance (client-side only).
 */
export const getAnalyticsInstance = async (): Promise<Analytics | null> => {
    if (typeof window !== "undefined" && await isSupported()) {
        return getAnalytics(app);
    }
    return null;
};
