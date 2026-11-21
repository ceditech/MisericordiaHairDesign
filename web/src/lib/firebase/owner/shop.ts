import { collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc, setDoc, serverTimestamp, limit } from "firebase/firestore";
import { getDb } from "../client";
import { Product } from "@/src/data/products";
import type { OwnerShopOrder } from "@/src/lib/owner/types";

const db = getDb();

// --- Products ---

/** `T` is the view of the document the caller expects (defaults to the storefront `Product`). */
export function subscribeToProducts<T = Product>(callback: (products: T[]) => void) {
    const q = query(collection(db, "products"), orderBy("updatedAt", "desc"));
    return onSnapshot(q, (snapshot) => {
        const products = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as T[];
        callback(products);
    }, (error) => {
        console.error("Error subscribing to products:", error);
    });
}

/**
 * Fields the owner screen writes to a `products` document. The screen edits `category` as free text
 * and sets `price`/`stock`, which the static catalog type (`Product`) does not model.
 */
export type ProductWrite = Omit<Partial<Product>, "category" | "stockStatus"> & {
    id: string;
    category?: string;
    stockStatus?: string;
    description?: string;
    price?: number;
    stock?: number;
    imageUrl?: string;
    isActive?: boolean;
};

export async function upsertProduct(product: ProductWrite) {
    const productRef = doc(db, "products", product.id);
    await setDoc(productRef, {
        ...product,
        updatedAt: serverTimestamp()
    }, { merge: true });
}

export async function deleteProduct(productId: string) {
    const productRef = doc(db, "products", productId);
    await deleteDoc(productRef);
}

// --- Shop Orders ---

export function subscribeToShopOrders(callback: (orders: OwnerShopOrder[]) => void, limitCount?: number, includeSeedData?: boolean) {
    let q = query(collection(db, "shopOrders"), orderBy("createdAt", "desc"));
    if (limitCount) {
        q = query(collection(db, "shopOrders"), orderBy("createdAt", "desc"), limit(limitCount));
    }
    return onSnapshot(q, (snapshot) => {
        let orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as OwnerShopOrder);
        if (!includeSeedData) {
            orders = orders.filter((o) => !o.isSeedData);
        }
        callback(orders);
    }, (error) => {
        console.error("Error subscribing to shopOrders:", error);
    });
}

export async function updateOrderStatus(orderId: string, status: string, fulfillmentStatus?: string) {
    const orderRef = doc(db, "shopOrders", orderId);
    const updates: Record<string, unknown> = {
        updatedAt: serverTimestamp()
    };
    if (status) updates.status = status;
    if (fulfillmentStatus) updates.fulfillmentStatus = fulfillmentStatus;
    
    await updateDoc(orderRef, updates);
}
