const admin = require("firebase-admin");
const dotenv = require("dotenv");
const path = require("path");

// Load .env.local from the web directory
dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

console.log("--- Firebase Connection Test ---");
console.log("Project ID from Env:", process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID);

const accountJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

if (!accountJson) {
  console.error("Error: FIREBASE_SERVICE_ACCOUNT_KEY not found in .env.local");
  process.exit(1);
}

try {
  let clean = accountJson.trim();
  if ((clean.startsWith("'") && clean.endsWith("'")) || (clean.startsWith('"') && clean.endsWith('"'))) {
    clean = clean.slice(1, -1);
  }
  const serviceAccount = JSON.parse(clean);

  console.log("Private Key Sample (Before replace):", serviceAccount.private_key ? serviceAccount.private_key.substring(0, 50) : "MISSING");

  if (serviceAccount.private_key) {
    serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, "\n");
  }

  console.log("Private Key Sample (After replace):", serviceAccount.private_key ? serviceAccount.private_key.substring(0, 50) : "MISSING");


  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
  });

  const db = admin.firestore();
  const bucket = admin.storage().bucket();

  async function runTest() {
    try {
      console.log("Testing Firestore...");
      const collections = await db.listCollections();
      console.log("Successfully connected to Firestore. Collections found:", collections.length);

      console.log("Testing Storage...");
      const [exists] = await bucket.exists();
      console.log(`Bucket ${process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET} exists:`, exists);

      if (exists) {
        console.log("SUCCESS: Firebase Admin SDK is correctly configured.");
      } else {
        console.log("WARNING: Bucket does not seem to exist or is inaccessible.");
      }
    } catch (err) {
      console.error("Test failed with error:", err.message);
    } finally {
      process.exit(0);
    }
  }

  runTest();
} catch (err) {
  console.error("Failed to parse service account JSON:", err.message);
  process.exit(1);
}
