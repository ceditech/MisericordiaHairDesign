import { collection, query, orderBy, onSnapshot, doc, updateDoc, serverTimestamp, limit } from "firebase/firestore";
import { getDb } from "../client";
import type { OwnerBooking, OwnerBookingDraft } from "@/src/lib/owner/types";

const db = getDb();

// --- Bookings ---

export function subscribeToBookings(callback: (bookings: OwnerBooking[]) => void, limitCount?: number, includeSeedData?: boolean) {
    let q = query(collection(db, "bookings"), orderBy("createdAt", "desc"));
    if (limitCount) {
        q = query(collection(db, "bookings"), orderBy("createdAt", "desc"), limit(limitCount));
    }
    return onSnapshot(q, (snapshot) => {
        let bookings = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as OwnerBooking);
        if (!includeSeedData) {
            bookings = bookings.filter((b) => !b.isSeedData);
        }
        callback(bookings);
    }, (error) => {
        console.error("Error subscribing to bookings:", error);
    });
}

/**
 * Subscribe to booking drafts for conversion calculation.
 */
export function subscribeToBookingDrafts(callback: (drafts: OwnerBookingDraft[]) => void, includeSeedData?: boolean) {
    const q = query(collection(db, "bookingDrafts"));
    return onSnapshot(q, (snapshot) => {
        let drafts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as OwnerBookingDraft);
        if (!includeSeedData) {
            drafts = drafts.filter((d) => !d.isSeedData);
        }
        callback(drafts);
    }, (error) => {
        console.error("Error subscribing to drafts:", error);
    });
}

export async function cancelBooking(bookingId: string) {
    const bookingRef = doc(db, "bookings", bookingId);
    await updateDoc(bookingRef, {
        status: "cancelled",
        updatedAt: serverTimestamp()
    });
}
