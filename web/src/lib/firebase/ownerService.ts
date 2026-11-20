import { collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc, setDoc, serverTimestamp, getDocs, limit, Timestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { getDb, getStorageInstance } from "./client";
import { Product } from "@/src/data/products";
import { SizePreset, LengthPreset } from "@/src/constants/braidPresets";
import { useState, useEffect, useMemo, useCallback } from "react";
import { subscribeToAffiliates } from "@/src/lib/affiliate/affiliateService";
import type { AffiliateProfile } from "@/src/lib/affiliate/types";
import { format } from "date-fns";
import type { BraidStyle } from "@/lib/styles";
import type { Review } from "@/src/data/reviews";
import type { AddonPricing } from "@/lib/pricing";
import type { OwnerBooking, OwnerBookingDraft, OwnerCode, OwnerShopOrder } from "@/src/lib/owner/types";
import {
    buildBusinessTrends,
    computeAffiliateMetrics,
    computeConversionRate,
    computeSalesMetrics,
    computeTopPerformers,
    countRecentClients,
    isConvertedBooking,
} from "@/src/lib/owner/ownerStats";

export type { OwnerBooking, OwnerBookingDraft, OwnerCode, OwnerShopOrder } from "@/src/lib/owner/types";

const db = getDb();
const storage = getStorageInstance();

export interface BlogPost {
    id: string;
    title: string;
    slug: string;
    content: string;
    excerpt?: string;
    category: string;
    imageUrl?: string;
    author: string;
    tags?: string[];
    status: 'draft' | 'published';
    views: number;
    reads: number;
    publishedAt?: Timestamp;
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

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

// --- Products ---

export function subscribeToProducts(callback: (products: Product[]) => void) {
    const q = query(collection(db, "products"), orderBy("updatedAt", "desc"));
    return onSnapshot(q, (snapshot) => {
        const products = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as Product[];
        callback(products);
    }, (error) => {
        console.error("Error subscribing to products:", error);
    });
}

export async function upsertProduct(product: Partial<Product> & { id: string }) {
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
    const q = query(collection(db, "presets"), orderBy("id", "asc"));
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
    const docRef = doc(getDb(), "braidPresets", preset.id);
    await setDoc(docRef, {
        ...preset,
        updatedAt: serverTimestamp()
    }, { merge: true });
};

export const deletePreset = async (id: string) => {
    await deleteDoc(doc(getDb(), "braidPresets", id));
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

// --- Reviews ---

export function subscribeToReviews(callback: (reviews: Review[]) => void) {
    const q = query(collection(db, "reviews"), orderBy("createdAt", "desc"));
    return onSnapshot(q, (snapshot) => {
        const reviews = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }) as Review);
        callback(reviews);
    }, (error) => {
        console.error("Error subscribing to reviews:", error);
        callback([]); // Fallback to empty array
    });
}

export async function upsertReview(review: Partial<Review> & { createdAt?: unknown }) {
    const reviewRef = doc(db, "reviews", review.id ? String(review.id) : doc(collection(db, "reviews")).id);
    await setDoc(reviewRef, {
        ...review,
        updatedAt: serverTimestamp(),
        createdAt: review.createdAt || serverTimestamp()
    }, { merge: true });
}

export async function deleteReview(reviewId: string) {
    const reviewRef = doc(db, "reviews", reviewId);
    await deleteDoc(reviewRef);
}

// --- Blog ---

export function subscribeToBlogPosts(callback: (posts: BlogPost[]) => void) {
    const q = query(collection(db, "blogPosts"), orderBy("createdAt", "desc"));
    return onSnapshot(q, (snapshot) => {
        const posts = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as BlogPost[];
        callback(posts);
    }, (error) => {
        console.error("Error subscribing to blogPosts:", error);
    });
}

