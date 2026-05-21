import { adminDb } from "@/src/lib/firebase/admin";

export interface GmailSenderConfig {
    email: string;
    accessToken: string;
    refreshToken: string;
    expiryDate: number;
    updatedAt?: any;
}

/**
 * Handles securely saving and retrieving the email sender configuration 
 * (OAuth tokens) from Firestore using the Firebase Admin SDK (Server-Side Only).
 */
export class SenderRepository {
    private static readonly CONFIG_DOC_ID = "primary_gmail";
    private static readonly COLLECTION_NAME = "emailSenders";

    /**
     * Retrieves the primary Gmail configuration.
     */
    static async getPrimarySender(): Promise<GmailSenderConfig | null> {
        try {
            const db = adminDb;
            const docRef = db.collection(this.COLLECTION_NAME).doc(this.CONFIG_DOC_ID);
            const docSnap = await docRef.get();

            if (docSnap.exists) {
                return docSnap.data() as GmailSenderConfig;
            }
            return null;
        } catch (error) {
            console.error("[SenderRepository] Failed to get primary sender:", error);
            return null;
        }
    }

    /**
     * Saves or updates the primary Gmail configuration.
     */
    static async savePrimarySender(config: Omit<GmailSenderConfig, "updatedAt">): Promise<void> {
        try {
            const db = adminDb;
            const docRef = db.collection(this.COLLECTION_NAME).doc(this.CONFIG_DOC_ID);
            
            // Note: FieldValue requires a Firebase Admin reference. We can import it directly or use a simple hack if we don't want to import it here.
            // But actually we can import * as admin from 'firebase-admin' for FieldValue. Let's do it cleanly by just using a Date object for updatedAt since we are server side.
            await docRef.set({
                ...config,
                updatedAt: new Date()
            });
        } catch (error) {
            console.error("[SenderRepository] Failed to save primary sender:", error);
            throw new Error("Failed to securely save email sender configuration.");
        }
    }
}
