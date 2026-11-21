import { collection, query, onSnapshot } from "firebase/firestore";
import { useState, useEffect, useMemo, useCallback } from "react";
import { getDb } from "../client";
import { subscribeToAffiliates } from "@/src/lib/affiliate/affiliateService";
import type { AffiliateProfile } from "@/src/lib/affiliate/types";
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
import { subscribeToBookings, subscribeToBookingDrafts } from "./bookings";
import { subscribeToShopOrders } from "./shop";

const db = getDb();

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
