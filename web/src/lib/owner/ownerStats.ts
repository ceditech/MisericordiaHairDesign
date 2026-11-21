import type {
    LooseAmount,
    OwnerBooking,
    OwnerOrderItem,
    OwnerShopOrder,
    OwnerCode,
    TimeValue,
} from "./types";

/**
 * Pure calculations behind the owner dashboard cards. They live here, apart from the
 * Firestore hooks, so they can be unit tested. Behavior matches the original inline code.
 */

/** Cents stored by a booking, depending on whether it is seed data. */
function bookingRevenueCents(b: OwnerBooking): number {
    return b.isSeedData
        ? b.totalCents || (b.amountCents as number) || (b.priceCents as number) || 0
        : (b.amountPaidCents as number) || b.pricing?.amountDueCents || b.pricing?.depositCents || 0;
}

export interface SalesMetrics {
    totalRevenue: number;
    serviceRevenue: number;
    shopRevenue: number;
    totalDeposits: number;
    bookingsCount: number;
    ordersCount: number;
    revenueTarget: number;
}

export function computeSalesMetrics(bookings: OwnerBooking[], orders: OwnerShopOrder[]): SalesMetrics {
    const serviceRevenue = bookings
        .filter((b) => b.status === "completed")
        .reduce((sum, b) => sum + bookingRevenueCents(b), 0);

    const shopRevenue = orders
        .filter((o) => o.status !== "cancelled")
        .reduce((sum, o) => sum + (o.totalAmountCents || (Number(o.totalAmount) * 100) || 0), 0);

    const totalDeposits = bookings
        .filter((b) => b.status !== "cancelled")
        .reduce((sum, b) => sum + (b.pricing?.depositPaidCents || b.depositCents || 0), 0);

    return {
        totalRevenue: (serviceRevenue + shopRevenue) / 100,
        serviceRevenue: serviceRevenue / 100,
        shopRevenue: shopRevenue / 100,
        totalDeposits: totalDeposits / 100,
        bookingsCount: bookings.length,
        ordersCount: orders.length,
        revenueTarget: 15000,
    };
}

export interface AffiliateLike {
    type?: string;
    payoutsDueCents?: number;
}

export function computeAffiliateMetrics(affiliates: AffiliateLike[], codes: OwnerCode[]) {
    const unpaidCommissions = affiliates.reduce((sum, a) => sum + (a.payoutsDueCents || 0), 0);
    const usage = (c: OwnerCode) => c.usageCount || 0;

    return {
        totalCount: affiliates.length,
        clientCount: affiliates.filter((a) => a.type === "client").length,
        generalCount: affiliates.filter((a) => a.type === "general").length,
        totalUsages: codes.reduce((sum, c) => sum + usage(c), 0),
        clientUsages: codes.filter((c) => c.category === "client").reduce((sum, c) => sum + usage(c), 0),
        generalUsages: codes.filter((c) => c.category === "general").reduce((sum, c) => sum + usage(c), 0),
        payoutsDue: unpaidCommissions / 100,
    };
}

/**
 * A booking counts as a conversion unless it is cancelled; a cancelled booking still
 * counts when the refund was forfeited (the business kept the revenue).
 */
export function isConvertedBooking(b: OwnerBooking): boolean {
    if (b.status !== "cancelled") return true;
    return b.forfeited === true || b.refundStatus === "forfeited";
}

/** Confirmed bookings as a percentage of drafts started, capped at 100. */
export function computeConversionRate(bookingCount: number, draftCount: number): number {
    if (draftCount === 0) return 0;
    return Math.min(100, (bookingCount / draftCount) * 100);
}

/** True for a Firestore Timestamp (anything with a `toDate()` method). */
export function isTimestampLike(value: TimeValue): value is { toDate: () => Date } {
    return typeof value === "object" && value !== null && "toDate" in value && typeof value.toDate === "function";
}

export function toDate(value: TimeValue, fallback?: Date | number): Date {
    if (isTimestampLike(value)) return value.toDate();
    return new Date((value as string | number | Date | null | undefined) || (fallback as number | Date));
}