export async function upsertBlogPost(post: Partial<BlogPost> & { id?: string }) {
    const isNew = !post.id;
    const blogRef = isNew 
        ? doc(collection(db, "blogPosts")) 
        : doc(db, "blogPosts", post.id!);
    
    const data = {
        ...post,
        id: blogRef.id,
        updatedAt: serverTimestamp(),
        createdAt: post.createdAt || serverTimestamp()
    };
    
    if (post.status === 'published' && !post.publishedAt) {
        (data as Record<string, unknown>).publishedAt = serverTimestamp();
    }

    await setDoc(blogRef, data, { merge: true });
    return blogRef.id;
}

export async function deleteBlogPost(postId: string) {
    await deleteDoc(doc(db, "blogPosts", postId));
}

export async function getBlogStats() {
    const coll = collection(db, "blogPosts");
    const snapshot = await getDocs(coll);
    const posts = snapshot.docs.map(d => d.data() as BlogPost);
    
    const categories = new Set(posts.map(p => p.category));
    const totalViews = posts.reduce((sum, p) => sum + (p.views || 0), 0);
    const totalReads = posts.reduce((sum, p) => sum + (p.reads || 0), 0);
    
    return {
        totalPosts: posts.length,
        publishedPosts: posts.filter(p => p.status === 'published').length,
        categoriesCount: categories.size,
        totalViews,
        totalReads
    };
}

// --- Storage / Upload ---

export async function uploadFile(file: File, path: string): Promise<string> {
    const storageRef = ref(storage, path);
    const snapshot = await uploadBytes(storageRef, file);
    return getDownloadURL(snapshot.ref);
}

// --- Export Utility ---

export function exportToCSV(data: Array<Record<string, unknown>>, filename: string) {
    if (!data || !data.length) return;
    
    const headers = Object.keys(data[0]).join(",");
    const rows = data.map(obj => 
        Object.values(obj).map(val => 
            typeof val === 'string' ? `"${val.replace(/"/g, '""')}"` : val
        ).join(",")
    );
    
    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${filename}_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}


// --- Dashboard Real-time Hooks ---

/**
 * `loading` is true until `markLoaded` is called for the current `key`, so changing the key
 * (for example toggling seed data) starts loading again without setting state in an effect.
 */
function useLoadingFor(key: string) {
    const [loadedKey, setLoadedKey] = useState<string | null>(null);
    const markLoaded = useCallback(() => setLoadedKey(key), [key]);
    return [loadedKey !== key, markLoaded] as const;
}


/**
 * Hook to subscribe to all shop orders and bookings, computing aggregated sales metrics.
 */
export function useAggregateSales(includeSeedData?: boolean) {
    const [bookings, setBookings] = useState<OwnerBooking[]>([]);
    const [orders, setOrders] = useState<OwnerShopOrder[]>([]);
    const [loading, markLoaded] = useLoadingFor(String(includeSeedData));

    useEffect(() => {
        const unsubBookings = subscribeToBookings((data) => {
            setBookings(data);
            markLoaded();
        }, undefined, includeSeedData);
        const unsubOrders = subscribeToShopOrders((data) => {
            setOrders(data);
            markLoaded();
        }, undefined, includeSeedData);
        
        return () => {
            unsubBookings();
            unsubOrders();
        };
    }, [includeSeedData, markLoaded]);

    const metrics = useMemo(() => computeSalesMetrics(bookings, orders), [bookings, orders]);

    return { metrics, bookings, orders, loading };
}

/**
 * Hook to subscribe to affiliates and compute performance metrics.
 */
export function useAffiliateMetrics() {
    const [affiliates, setAffiliates] = useState<AffiliateProfile[]>([]);
    const [codes, setCodes] = useState<OwnerCode[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubAff = subscribeToAffiliates((data) => {
            setAffiliates(data);
        });
        
        // Also subscribe to codes to get usage counts
        const qCodes = query(collection(getDb(), "codes"));
        const unsubCodes = onSnapshot(qCodes, (snap) => {
            setCodes(snap.docs.map(doc => ({ id: doc.id, ...doc.data() }) as OwnerCode));
            setLoading(false);
        });

        return () => {
            unsubAff();
            unsubCodes();
        };
    }, []);

    const metrics = useMemo(() => computeAffiliateMetrics(affiliates, codes), [affiliates, codes]);

    return { metrics, affiliates, loading };
}

