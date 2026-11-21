import { collection, query, orderBy, onSnapshot, doc, updateDoc, setDoc, serverTimestamp, getDocs } from "firebase/firestore";
import { getDb } from "../client";

const db = getDb();

// --- Admin Management ---

/** A `users` document as the admin screen lists it. */
export interface AssistantUser {
    id: string;
    role?: string | null;
    email?: string;
    name?: string;
    displayName?: string;
}

/**
 * Subscribe to users with the 'assistant' role.
 */
export function subscribeToAssistants(callback: (assistants: AssistantUser[]) => void) {
    const q = query(collection(db, "users"), orderBy("updatedAt", "desc"));
    return onSnapshot(q, (snapshot) => {
        const assistants = snapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }) as AssistantUser)
            .filter((u) => u.role === "assistant");
        callback(assistants);
    }, (error) => {
        console.error("Error subscribing to assistants:", error);
    });
}

/**
 * Update a user's role (promote/demote).
 */
export async function updateUserRole(uid: string, role: string | null) {
    const userRef = doc(db, "users", uid);
    await updateDoc(userRef, {
        role,
        updatedAt: serverTimestamp()
    });
}

/**
 * Find a user by email to promote them.
 */
export async function findUserByEmail(email: string) {
    const q = query(collection(db, "users"));
    const snapshot = await getDocs(q);
    const userDoc = snapshot.docs.find(d => d.data().email?.toLowerCase() === email.toLowerCase());
    return userDoc ? { id: userDoc.id, ...userDoc.data() } : null;
}

/**
 * Update the current user's profile info.
 */
export async function updateMyProfile(uid: string, data: { name?: string; phone?: string; imageUrl?: string; email?: string }) {
    const userRef = doc(db, "users", uid);
    await setDoc(userRef, {
        ...data,
        updatedAt: serverTimestamp()
    }, { merge: true });
}
