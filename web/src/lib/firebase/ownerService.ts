/**
 * Owner and storefront data access, split by area under ./owner/.
 * This file only re-exports, so existing imports of "@/src/lib/firebase/ownerService" keep working.
 */
export type { OwnerBooking, OwnerBookingDraft, OwnerCode, OwnerShopOrder } from "@/src/lib/owner/types";

export * from "./owner/bookings";
export * from "./owner/shop";
export * from "./owner/catalog";
export * from "./owner/content";
export * from "./owner/csv";
export * from "./owner/analytics";
export * from "./owner/users";
