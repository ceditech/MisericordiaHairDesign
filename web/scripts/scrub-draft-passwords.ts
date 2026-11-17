/**
 * One-time cleanup: removes plaintext `password` (and `createAccount`) fields that
 * older versions of the checkout wrote into Firestore `bookingDrafts` documents.
 *
 * Dry run by default (reports counts only; never prints emails or passwords).
 *   npx tsx scripts/scrub-draft-passwords.ts           # dry run
 *   npx tsx scripts/scrub-draft-passwords.ts --apply   # delete the fields
 *
 * Requires FIREBASE_SERVICE_ACCOUNT_KEY (or GOOGLE_APPLICATION_CREDENTIALS) in .env.local.
 * Any password that was stored must be treated as exposed: affected customers who
 * reuse it elsewhere should be told to change it.
 */
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env.local") });

import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "../src/lib/firebase/admin";

const BATCH_SIZE = 400;

async function main() {
    const apply = process.argv.includes("--apply");
    const snapshot = await adminDb.collection("bookingDrafts").get();

    const affected = snapshot.docs.filter((d) => {
        const data = d.data();
        return "password" in data || "createAccount" in data;
    });
    const withPassword = affected.filter((d) => "password" in d.data()).length;

    console.log(`bookingDrafts scanned: ${snapshot.size}`);
    console.log(`documents with a stored password: ${withPassword}`);
    console.log(`documents to clean (password and/or createAccount): ${affected.length}`);

    if (!apply) {
        console.log("Dry run only. Re-run with --apply to remove the fields.");
        return;
    }

    for (let i = 0; i < affected.length; i += BATCH_SIZE) {
        const batch = adminDb.batch();
        for (const d of affected.slice(i, i + BATCH_SIZE)) {
            batch.update(d.ref, { password: FieldValue.delete(), createAccount: FieldValue.delete() });
        }
        await batch.commit();
    }
    console.log(`Cleaned ${affected.length} documents.`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("Scrub failed:", error);
        process.exit(1);
    });