/**
 * Hook to compute real-time conversion rate (Bookings / Total Drafts).
 */
export function useConversionMetrics(includeSeedData?: boolean) {
    const [bookings, setBookings] = useState<OwnerBooking[]>([]);
    const [drafts, setDrafts] = useState<OwnerBookingDraft[]>([]);
    const [loading, markLoaded] = useLoadingFor(String(includeSeedData));

    useEffect(() => {
        const unsubB = subscribeToBookings((data) => {
            // A booking is considered a successful conversion if it is NOT cancelled, 
            // OR if it is cancelled but the refund was forfeited (meaning the business kept the revenue).
            setBookings(data.filter(isConvertedBooking));
        }, undefined, includeSeedData);
        const unsubD = subscribeToBookingDrafts((data) => {
            setDrafts(data);
            markLoaded();
        }, includeSeedData);
        return () => { unsubB(); unsubD(); };
    }, [includeSeedData, markLoaded]);

    const conversionRate = useMemo(() => computeConversionRate(bookings.length, drafts.length), [bookings, drafts]);

    return { conversionRate, loading };
}

/**
 * Hook to compute business trends (bookings over time) for charts.
 */
export function useBusinessTrends(periodMonths: number = 6, includeSeedData?: boolean) {
    const [bookings, setBookings] = useState<OwnerBooking[]>([]);
    const [loading, markLoaded] = useLoadingFor(`${periodMonths}:${includeSeedData}`);

    useEffect(() => {
        return subscribeToBookings((data) => {
            setBookings(data);
            markLoaded();
        }, undefined, includeSeedData);
    }, [periodMonths, includeSeedData, markLoaded]);

    const chartData = useMemo(() => buildBusinessTrends(bookings, periodMonths), [bookings, periodMonths]);

    return { chartData, loading };
}

/**
 * Hook to compute top performing services and products.
 */
export function useTopPerformers(includeSeedData?: boolean) {
    const [bookings, setBookings] = useState<OwnerBooking[]>([]);
    const [orders, setOrders] = useState<OwnerShopOrder[]>([]);
    const [loading, markLoaded] = useLoadingFor(String(includeSeedData));

    useEffect(() => {
        const unsubBookings = subscribeToBookings((data) => {
            setBookings(data);
            markLoaded();
        }, undefined, includeSeedData);
        const unsubOrders = subscribeToShopOrders((data) => {
            setOrders(data);
            markLoaded();
        }, undefined, includeSeedData);
        
        return () => {
            unsubBookings();
            unsubOrders();
        };
    }, [includeSeedData, markLoaded]);

    const topPerformers = useMemo(() => computeTopPerformers(bookings, orders), [bookings, orders]);

    return { ...topPerformers, loading };
}

/**
 * Hook to subscribe to the total count of customers.
 */
export function useCustomersCount() {
    const [count, setCount] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        return onSnapshot(collection(db, "customers"), (snap) => {
            setCount(snap.size);
            setLoading(false);
        });
    }, []);

    return { count, loading };
}

/**
 * Hook to subscribe to new clients (created in the last 30 days).
 */
export function useNewClientsCount(includeSeedData?: boolean) {
    const [count, setCount] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        return subscribeToBookings((data) => {
            // Unique clients from bookings in the last 30 days (keeps the card in sync with the bookings count)
            setCount(countRecentClients(data, thirtyDaysAgo));
            setLoading(false);
        }, undefined, includeSeedData);
    }, [includeSeedData]);

    return { count, loading };
}

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

// --- Migration helper ---
// Legacy helper removed in favor of dedicated migration tool.