export interface TrendPoint {
    name: string;
    completed: number;
    cancelled: number;
    year: number;
    month: number;
}

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Bookings per month for the last `periodMonths` months (oldest first). */
export function buildBusinessTrends(bookings: OwnerBooking[], periodMonths: number, now: Date = new Date()): TrendPoint[] {
    const data: TrendPoint[] = [];
    for (let i = periodMonths - 1; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        data.push({ name: MONTH_NAMES[d.getMonth()], completed: 0, cancelled: 0, year: d.getFullYear(), month: d.getMonth() });
    }

    bookings.forEach((b) => {
        const date = toDate(b.createdAt, Date.now());
        const entry = data.find((m) => m.month === date.getMonth() && m.year === date.getFullYear());
        if (entry) {
            if (b.status === "cancelled") entry.cancelled++;
            else entry.completed++;
        }
    });

    return data;
}

type PricedRecord = OwnerBooking | OwnerOrderItem;

/** Dollars from a booking or order item; accepts cents fields, formatted strings and legacy dollar fields. */
export function parsePrice(b: PricedRecord): number {
    const r = b as Record<string, LooseAmount>;
    const val = r.amountCents || r.amountPaidCents || r.priceCents || r.totalAmountCents || r.totalPriceCents;
    if (typeof val === "number") return val / 100;
    if (typeof val === "string") {
        const numeric = parseFloat(val.replace(/[^0-9.]/g, ""));
        return isNaN(numeric) ? 0 : numeric;
    }
    const legacyVal = r.price || r.totalAmount || r.totalPrice || 0;
    if (typeof legacyVal === "number") return legacyVal;
    if (typeof legacyVal === "string") {
        const numeric = parseFloat(legacyVal.replace(/[^0-9.]/g, ""));
        return isNaN(numeric) ? 0 : numeric;
    }
    return 0;
}

export interface Performer {
    count: number;
    name: string;
    price: number;
    img?: string;
}

function tally(map: Record<string, Performer>, name: string, price: number, img: string | undefined, qty: number) {
    if (!map[name]) {
        map[name] = { count: 0, name, price, img };
    } else {
        // keep the first non-zero price and first image found (avoids $0 test records)
        if (map[name].price === 0 && price > 0) map[name].price = price;
        if (!map[name].img && img) map[name].img = img;
    }
    map[name].count += qty;
}

/** Top three services (from bookings) and products (from non-cancelled orders) by count. */
export function computeTopPerformers(bookings: OwnerBooking[], orders: OwnerShopOrder[]) {
    const serviceMap: Record<string, Performer> = {};
    bookings.forEach((b) => {
        tally(serviceMap, b.styleName || b.service || "Unknown Service", parsePrice(b), b.styleImage || b.imageUrl, 1);
    });

    const productMap: Record<string, Performer> = {};
    orders.forEach((o) => {
        if (o.status === "cancelled") return;
        (o.items || []).forEach((item) => {
            tally(productMap, item.name || "Unknown Product", parsePrice(item), item.imageUrl || item.image, item.quantity || 1);
        });
    });

    const top = (m: Record<string, Performer>) => Object.values(m).sort((a, b) => b.count - a.count).slice(0, 3);
    return { topServices: top(serviceMap), topProducts: top(productMap) };
}

/** Distinct clients among bookings created at or after `since`. */
export function countRecentClients(bookings: OwnerBooking[], since: Date): number {
    const unique = new Set<string>();
    bookings
        .filter((b) => toDate(b.createdAt) >= since)
        .forEach((b) => {
            const identifier = b.clientEmail || b.email || b.clientPhone || b.phone || b.clientName || b.name || b.id;
            if (identifier) unique.add(identifier);
        });
    return unique.size;
}

/** "Mar 4, 2026" for a Timestamp, Date, string or number; "—" when missing or unreadable. */
export function formatShortDate(ts: TimeValue): string {
    if (!ts) return "—";
    try {
        return toDate(ts).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    } catch {
        return "—";
    }
}

export interface BlogStats {
    totalPosts: number;
    totalViews: number;
    draftCount: number;
    publishedCount: number;
}

export function computeBlogStats(posts: { views?: number; status?: string }[]): BlogStats {
    return posts.reduce<BlogStats>(
        (acc, p) => ({
            totalPosts: acc.totalPosts + 1,
            totalViews: acc.totalViews + (p.views || 0),
            draftCount: acc.draftCount + (p.status === "draft" ? 1 : 0),
            publishedCount: acc.publishedCount + (p.status === "published" ? 1 : 0),
        }),
        { totalPosts: 0, totalViews: 0, draftCount: 0, publishedCount: 0 }
    );
}
