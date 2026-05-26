import { adminDb } from "@/src/lib/firebase/admin";

export interface GmailSenderConfig {
    email: string;
    name?: string;
    accessToken: string;
    refreshToken: string;
    expiryDate: number;
    isPrimary?: boolean;
    updatedAt?: any;
}

/**
 * Handles securely saving and retrieving the email sender configurations 
 * (OAuth tokens) from Firestore using the Firebase Admin SDK (Server-Side Only).
 */
export class SenderRepository {
    private static readonly LEGACY_CONFIG_DOC_ID = "primary_gmail";
    private static readonly PRIMARY_EMAIL = "sales@edxstore.com";
    private static readonly COLLECTION_NAME = "emailSenders";

    /**
     * Retrieves a configuration for a specific sender by email address.
     */
    static async getSender(email: string): Promise<GmailSenderConfig | null> {
        try {
            const db = adminDb;
            const docRef = db.collection(this.COLLECTION_NAME).doc(email.toLowerCase().trim());
            const docSnap = await docRef.get();

            if (docSnap.exists) {
                return docSnap.data() as GmailSenderConfig;
            }
            return null;
        } catch (error) {
            console.error(`[SenderRepository] Failed to get sender ${email}:`, error);
            return null;
        }
    }

    /**
     * Saves or updates the configuration for a sender.
     */
    static async saveSender(email: string, config: Omit<GmailSenderConfig, "updatedAt">): Promise<void> {
        try {
            const db = adminDb;
            const docRef = db.collection(this.COLLECTION_NAME).doc(email.toLowerCase().trim());
            await docRef.set({
                ...config,
                email: email.toLowerCase().trim(),
                updatedAt: new Date()
            });
        } catch (error) {
            console.error(`[SenderRepository] Failed to save sender ${email}:`, error);
            throw new Error(`Failed to securely save email sender configuration for ${email}.`);
        }
    }

    /**
     * Deletes a sender configuration (restricted for primary email).
     */
    static async deleteSender(email: string): Promise<void> {
        const normalizedEmail = email.toLowerCase().trim();
        if (normalizedEmail === this.PRIMARY_EMAIL) {
            throw new Error("The primary email sender configuration cannot be deleted.");
        }
        try {
            const db = adminDb;
            await db.collection(this.COLLECTION_NAME).doc(normalizedEmail).delete();
        } catch (error) {
            console.error(`[SenderRepository] Failed to delete sender ${email}:`, error);
            throw new Error(`Failed to delete email sender configuration for ${email}.`);
        }
    }

    /**
     * Retrieves all configured email senders.
     */
    static async getAllSenders(): Promise<GmailSenderConfig[]> {
        try {
            const db = adminDb;
            const snapshot = await db.collection(this.COLLECTION_NAME).get();
            const senders: GmailSenderConfig[] = [];
            snapshot.forEach((doc) => {
                // Skip the legacy document if it has been migrated/duplicated
                if (doc.id !== this.LEGACY_CONFIG_DOC_ID) {
                    senders.push(doc.data() as GmailSenderConfig);
                }
            });
            return senders;
        } catch (error) {
            console.error("[SenderRepository] Failed to get all senders:", error);
            return [];
        }
    }

    /**
     * Retrieves the primary Gmail configuration.
     * Falls back to legacy document ID if the primary email document is not yet configured.
     */
    static async getPrimarySender(): Promise<GmailSenderConfig | null> {
        try {
            // First check the standard primary email document ID
            const primary = await this.getSender(this.PRIMARY_EMAIL);
            if (primary) {
                return primary;
            }

            // Fallback to the legacy config doc ID
            const db = adminDb;
            const docRef = db.collection(this.COLLECTION_NAME).doc(this.LEGACY_CONFIG_DOC_ID);
            const docSnap = await docRef.get();

            if (docSnap.exists) {
                const legacyData = docSnap.data() as GmailSenderConfig;
                // If it is the primary email, we can return it.
                return legacyData;
            }
            return null;
        } catch (error) {
            console.error("[SenderRepository] Failed to get primary sender:", error);
            return null;
        }
    }

    /**
     * Saves or updates the primary Gmail configuration.
     * Saves to both the email document ID and the primary_gmail for complete backward compatibility.
     */
    static async savePrimarySender(config: Omit<GmailSenderConfig, "updatedAt">): Promise<void> {
        try {
            const db = adminDb;
            const emailDocRef = db.collection(this.COLLECTION_NAME).doc(this.PRIMARY_EMAIL);
            const legacyDocRef = db.collection(this.COLLECTION_NAME).doc(this.LEGACY_CONFIG_DOC_ID);
            
            const payload = {
                ...config,
                email: this.PRIMARY_EMAIL,
                isPrimary: true,
                updatedAt: new Date()
            };

            await emailDocRef.set(payload);
            await legacyDocRef.set(payload);
        } catch (error) {
            console.error("[SenderRepository] Failed to save primary sender:", error);
            throw new Error("Failed to securely save primary email sender configuration.");
        }
    }
}
