import { collection, query, orderBy, onSnapshot, doc, deleteDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { getDb } from "../client";
import { SizePreset, LengthPreset, PRESETS_COLLECTION } from "@/src/constants/braidPresets";
import type { BraidStyle } from "@/src/lib/styles";
import type { AddonPricing } from "@/src/lib/pricing";

const db = getDb();

// --- Styles ---

/**
 * Fields the owner screen writes to a `styles` document. `duration` and `price` are numbers
 * there but strings in the static catalog (`BraidStyle`).
 */
export type StyleWrite = Omit<Partial<BraidStyle>, "duration" | "price"> & {
    duration?: string | number;
    price?: string | number;
    priceCents?: number;
    imageUrl?: string;
    isActive?: boolean;
};

/** Styles as stored; `T` is the view of the document the caller expects (public pages use `BraidStyle`). */
export function subscribeToStyles<T = BraidStyle>(callback: (styles: T[]) => void) {
    const q = query(collection(db, "styles"), orderBy("name", "asc"));
    return onSnapshot(q, (snapshot) => {
        const styles = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }) as T);
        callback(styles);
    }, (error) => {
        console.error("Error subscribing to styles:", error);
    });
}

export async function upsertStyle(style: StyleWrite) {
    if (!style.id) throw new Error("A style id is required");
    const styleRef = doc(db, "styles", style.id);
    await setDoc(styleRef, {
        ...style,
        updatedAt: serverTimestamp()
    }, { merge: true });
}

export async function deleteStyle(styleId: string) {
    const styleRef = doc(db, "styles", styleId);
    await deleteDoc(styleRef);
}

// --- Presets (Size/Length) ---

export function subscribeToPresets(callback: (presets: (SizePreset | LengthPreset)[]) => void) {
    const q = query(collection(db, PRESETS_COLLECTION), orderBy("id", "asc"));
    return onSnapshot(q, (snapshot) => {
        const presets = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as (SizePreset | LengthPreset)[];
        callback(presets);
    }, (error) => {
        console.error("Error subscribing to presets:", error);
    });
}

export const upsertPreset = async (preset: { id: string; type: string; label: string; priceAdjustment: number; description?: string; inches?: string; priceGuidance?: string }) => {
    const docRef = doc(getDb(), PRESETS_COLLECTION, preset.id);
    await setDoc(docRef, {
        ...preset,
        updatedAt: serverTimestamp()
    }, { merge: true });
};

export const deletePreset = async (id: string) => {
    await deleteDoc(doc(getDb(), PRESETS_COLLECTION, id));
};

// --- Addons ---

/** A `braidAddons` document. */
export interface AddonDoc extends AddonPricing {
    name?: string;
}

export const subscribeToAddons = (callback: (data: AddonDoc[]) => void) => {
    const q = query(collection(getDb(), "braidAddons"));
    return onSnapshot(q, (snapshot) => {
        callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as AddonDoc));
    });
};

export const upsertAddon = async (addon: { id: string; name: string; price: number; deposit: number }) => {
    const docRef = doc(getDb(), "braidAddons", addon.id);
    await setDoc(docRef, {
        ...addon,
        updatedAt: serverTimestamp()
    }, { merge: true });
};

export const deleteAddon = async (id: string) => {
    await deleteDoc(doc(getDb(), "braidAddons", id));
};
