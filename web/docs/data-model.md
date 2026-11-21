# Data model: Firestore and Storage

Source of truth: [`../../firestore.rules`](../../firestore.rules) and [`../../storage.rules`](../../storage.rules). This page summarizes them; when they differ, the rules win. Rules are covered by `tests/rules` (`npm run test:rules`).

## How access works

- **Staff** (`users/{uid}.role` of `owner`, `admin` or `assistant`, or one of the owner emails listed in the rules) can read and write every collection through a catch-all rule.
- **Everyone else** only gets the explicit exceptions below. Any other path is denied.
- **Server routes** use the Admin SDK, which bypasses rules. Anything the client must not do (payments, confirming a booking, promo usage) is done there.

## Collections

| Collection | Clients can | Written by | Notes |
|---|---|---|---|
| `users` | Read and update their own profile; create it with no role or `client` | Client (own profile), staff, `add-assistant` route | A user can never add or change their own `role` |
| `bookingDrafts` | Create and update (never read, list or delete); a draft may not contain `password` | Booking and checkout pages, payment routes, webhook | Holds PII, so it is not readable by clients. `scripts/scrub-draft-passwords.ts` removes legacy password fields |
| `products` | Read | Staff (owner dashboard) | Source of truth for the shop |
| `styles` | Read | Staff | Falls back to the static list in `src/lib/styles.ts` if a style is missing |
| `presets` | Read | Staff, `scripts/migrate-all.ts` | Size and length presets (`type` is `size` or `length`). Pricing reads this collection |
| `braidPresets` | Read | Nothing (legacy) | Older owner screens wrote here by mistake; nothing reads it. Safe to ignore after checking it is empty |
| `braidAddons` | Read | Staff, seed scripts | Add-on price and deposit |
| `codes` | Read | Staff, affiliate routes | Promo codes; the percent is looked up server-side, never trusted from the client |
| `reviews` | Read | Staff | No client review form yet |
| `bookings` | No access | Webhook and capture routes, admin routes, staff | Confirmed appointments; clients read theirs through `/api/bookings/*` |
| `shopOrders` | No access | `/api/shop/orders`, payment routes | |
| `paymentEvents` | No access | Stripe webhook, PayPal capture | Used for idempotency: a repeated webhook does not create a second booking |
| `slotLocks` | No access | Webhook, PayPal capture | Prevents double-booking a time slot |
| `promoUsages`, `commissions` | No access | Affiliate tracker | Affiliate attribution and payouts |
| `affiliates` | No access | Affiliate routes, staff | |
| `contactMessages` | No access | `/api/contact` | |
| `customers`, `blogPosts` | No access | Staff, seed scripts | |
| `mail` | No access | Affiliate route | Outgoing mail queue |

Anything not listed that appears in the catch-all is staff-only.

## Storage

| Path | Rule |
|---|---|
| `bookingDrafts/{draftId}/{imageId}` | Anyone can read; create only (no overwrite or delete), `draft_` ids only, images under 5 MB |
| `styles/`, `hero/`, `blog/`, `products/` | Public read; staff create/update up to 25 MB; staff delete |
| `profiles/{uid}_*` | Staff only; a user may write or delete only files named after their own uid |
| Any other path | Staff read only; no write access |

Staff checks in Storage read `users/{uid}.role` from Firestore, so the Firebase Rules service agent needs Firestore access (the CLI offers to grant it on the first deploy).
