import { errorCode, errorMessage } from "@/src/lib/errors";
import type { BookingDraft } from "@/src/lib/bookingDraft";

interface AccountCreationDeps {
    signUp: (email: string, password: string) => Promise<{ user: { uid: string } }>;
    /** Writes the new user's profile document. */
    writeProfile: (uid: string, draft: BookingDraft) => Promise<void>;
}

/**
 * Creates an account for a guest who asked for one at booking time. Returns the new user's id, or null when no
 * account was created (the booking then goes ahead as a guest booking tied to the email).
 *
 * Only an invalid email stops the booking (it throws a message for the visitor). An email that already has an
 * account, or any other failure, is not an error here.
 */
export async function attemptAccountCreation(isSignedIn: boolean, draft: BookingDraft, deps: AccountCreationDeps): Promise<string | null> {
    if (isSignedIn || !draft.createAccount || !draft.password) return null;

    let uid: string | null = null;
    try {
        const credential = await deps.signUp(draft.email, draft.password);
        uid = credential.user.uid;
        await deps.writeProfile(uid, draft);
    } catch (err: unknown) {
        const code = errorCode(err);
        if (code === "auth/email-already-in-use") {
            console.warn("[Checkout] Email in use. Proceeding as guest linked to this email.");
        } else if (code === "auth/invalid-email") {
            throw new Error("The email provided is invalid. Please double-check it.");
        } else {
            console.error("[Checkout] Account creation failed:", code, errorMessage(err, ""));
        }
    }
    // If the account was created but its profile write failed, the booking still links to the new user.
    return uid;
}
