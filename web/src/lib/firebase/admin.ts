import { applicationDefault, cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getStorage, type Storage } from "firebase-admin/storage";

/**
 * loadServiceAccountFromEnv
 * Helper to parse FIREBASE_SERVICE_ACCOUNT_KEY or FIREBASE_SERVICE_ACCOUNT_KEY_BASE64
 */
function loadServiceAccountFromEnv() {
  const accountJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  const accountBase64 = process.env.FIREBASE_SERVICE_ACCOUNT_KEY_BASE64;

  if (accountBase64) {
    try {
      const decoded = Buffer.from(accountBase64, "base64").toString("utf8");
      return JSON.parse(decoded);
    } catch (err: any) {
      console.error("[Firebase Admin] Failed to decode FIREBASE_SERVICE_ACCOUNT_KEY_BASE64:", err.message);
    }
  }

  if (accountJson) {
    try {
      // Clean string case: remove surrounding quotes if present
      let clean = accountJson.trim();
      if ((clean.startsWith("'") && clean.endsWith("'")) || (clean.startsWith('"') && clean.endsWith('"'))) {
        clean = clean.slice(1, -1);
      }
      return JSON.parse(clean);
    } catch (err: any) {
      console.error("[Firebase Admin] Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY JSON:", err.message);
    }
  }

  return null;
}

// Lazy-init helper to prevent build-time crashes when secrets are missing
let initialized = false;
function ensureInit() {
  if (initialized) return;
  if (getApps().length > 0) {
    initialized = true;
    return;
  }

  const serviceAccount = loadServiceAccountFromEnv();
  if (serviceAccount) {
    if (serviceAccount.private_key) {
      serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, "\n");
    }
    initializeApp({
      credential: cert(serviceAccount),
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || `${serviceAccount.project_id}.firebasestorage.app`,
    });
    initialized = true;
  } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    initializeApp({
      credential: applicationDefault(),
    });
    initialized = true;
  } else {
    // If we are building, don't throw. If we are running, this will fail on first use.
    if (process.env.NODE_ENV === "production" && !process.env.NEXT_RUNTIME) {
        console.warn("[Firebase Admin] No credentials found during build phase. Skipping init.");
        return;
    }
    // Only throw if we are actually trying to use it in a request handler
    console.warn("[Firebase Admin] No credentials found. Initialization delayed.");
  }
}

/**
 * Lazily-initialized singletons. The proxy defers initialization until first use (so builds
 * without credentials do not crash) and binds methods to the real SDK object.
 */
function lazy<T extends object>(resolve: () => T): T {
  return new Proxy({} as T, {
    get: (_, prop) => {
      ensureInit();
      const target = resolve() as Record<string | symbol, unknown>;
      const value = target[prop];
      return typeof value === "function" ? (value as (...args: unknown[]) => unknown).bind(target) : value;
    },
  });
}

export const adminDb: Firestore = lazy(() => getFirestore());
export const adminAuth: Auth = lazy(() => getAuth());
export const adminStorage: Storage = lazy(() => getStorage());
export const adminApp: App = lazy(() => getApps()[0]);
