import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { initializeTestEnvironment, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { doc, setDoc } from "firebase/firestore";

// Rules live at the repo root, one level above web/.
const FIRESTORE_RULES = resolve(__dirname, "../../../firestore.rules");
const STORAGE_RULES = resolve(__dirname, "../../../storage.rules");

/** Emails the current firestore.rules treat as owner (hard-coded in the rules). */
export const OWNER_ALLOWLIST_EMAIL = "sales@edxstore.com";
/** The business owner's account. It is on the rules allowlist only while its email is verified. */
export const OWNER_GMAIL = "mariefleurekpe@gmail.com";

export async function createRulesEnv(projectId: string): Promise<RulesTestEnvironment> {
    // Hosts/ports are discovered from the emulator hub that `firebase emulators:exec` starts.
    return initializeTestEnvironment({
        projectId,
        firestore: { rules: readFileSync(FIRESTORE_RULES, "utf8") },
        storage: { rules: readFileSync(STORAGE_RULES, "utf8") },
    });
}

/** Writes documents bypassing security rules (test fixtures only). */
export async function seedDocs(env: RulesTestEnvironment, docs: Record<string, Record<string, unknown>>) {
    await env.withSecurityRulesDisabled(async (ctx) => {
        for (const [path, data] of Object.entries(docs)) {
            await setDoc(doc(ctx.firestore(), path), data);
        }
    });
}

/** Auth contexts used across rules tests. */
export const actors = {
    anon: (env: RulesTestEnvironment) => env.unauthenticatedContext(),
    /** Signed-in user with no staff role. */
    client: (env: RulesTestEnvironment) => env.authenticatedContext("client1", { email: "client@example.com" }),
    /** Owner through the hard-coded email allowlist in the rules. */
    ownerByEmail: (env: RulesTestEnvironment) =>
        env.authenticatedContext("ownerEmail1", { email: OWNER_ALLOWLIST_EMAIL }),
    /** The owner's Gmail account, with the email verified or not. */
    ownerGmail: (env: RulesTestEnvironment, emailVerified: boolean) =>
        env.authenticatedContext("ownerGmail1", { email: OWNER_GMAIL, email_verified: emailVerified }),
    /** Staff through a users/{uid}.role document (seed it first with seedStaff). */
    staff: (env: RulesTestEnvironment, uid: string) => env.authenticatedContext(uid, { email: `${uid}@example.com` }),
};

export async function seedStaff(env: RulesTestEnvironment, uid: string, role: string) {
    await seedDocs(env, { [`users/${uid}`]: { role, email: `${uid}@example.com` } });
}
