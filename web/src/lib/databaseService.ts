import { collection, getDocs, query, orderBy, where } from "firebase/firestore";
import { getDb } from "./firebase/client";
import { Product } from "@/src/data/products";
import { BraidStyle } from "@/lib/styles";
import { SizePreset, LengthPreset } from "@/src/constants/braidPresets";

const db = getDb();

export async function getProducts(): Promise<Product[]> {
    const q = query(collection(db, "products"), orderBy("name"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Product[];
}

export async function getStyles(): Promise<BraidStyle[]> {
    const q = query(collection(db, "styles"), orderBy("name"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as BraidStyle[];
}

export async function getPresets(): Promise<{ sizes: SizePreset[], lengths: LengthPreset[] }> {
    const q = query(collection(db, "presets"));
    const snapshot = await getDocs(q);
    
    const sizes: SizePreset[] = [];
    const lengths: LengthPreset[] = [];
    
    snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.type === 'size') sizes.push({ id: doc.id, ...data } as SizePreset);
        if (data.type === 'length') lengths.push({ id: doc.id, ...data } as LengthPreset);
    });
    
    return { sizes, lengths };
}
