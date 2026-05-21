import { 
    collection, 
    query, 
    orderBy, 
    onSnapshot, 
    doc, 
    updateDoc, 
    deleteDoc, 
    setDoc, 
    serverTimestamp,
    getDocs,
    limit,
    Timestamp,
    addDoc,
    getCountFromServer
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { getDb, getStorageInstance } from "./client";
import { Product } from "@/src/data/products";
import { SizePreset, LengthPreset } from "@/src/constants/braidPresets";
import { useState, useEffect, useMemo } from "react";
import { subscribeToAffiliates } from "@/src/lib/affiliate/affiliateService";
import { format } from "date-fns";

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

export function subscribeToBookings(callback: (bookings: any[]) => void, limitCount?: number, includeSeedData?: boolean) {
    let q = query(collection(db, "bookings"), orderBy("createdAt", "desc"));
    if (limitCount) {
        q = query(collection(db, "bookings"), orderBy("createdAt", "desc"), limit(limitCount));
    }
    return onSnapshot(q, (snapshot) => {
        let bookings = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        if (!includeSeedData) {
            bookings = bookings.filter((b: any) => !b.isSeedData);
        }
        callback(bookings);
    }, (error) => {
        console.error("Error subscribing to bookings:", error);
    });
}

/**
 * Subscribe to booking drafts for conversion calculation.
 */
export function subscribeToBookingDrafts(callback: (drafts: any[]) => void, includeSeedData?: boolean) {
    const q = query(collection(db, "bookingDrafts"));
    return onSnapshot(q, (snapshot) => {
        let drafts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        if (!includeSeedData) {
            drafts = drafts.filter((d: any) => !d.isSeedData);
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

export function subscribeToShopOrders(callback: (orders: any[]) => void, limitCount?: number, includeSeedData?: boolean) {
    let q = query(collection(db, "shopOrders"), orderBy("createdAt", "desc"));
    if (limitCount) {
        q = query(collection(db, "shopOrders"), orderBy("createdAt", "desc"), limit(limitCount));
    }
    return onSnapshot(q, (snapshot) => {
        let orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        if (!includeSeedData) {
            orders = orders.filter((o: any) => !o.isSeedData);
        }
        callback(orders);
    }, (error) => {
        console.error("Error subscribing to shopOrders:", error);
    });
}

export async function updateOrderStatus(orderId: string, status: string, fulfillmentStatus?: string) {
    const orderRef = doc(db, "shopOrders", orderId);
    const updates: any = {
        updatedAt: serverTimestamp()
    };
    if (status) updates.status = status;
    if (fulfillmentStatus) updates.fulfillmentStatus = fulfillmentStatus;
    
    await updateDoc(orderRef, updates);
}

// --- Styles ---

export function subscribeToStyles(callback: (styles: any[]) => void) {
    const q = query(collection(db, "styles"), orderBy("name", "asc"));
    return onSnapshot(q, (snapshot) => {
        const styles = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        callback(styles);
    }, (error) => {
        console.error("Error subscribing to styles:", error);
    });
}

export async function upsertStyle(style: any) {
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

export const subscribeToAddons = (callback: (data: any[]) => void) => {
    const q = query(collection(getDb(), "braidAddons"));
    return onSnapshot(q, (snapshot) => {
        callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
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

export function subscribeToReviews(callback: (reviews: any[]) => void) {
    const q = query(collection(db, "reviews"), orderBy("createdAt", "desc"));
    return onSnapshot(q, (snapshot) => {
        const reviews = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        callback(reviews);
    }, (error) => {
        console.error("Error subscribing to reviews:", error);
        callback([]); // Fallback to empty array
    });
}

export async function upsertReview(review: any) {
    const reviewRef = doc(db, "reviews", review.id || doc(collection(db, "reviews")).id);
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
        (data as any).publishedAt = serverTimestamp();
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

export function exportToCSV(data: any[], filename: string) {
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
 * Hook to subscribe to all shop orders and bookings, computing aggregated sales metrics.
 */
export function useAggregateSales(includeSeedData?: boolean) {
    const [bookings, setBookings] = useState<any[]>([]);
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        const unsubBookings = subscribeToBookings((data) => {
            setBookings(data);
            setLoading(false);
        }, undefined, includeSeedData);
        const unsubOrders = subscribeToShopOrders((data) => {
            setOrders(data);
            setLoading(false);
        }, undefined, includeSeedData);
        
        return () => {
            unsubBookings();
            unsubOrders();
        };
    }, [includeSeedData]);

    const metrics = useMemo(() => {
        const serviceRevenue = bookings
            .filter(b => b.status === 'completed')
            .reduce((sum, b) => {
                const amount = b.isSeedData 
                    ? (b.totalCents || b.amountCents || b.priceCents || 0)
                    : (b.amountPaidCents || b.pricing?.amountDueCents || b.pricing?.depositCents || 0);
                return sum + amount;
            }, 0);

        const shopRevenue = orders
            .filter(o => o.status !== 'cancelled')
            .reduce((sum, o) => {
                const amount = o.totalAmountCents || (o.totalAmount * 100) || 0;
                return sum + amount;
            }, 0);

        const totalDeposits = bookings
            .filter(b => b.status !== 'cancelled')
            .reduce((sum, b) => {
                const deposit = b.pricing?.depositPaidCents || b.depositCents || 0;
                return sum + deposit;
            }, 0);

        return {
            totalRevenue: (serviceRevenue + shopRevenue) / 100,
            serviceRevenue: serviceRevenue / 100,
            shopRevenue: shopRevenue / 100,
            totalDeposits: totalDeposits / 100,
            bookingsCount: bookings.length,
            ordersCount: orders.length,
            revenueTarget: 15000, 
        };
    }, [bookings, orders]);

    return { metrics, bookings, orders, loading };
}

/**
 * Hook to subscribe to affiliates and compute performance metrics.
 */
export function useAffiliateMetrics() {
    const [affiliates, setAffiliates] = useState<any[]>([]);
    const [codes, setCodes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubAff = subscribeToAffiliates((data) => {
            setAffiliates(data);
        });
        
        // Also subscribe to codes to get usage counts
        const qCodes = query(collection(getDb(), "codes"));
        const unsubCodes = onSnapshot(qCodes, (snap) => {
            setCodes(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setLoading(false);
        });

        return () => {
            unsubAff();
            unsubCodes();
        };
    }, []);

    const metrics = useMemo(() => {
        const unpaidCommissions = affiliates.reduce((sum, a) => {
            return sum + (a.payoutsDueCents || 0);
        }, 0);

        const totalUsages = codes.reduce((sum, c) => sum + (c.usageCount || 0), 0);
        const clientUsages = codes.filter(c => c.category === 'client').reduce((sum, c) => sum + (c.usageCount || 0), 0);
        const generalUsages = codes.filter(c => c.category === 'general').reduce((sum, c) => sum + (c.usageCount || 0), 0);

        return {
            totalCount: affiliates.length,
            clientCount: affiliates.filter(a => a.type === 'client').length,
            generalCount: affiliates.filter(a => a.type === 'general').length,
            totalUsages,
            clientUsages,
            generalUsages,
            payoutsDue: unpaidCommissions / 100,
        };
    }, [affiliates, codes]);

    return { metrics, affiliates, loading };
}

/**
 * Hook to compute real-time conversion rate (Bookings / Total Drafts).
 */
export function useConversionMetrics(includeSeedData?: boolean) {
    const [bookings, setBookings] = useState<any[]>([]);
    const [drafts, setDrafts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        const unsubB = subscribeToBookings((data) => {
            // A booking is considered a successful conversion if it is NOT cancelled, 
            // OR if it is cancelled but the refund was forfeited (meaning the business kept the revenue).
            const convertedBookings = data.filter(b => {
                if (b.status !== 'cancelled') return true;
                if (b.forfeited === true || b.refundStatus === 'forfeited') return true;
                return false;
            });
            setBookings(convertedBookings);
        }, undefined, includeSeedData);
        const unsubD = subscribeToBookingDrafts((data) => {
            setDrafts(data);
            setLoading(false);
        }, includeSeedData);
        return () => { unsubB(); unsubD(); };
    }, [includeSeedData]);

    const conversionRate = useMemo(() => {
        if (drafts.length === 0) return 0;
        // Calculation: (Confirmed Bookings / Total Drafts Initiated)
        // We multiply by 100 for percentage
        return Math.min(100, (bookings.length / drafts.length) * 100);
    }, [bookings, drafts]);

    return { conversionRate, loading };
}

/**
 * Hook to compute business trends (bookings over time) for charts.
 */
export function useBusinessTrends(periodMonths: number = 6, includeSeedData?: boolean) {
    const [bookings, setBookings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        return subscribeToBookings((data) => {
            setBookings(data);
            setLoading(false);
        }, undefined, includeSeedData);
    }, [periodMonths, includeSeedData]);

    const chartData = useMemo(() => {
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const data: any[] = [];
        const now = new Date();

        for (let i = periodMonths - 1; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            data.push({
                name: monthNames[d.getMonth()],
                completed: 0,
                cancelled: 0,
                year: d.getFullYear(),
                month: d.getMonth()
            });
        }

        bookings.forEach(b => {
            const date = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || Date.now());
            const entry = data.find(m => m.month === date.getMonth() && m.year === date.getFullYear());
            if (entry) {
                if (b.status === 'cancelled') entry.cancelled++;
                else entry.completed++;
            }
        });

        return data;
    }, [bookings, periodMonths]);

    return { chartData, loading };
}

/**
 * Hook to compute top performing services and products.
 */
export function useTopPerformers(includeSeedData?: boolean) {
    const [bookings, setBookings] = useState<any[]>([]);
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        const unsubBookings = subscribeToBookings((data) => {
            setBookings(data);
            setLoading(false);
        }, undefined, includeSeedData);
        const unsubOrders = subscribeToShopOrders((data) => {
            setOrders(data);
            setLoading(false);
        }, undefined, includeSeedData);
        
        return () => {
            unsubBookings();
            unsubOrders();
        };
    }, [includeSeedData]);

    const topPerformers = useMemo(() => {
        const parsePrice = (b: any) => {
            const val = b.amountCents || b.amountPaidCents || b.priceCents || b.totalAmountCents || b.totalPriceCents;
            if (typeof val === 'number') return val / 100;
            if (typeof val === 'string') {
                const numeric = parseFloat(val.replace(/[^0-9.]/g, ''));
                return isNaN(numeric) ? 0 : numeric;
            }
            // Fallback to legacy 'price' or 'totalAmount' fields if cents are missing
            const legacyVal = b.price || b.totalAmount || b.totalPrice || 0;
            if (typeof legacyVal === 'number') return legacyVal;
            if (typeof legacyVal === 'string') {
                const numeric = parseFloat(legacyVal.replace(/[^0-9.]/g, ''));
                return isNaN(numeric) ? 0 : numeric;
            }
            return 0;
        };

        // Services
        const serviceMap: Record<string, { count: number; name: string; price: number; img?: string }> = {};
        bookings.forEach(b => {
            const name = b.styleName || b.service || "Unknown Service";
            const price = parsePrice(b);
            const img = b.styleImage || b.imageUrl;
            
            if (!serviceMap[name]) {
                serviceMap[name] = { 
                    count: 0, 
                    name, 
                    price: price,
                    img: img
                };
            } else {
                // If we found a price > 0, update it (to avoid $0 from test bookings)
                if (serviceMap[name].price === 0 && price > 0) {
                    serviceMap[name].price = price;
                }
                // If we found an image and didn't have one, update it
                if (!serviceMap[name].img && img) {
                    serviceMap[name].img = img;
                }
            }
            serviceMap[name].count++;
        });
        const topServices = Object.values(serviceMap)
            .sort((a, b) => b.count - a.count)
            .slice(0, 3);

        // Products
        const productMap: Record<string, { count: number; name: string; price: number; img?: string }> = {};
        orders.forEach(o => {
            if (o.status !== 'cancelled') {
                (o.items || []).forEach((item: any) => {
                    const name = item.name || "Unknown Product";
                    const price = parsePrice(item);
                    const img = item.imageUrl || item.image;

                    if (!productMap[name]) {
                        productMap[name] = { 
                            count: 0, 
                            name, 
                            price: price,
                            img: img
                        };
                    } else {
                        if (productMap[name].price === 0 && price > 0) {
                            productMap[name].price = price;
                        }
                        if (!productMap[name].img && img) {
                            productMap[name].img = img;
                        }
                    }
                    productMap[name].count += (item.quantity || 1);
                });
            }
        });
        const topProducts = Object.values(productMap)
            .sort((a, b) => b.count - a.count)
            .slice(0, 3);

        return { topServices, topProducts };
    }, [bookings, orders]);

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
            // Calculate unique clients from bookings in the last 30 days
            // This guarantees sync with the bookings count card
            const recentBookings = data.filter(b => {
                const createdAt = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
                return createdAt >= thirtyDaysAgo;
            });
            
            const uniqueClients = new Set();
            recentBookings.forEach(b => {
                // Try to find a unique identifier for the client
                const identifier = b.clientEmail || b.email || b.clientPhone || b.phone || b.clientName || b.name || b.id;
                if (identifier) uniqueClients.add(identifier);
            });
            
            setCount(uniqueClients.size);
            setLoading(false);
        }, undefined, includeSeedData);
    }, [includeSeedData]);

    return { count, loading };
}

// --- Admin Management ---

/**
 * Subscribe to users with the 'assistant' role.
 */
export function subscribeToAssistants(callback: (assistants: any[]) => void) {
    const q = query(collection(db, "users"), orderBy("updatedAt", "desc"));
    return onSnapshot(q, (snapshot) => {
        const assistants = snapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .filter((u: any) => u.role === "assistant");
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
