import { 
    collection, 
    addDoc, 
    setDoc, 
    doc, 
    serverTimestamp, 
    query, 
    where, 
    getDocs,
    onSnapshot,
    orderBy
} from "firebase/firestore";
import { getDb } from "../firebase/client";
import { AffiliateType, AffiliateProfile } from "./types";

const db = getDb();

/**
 * Generates a unique referral code in the format DB-AFF-XXXXXX
 */
export function generateCode(): string {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let randomPart = "";
    for (let i = 0; i < 6; i++) {
        randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `DB-AFF-${randomPart}`;
}

/**
 * Creates an affiliate profile via the API (Server-side)
 */
export async function createAffiliateProfile(data: {
    name: string;
    email: string;
    type: AffiliateType;
}): Promise<AffiliateProfile> {
    const response = await fetch("/api/affiliate/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate affiliate code");
    }

    return response.json();
}

/**
 * Fetches all affiliates from Firestore (Admin only)
 */
export function subscribeToAffiliates(callback: (affiliates: AffiliateProfile[]) => void) {
    const q = query(collection(db, "affiliates"), orderBy("createdAt", "desc"));
    return onSnapshot(q, (snapshot) => {
        const affiliates = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as AffiliateProfile[];
        callback(affiliates);
    });
}

/**
 * Resends the affiliate welcome email via the API
 */
export async function sendAffiliateCodeEmail(profile: AffiliateProfile): Promise<{ ok: true }> {
    const response = await fetch("/api/affiliate/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to resend email");
    }

    return { ok: true };
}
