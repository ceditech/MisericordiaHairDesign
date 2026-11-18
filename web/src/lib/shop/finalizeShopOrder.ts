import { FieldValue, type Firestore, type WriteBatch } from "firebase-admin/firestore";

/**
 * Adds inventory decrements for a paid shop order to a batch.
 *
 * Only products that TRACK inventory (a numeric `inventory` field) are
 * decremented. Decrementing a product without that field would create a
 * negative number, and the order pricing treats `inventory <= 0` as out of stock,
 * so an untracked product would become unbuyable after its first sale.
 */
export async function addInventoryDecrements(
    db: Firestore,
    batch: WriteBatch,
    items: Array<{ productId?: string; quantity?: number }> | undefined,
): Promise<void> {
    const quantities = new Map<string, number>();
    for (const item of items ?? []) {
        if (typeof item.productId === "string" && Number.isInteger(item.quantity) && (item.quantity as number) > 0) {
            quantities.set(item.productId, (quantities.get(item.productId) ?? 0) + (item.quantity as number));
        }
    }

    const refs = [...quantities.keys()].map((id) => db.collection("products").doc(id));
    const snaps = await Promise.all(refs.map((ref) => ref.get()));
    snaps.forEach((snap, i) => {
        if (snap.exists && typeof snap.data()?.inventory === "number") {
            batch.update(refs[i], { inventory: FieldValue.increment(-(quantities.get(refs[i].id) as number)) });
        }
    });
}
