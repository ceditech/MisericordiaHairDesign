import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { initializeApp, getApps } from "firebase-admin/app";
import { FieldValue } from "firebase-admin/firestore";

/**
 * Exercises the REAL firebase-admin SDK (through our lazy `adminDb` wrapper) against the
 * Firestore emulator, so SDK upgrades are checked by more than mocks.
 * Runs under `npm run test:rules` (the emulator sets FIRESTORE_EMULATOR_HOST).
 */
let adminDb: typeof import("@/src/lib/firebase/admin").adminDb;

beforeAll(async () => {
    if (!process.env.FIRESTORE_EMULATOR_HOST) throw new Error("Run through `npm run test:rules` (Firestore emulator required)");
    if (getApps().length === 0) initializeApp({ projectId: "demo-misericordia-rules" });
    ({ adminDb } = await import("@/src/lib/firebase/admin"));
});

beforeEach(async () => {
    await adminDb.collection("sdkProducts").doc("edge").set({ inventory: 10 });
    await adminDb.collection("sdkProducts").doc("gel").set({ inventory: 5 });
});

describe("firebase-admin against the emulator (via adminDb)", () => {
    it("reads and writes documents through the lazy wrapper (methods stay bound)", async () => {
        const ref = adminDb.collection("sdkOrders").doc("o1");
        await ref.set({ status: "pending_payment", total: 100 });
        const snap = await ref.get();
        expect(snap.exists).toBe(true);
        expect(snap.data()).toMatchObject({ status: "pending_payment", total: 100 });
        await ref.update({ "payment.status": "paid" });
        expect((await ref.get()).data()).toMatchObject({ payment: { status: "paid" } });
    });

    it("applies a batch with FieldValue.increment and serverTimestamp atomically", async () => {
        const edge = adminDb.collection("sdkProducts").doc("edge");
        const gel = adminDb.collection("sdkProducts").doc("gel");
        const order = adminDb.collection("sdkOrders").doc("o2");
        await order.set({ status: "pending_payment" });
        const batch = adminDb.batch();
        batch.update(edge, { inventory: FieldValue.increment(-2) });
        batch.update(gel, { inventory: FieldValue.increment(-1) });
        batch.update(order, { status: "paid", updatedAt: FieldValue.serverTimestamp() });
        await batch.commit();
        expect((await edge.get()).data()?.inventory).toBe(8);
        expect((await gel.get()).data()?.inventory).toBe(4);
        const paid = (await order.get()).data();
        expect(paid?.status).toBe("paid");
        expect(paid?.updatedAt).toBeDefined();
    });

    it("supports batch.set with a document reference (idempotency-event pattern)", async () => {
        const batch = adminDb.batch();
        batch.set(adminDb.collection("sdkEvents").doc("paypal_PP-1"), { provider: "paypal", at: FieldValue.serverTimestamp() });
        await batch.commit();
        expect((await adminDb.collection("sdkEvents").doc("paypal_PP-1").get()).exists).toBe(true);
    });

    it("runs transactions", async () => {
        const ref = adminDb.collection("sdkProducts").doc("edge");
        await adminDb.runTransaction(async (tx) => {
            const snap = await tx.get(ref);
            tx.update(ref, { inventory: (snap.data()?.inventory ?? 0) - 1 });
        });
        expect((await ref.get()).data()?.inventory).toBe(9);
    });

    it("queries collections (where/orderBy/limit) and reports a missing document as not existing", async () => {
        const res = await adminDb.collection("sdkProducts").where("inventory", ">=", 5).orderBy("inventory", "desc").limit(5).get();
        expect(res.docs.map((d) => d.id)).toEqual(["edge", "gel"]);
        expect((await adminDb.collection("sdkProducts").doc("nope").get()).exists).toBe(false);
    });
});
