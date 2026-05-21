import { adminDb } from "@/src/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";

/**
 * Shared utility to track affiliate code usage and commission logic.
 * Called when a payment is finalized (Stripe Webhook or PayPal Capture).
 */
export async function processAffiliateConversion(data: {
    promoCode: string;
    bookingId: string;
    amountCents: number;
    clientId?: string;
    clientEmail?: string;
    clientName?: string;
    eventId: string; // Stripe Event ID or PayPal Order ID for idempotency
}) {
    const { promoCode, bookingId, amountCents, clientId, clientEmail, clientName, eventId } = data;

    // Only process codes that we track in our 'codes' collection
    if (!promoCode) return;

    try {
        console.log(`[AffiliateTracker] Processing conversion for code: ${promoCode}, booking: ${bookingId}`);
        
        const codeRef = adminDb.collection("codes").doc(promoCode);
        const codeSnap = await codeRef.get();

        if (!codeSnap.exists) {
            console.warn(`[AffiliateTracker] Code ${promoCode} not found in 'codes' collection.`);
            return;
        }

        const codeData = codeSnap.data()!;
        if (!codeData.active) {
            console.warn(`[AffiliateTracker] Code ${promoCode} is inactive.`);
            return;
        }

        const affiliateId = codeData.affiliateId;
        const discountPercent = codeData.discountPercent || 10;
        const category = codeData.category || "unknown";

        // 1. Increment Usage Count on the Code
        await codeRef.update({
            usageCount: FieldValue.increment(1),
            lastUsedAt: FieldValue.serverTimestamp()
        });

        // 1b. Also update the affiliate document if it exists
        if (affiliateId) {
            await adminDb.collection("affiliates").doc(affiliateId).set({
                usageCount: FieldValue.increment(1),
                updatedAt: FieldValue.serverTimestamp()
            }, { merge: true });
        }

        // 2. Log Usage Record (Who, When, What)
        const usageId = `usage_${eventId}_${promoCode}`;
        await adminDb.collection("promoUsages").doc(usageId).set({
            id: usageId,
            code: promoCode,
            affiliateId: affiliateId || null,
            bookingId,
            clientId: clientId || null,
            clientEmail: clientEmail || null,
            clientName: clientName || null,
            category, // client vs general
            amountCents,
            createdAt: FieldValue.serverTimestamp()
        });

        // 3. Handle Commission for General Affiliates
        if (category === "general" && affiliateId) {
            // Default 10% commission for general affiliates
            const commissionCents = Math.floor(amountCents * 0.10);
            const commissionId = `comm_${eventId}_${affiliateId}`;

            // Record the commission record
            await adminDb.collection("commissions").doc(commissionId).set({
                id: commissionId,
                affiliateId,
                bookingId,
                amountCents: commissionCents,
                bookingTotalCents: amountCents,
                status: "pending",
                createdAt: FieldValue.serverTimestamp(),
                type: "service_referral"
            });

            // Update affiliate's balance
            await adminDb.collection("affiliates").doc(affiliateId).set({
                payoutsDueCents: FieldValue.increment(commissionCents),
                totalEarningsCents: FieldValue.increment(commissionCents),
                updatedAt: FieldValue.serverTimestamp()
            }, { merge: true });
            
            console.log(`[AffiliateTracker] ✅ Commission of ${commissionCents} cents recorded for ${affiliateId}`);
        } else if (category === "client") {
            // For clients, we just track the usage. 
            // The user mentioned "Code should be used as coupon to affect the price" - handled in checkout.
            // "Added Affiliate codes usage tracked" - handled by promoUsages.
            console.log(`[AffiliateTracker] ✅ Client referral tracked for ${promoCode}`);
        }

    } catch (error) {
        console.error("[AffiliateTracker] Error processing conversion:", error);
        // We don't throw here to avoid crashing the main payment finalization
    }
}
