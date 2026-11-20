# AUDIT-NOV-16-2026 — Misericordia Hair Design

**Scope:** whole repository (`web/` Next.js app, Firebase rules/config, `static-template/` archive, docs).
**Method:** static review of source, configuration and rules. **The build, linter, type checker and tests were NOT run.** "Working" means "implemented and internally consistent", not "verified". Items marked **(verify)** must be confirmed before acting.
**Branch at audit time:** `feature/misericordia-hd` (uncommitted: `web/app/our-styles/page.tsx`, `web/lib/styles.ts`, `web/src/components/owner/stitch/StitchStyles.tsx`).
**Naming convention for future audits:** `AUDIT-MONTH-DATE-YEAR.md`.

---

## Part 1 — Audit report

### 1. What the app is
A booking and e-commerce site for **Misericordia Hair Designs**, a hair-braiding business (repo and Firebase project still use the older "Dede's Braids" name: `dedesbraids-site`).
- **Customers:** browse styles, book an appointment (style → time → details → review → pay deposit or full amount), buy products, read the blog, join an affiliate program.
- **Owner / assistants:** manage appointments, sales, inventory, styles, blog, affiliates, email senders and staff from an owner dashboard.

### 2. Architecture and tech stack
| Layer | Technology |
|---|---|
| Frontend | Next.js 16 (App Router, Turbopack), React 19.2, TypeScript (strict), Tailwind v4, framer-motion, Leaflet, Recharts |
| Backend | Next.js route handlers in `web/app/api/*` (no separate server) |
| Data / auth | Firebase Auth, Firestore, Storage, `firebase-admin` (server) |
| Payments | Stripe (Checkout Session, PaymentIntent, webhook) and PayPal (create/capture order) |
| Email | Gmail OAuth provider behind `EmailManager` / `EmailProvider`; HTML receipt templates |
| Hosting | Firebase App Hosting (`web/apphosting.yaml`); dev and prod Firebase projects (`.firebaserc`) |
| Design | `DESIGN.md` (purple "MHDESIGNS" system); Stitch mockups in `web/src/stitch/owner-dashboard/` |

**Structure.** Two parallel source trees exist: `web/{app,lib,components}` and `web/src/{lib,components,providers,hooks,data,constants,content}`. Duplicated concerns: two `firebase/admin.ts` (`web/lib/firebase/admin.ts`, `web/src/lib/firebase/admin.ts`), two PayPal modules (`web/lib/payments/paypal.ts`, `web/src/lib/payments/paypalServer.ts`), two Stripe route sets and two PayPal route sets (see D-7).

### 3. Features and functionality
- **Public:** home (hero carousel, styles carousel, reviews), `/our-styles`, multi-step `/book` (1,216 lines), `/booking/success|cancel`, shop (`/products`, `/cart`, `/checkout`, `/shop/*`), blog, contact, policies/privacy/terms, affiliate page.
- **Accounts:** `/login`, `/client/dashboard`; roles owner / admin / assistant / client.
- **Payments:** server-side price recalculation for bookings (Checkout Session route), deposit vs. full choice, Stripe webhook with signature verification and `paymentEvents` idempotency, PayPal flow, receipt emails, `.ics` calendar files.
- **Owner dashboard (Stitch UI):** overview, appointments, sales/orders, inventory, service styles, blog, affiliates, email sender settings, admin/assistant management, profile.
- **Operations:** reminder endpoint (`/api/admin/reminders`), affiliate code generation/tracking, booking reactivation, seed scripts.

### 4. Audit

#### A. Done
- Booking → payment → confirmation flow, with server-recalculated price in `payments/stripe/create-session`.
- Stripe webhook (signature check + idempotency), PayPal create/capture, receipt and reminder emails.
- Owner dashboard modules (styles and inventory CRUD was the latest commit `69047e2`).
- Blog, affiliates, legal pages, Gmail sender OAuth setup, dev/prod Firebase split.

#### B. In progress
- **B-1** Uncommitted work on styles (`our-styles/page.tsx`, `lib/styles.ts`, `StitchStyles.tsx`).
- **B-2** `SITE.md` roadmap: "9 styles selection on /book" and "update booking summary dynamically" unchecked; Booking is marked partial (`[/]`).
- **B-3** Migration to the Stitch dashboard: legacy `web/components/Owner/*` (incl. `legacy/LegacyOwnerDashboard.tsx`) still present; `NEXT_PUBLIC_OWNER_DASH_UI=stitch` selects the new UI.
- **B-4** `next-prompt.md` holds an unfinished Stitch prompt for booking steps 2–5.

#### C. Remaining to complete
- **C-1** Authentication/authorization on admin and sensitive API routes.
- **C-2** Server-side validation of payment amounts on every payment route.
- **C-3** Tests and CI (none exist; no `.github`).
- **C-4** Consolidate duplicated code trees and routes.
- **C-5** Remove/guard debug and dev pages; delete scratch scripts and committed logs.
- **C-6** Finish the booking roadmap items (B-2).
- **C-7** Real project README and documentation (`web/README.md` is the default create-next-app text).

#### D. Working / broken / needs improvement (ordered by severity)

**Working (unverified by execution):** Stripe Checkout + webhook path, pricing and booking-draft logic, email abstraction, environment split.

**D-1 CRITICAL — Admin/sensitive API routes lack authentication.** Only `/api/admin/reminders` has any guard (`CRON_SECRET`), and it is skipped when the variable is unset; `CRON_SECRET` is **not** declared in `web/apphosting.yaml` or elsewhere, so in production the guard is likely inactive **(verify)**. Confirmed unauthenticated in code:
- `GET /api/admin/seed` — writes seed data.
- `POST /api/admin/bookings/reactivate` — marks any booking `confirmed` and emails the client.
- `POST /api/admin/add-assistant` — creates Firebase Auth users, writes `users/{uid}` with `role: "assistant"`, sends email.
- `GET/DELETE /api/admin/email/senders` — lists sender metadata and deletes senders.
- `/api/admin/email/auth` and `/callback` (OAuth), `/api/affiliate/generate` and `/resend` — no caller verification seen **(verify auth/callback/resend)**.
- `/api/affiliate/generate` also uses `Math.random()` for codes and shows no uniqueness check.

**D-2 CRITICAL — Client-trusted payment amounts.**
- **Resolved by removal (Phase 7.3):** `POST /api/stripe/create-payment-intent` had no caller and was deleted. It took `amountCents` from the request body and creates the PaymentIntent with it (any positive value, non-integers not rejected, no booking linkage). The Checkout Session route recalculates server-side and is the correct pattern.
- `POST /api/paypal/capture-order` captures any `orderId` with no tie to a booking/amount.
- `payments/stripe/create-session` (shop branch) builds line items from `shopOrders/{id}.items[].priceCents`; it is safe only if `shopOrders` documents are written server-side with prices from the catalog **(verify who writes `shopOrders`)**.

**D-3 HIGH — Firestore/Storage rules too permissive** (`firestore.rules`, `storage.rules`):
- `bookingDrafts`: `allow read, write: if true` (anyone can read/overwrite any draft, which may hold PII).
- `users`: any signed-in user can read every profile.
- `reviews`: any signed-in user can create (no schema/ownership check).
- Owner detection hardcodes emails and does an extra `get()` per request.
- Storage: `styles/` and `hero/` writable by any signed-in user (not owner-only); default rule lets any signed-in user read/write all other paths; `bookingDrafts` uploads are public (size/type limited only).
- A generic catch-all `match /{collectionName}/{docId}` grants owners full access (acceptable but should be scoped).

**D-4 HIGH — Debug/dev routes ship in the app.** `/debug/{auth,env,firebase,payment-env,seed-owner}` and `/dev/{migrate,set-owner}`. Three debug pages check `NODE_ENV`; `/dev/migrate` has no production guard and writes products, styles, presets, addons and reviews via the client SDK; `/dev/set-owner` and `/debug/env`, `/debug/payment-env` not confirmed guarded **(verify)**.

**D-5 HIGH — Build/type health unknown.** `build_err.txt` (older) shows `lucide-react` not resolving in `contact/page.tsx`; `tsc.txt`/`ts_errors.txt` list `AuthContextType` errors (`role`, `roleLoading`, `isLoading`) that the current `AuthProvider` now declares (likely stale) plus `label` missing on a style-addon type in `our-styles/page.tsx:89` **(verify with a fresh run)**. `package.json` has `"lint": "next lint"`, which Next 16 removed **(verify)**; `eslint.config.mjs` exists.

**D-6 HIGH — No automated tests, no CI.** Only ad-hoc scripts (`test-auth.js`, `test-env.js`, `check_db.js`, `scripts/test-firebase-connection.js`, root `test_paypal_auth_v2.js`). Payments, webhook, pricing, auth and rules are untested.

**D-7 MEDIUM — Duplication and repo hygiene.**
- Duplicate routes: `/api/paypal/*` vs `/api/payments/paypal/*`; `/api/stripe/*` vs `/api/payments/stripe/*`.
- Duplicate trees: `web/lib` vs `web/src/lib`; `web/components` vs `web/src/components`; two `admin.ts`.
- Committed noise: `build.log`, `.next_dev.log`, `tsc.txt`, `tsc2.txt`, `ts_errors.txt`, `build_err.txt`, `seed_error.txt`, `scratch.js`, `check_db.js`, `test-env.js`, `test-auth.js`, `download_screens.ps1`, root `test_paypal_auth_v2.js`.
- The Stripe skills folder triplicated: `web/skills`, `web/.agent/skills`, `web/.agents/skills`.
- `queue/book.html`, `stitch.json`, `static-template/` (archive).

**D-8 MEDIUM — Code quality.**
- Very large components: `app/book/page.tsx` 1,216 lines, `app/checkout/page.tsx` 798, `src/lib/firebase/ownerService.ts` 749, `StitchStyles.tsx` 700, `StitchOverview.tsx` 678.
- ~55 `console.log` calls (some log request bodies).
- Heavy `any`; routes return `error.message` to clients; no schema validation (e.g. zod); no rate limiting on `contact`/`affiliate`.
- `firebase-admin` is `^10` (old) next to `firebase` `^12`; BOM characters at file starts (e.g. `affiliate/generate/route.ts`).

**D-9 LOW — Config and docs.** `GOOGLE_REDIRECT_URI` hardcoded to production in `apphosting.yaml`; `NEXT_PUBLIC_APP_URL` fallback hardcoded in code; Firebase web keys and Stripe *publishable test* key in `apphosting.yaml` are public by design (OK); real secrets use Secret Manager (good).

### 5. Is the STABLE framework used?
**Partly — as the owner's instruction, not as the project's practice.** The global `CLAUDE.md` mandates STABLE and the `stable-app-development` skill exists, but the repo has no STABLE artifacts (no framework doc, PR template, checklist, CI gates) and the code shows gaps against it (non-surgical duplication, no regression tests, weak architecture alignment). This plan makes STABLE enforceable.

---

## Part 2 — Consolidated implementation plan (STABLE-governed)

### 2.0 Principles and global gates

**Order of work** — the four "suggested next steps" first, then sections B, C, D:

| Phase | Theme | Covers |
|---|---|---|
| 0 | Safety net: baseline, branch, tooling | prerequisite for everything |
| 1 | Secure admin APIs | next step 1; C-1, D-1 |
| 2 | Trustworthy payment amounts | next step 1; C-2, D-2 |
| 3 | Tighten Firestore/Storage rules | next step 2; D-3 |
| 4 | Clean up (repo hygiene, debug routes) | next step 3; C-5, D-4, D-7 (part) |
| 5 | Tests and CI | next step 4; C-3, D-6 (grows throughout; CI lands in Phase 0/5) |
| 6 | Build/type/lint health | D-5 |
| 7 | Consolidate duplicates | C-4, D-7 |
| 8 | Finish in-progress work | B-1…B-4, C-6 |
| 9 | Code quality and refactors | D-8 |
| 10 | Config, docs, README | C-7, D-9 |

Phase 5 is listed after cleanup, but the **test harness is created in Phase 0** and each later phase adds its own tests (tests ship with the fix, never after).

**Definition of Done (every work item):**
1. Acceptance criteria written before coding (in the PR description).
2. Smallest safe change; no unrelated edits; one concern per PR/commit.
3. `npm run typecheck` (`tsc --noEmit`), `npm run lint` (`eslint .`), `npm test`, and `npm run build` all pass (from Phase 0 onward).
4. New/changed logic has tests: unit for pure logic, integration for routes/rules, e2e only for critical flows.
5. Regression checklist for the affected flows reviewed (see 2.2).
6. STABLE Output Contract filled in the PR (Analysis / Implementation / Verification / Remaining Notes). No claim of "tests passed" unless run.
7. Rollback noted (revert commit or flag) for anything touching auth, payments, rules.

**STABLE mapping used on each item**

| Letter | What it forces here |
|---|---|
| S | One responsibility per helper (e.g. a single `requireRole` guard, a single pricing module); no rewrite of unrelated pages |
| T | Acceptance criteria + tests; zod-validated inputs; structured logs for payments/admin actions |
| A | Place logic in the right layer (route = thin; `src/lib/*` services own logic); safe failure, idempotent payments, retry-safe webhooks |
| B | Paginate owner lists, check Firestore indexes (`firestore.indexes.json`), avoid N+1 reads, rate-limit public POSTs |
| L | Keep response shapes and routes stable; add deprecation shims before deleting duplicates; feature flags for risky switches |
| E | Roles and owner allowlist in config/Firestore, not hardcoded; extension points for new payment providers/roles |

### 2.1 Phase 0 — Safety net (prerequisite)

**Goal:** know the true baseline and be able to detect regressions.

| # | Task | Files | Verification |
|---|---|---|---|
| 0.1 | Commit or stash the in-progress styles work (B-1) on its own commit so later diffs are clean | `app/our-styles/page.tsx`, `lib/styles.ts`, `StitchStyles.tsx` | `git status` clean; owner confirms styles pages still work |
| 0.2 | Create a working branch per phase (`fix/p1-admin-auth`, …) off `feature/misericordia-hd`; never batch phases | git | — |
| 0.3 | Record baseline: run `npx tsc --noEmit`, `npx eslint .`, `npm run build`; save output in the PR (not committed). Replaces the stale `tsc*.txt` | — | Baseline error list attached to plan |
| 0.4 | Add scripts: `typecheck`, `lint` (`eslint .`, replacing `next lint` if confirmed removed), `test`, `test:rules`, `test:e2e` | `web/package.json` | Each script exits 0/non-0 as expected |
| 0.5 | Add test tooling: **Vitest** (unit/route handlers), **`@firebase/rules-unit-testing`** + Firebase emulator (rules), **Playwright** (critical e2e). Justification: Vitest is fast with TS/ESM; rules testing needs the emulator; e2e only for booking/payment. | `web/package.json`, `vitest.config.ts`, `playwright.config.ts` | `npm test` runs a trivial passing test |
| 0.6 | Add CI (`.github/workflows/ci.yml`): install, typecheck, lint, test, build on PR. Rules tests job with emulator | `.github/workflows/ci.yml` | CI green on a no-op PR |
| 0.7 | Add PR template containing the STABLE Output Contract and DoD checklist | `.github/pull_request_template.md` | Template appears on new PRs |
| 0.8 | Add project `CLAUDE.md` pointing to the STABLE skill and this plan | `CLAUDE.md` | File present |

**Exit criteria:** CI runs; baseline known; no product code changed.

### 2.2 Standing regression checklist (re-run after every phase touching these)
- [ ] Customer can pick a style, choose a slot, enter details, pay (Stripe test card; PayPal sandbox) and reach `/booking/success`.
- [ ] Stripe webhook marks booking confirmed once (replay the same event: no duplicate email/state change).
- [ ] Shop checkout (cart → checkout → success) still works.
- [ ] Owner can sign in, see dashboard, and each module loads (appointments, sales, inventory, styles, blog, affiliates, email, admins).
- [ ] Assistant role sees only what it should; client cannot reach `/owner`.
- [ ] Availability endpoint still hides PII; confirmation page still shows its fields.
- [ ] Reminder cron still sends reminders once.
- [ ] Contact form and affiliate signup still work.

### 2.3 Phase 1 — Secure admin and sensitive APIs (D-1, C-1)

**Goal:** every privileged route verifies the caller server-side.

**Design (Architecture-aligned, single responsibility):** add `web/src/lib/auth/requireRole.ts` (server-only) that: reads `Authorization: Bearer <Firebase ID token>`, verifies via `adminAuth.verifyIdToken`, resolves the role from `users/{uid}` (and the existing owner allowlist, moved to config), returns `{uid, email, role}` or throws a typed `HttpError(401|403)`. A small `withAuth(roles, handler)` wrapper keeps routes thin. The client attaches the ID token through one shared `authFetch` helper (`web/src/lib/http/authFetch.ts`) used by the dashboard components.

| # | Task | Routes | Acceptance criteria |
|---|---|---|---|
| 1.1 | Implement `requireRole` + `HttpError` + `authFetch`; unit tests with mocked `adminAuth` | new files | Missing/invalid/expired token → 401; wrong role → 403; valid owner → ok |
| 1.2 | Guard `admin/seed` (owner only; additionally disabled when `NODE_ENV==="production"` unless `ALLOW_SEED=true`); change to `POST` | `/api/admin/seed` | Unauthed 401; non-owner 403; GET returns 405 |
| 1.3 | Guard `reactivate` (owner/admin/assistant) | `/api/admin/bookings/reactivate` | Same matrix; unknown booking 404 unchanged; response shape unchanged |
| 1.4 | Guard `add-assistant` (owner/admin only); never let a caller assign a role above their own; validate email/phone with zod | `/api/admin/add-assistant` | Assistant cannot call it; invalid body 400 |
| 1.5 | Guard email `auth`, `callback` (validate OAuth `state` bound to the signed-in owner), `senders` GET/DELETE | `/api/admin/email/*` | CSRF-safe OAuth; delete requires owner |
| 1.6 | Reminders: make `CRON_SECRET` **mandatory** (fail closed if unset) and add it as a Secret Manager secret in `apphosting.yaml`; configure the scheduler to send the bearer | `/api/admin/reminders`, `apphosting.yaml` | Missing/incorrect secret → 401 even when env unset |
| 1.7 | Affiliate `generate`/`resend`: decide public vs. owner (public signup needs rate limit + email verification; owner-only creation needs guard); use `crypto.randomInt` and a uniqueness retry loop | `/api/affiliate/*` | Codes unique under collision test; abuse limited |
| 1.8 | Replace `error.message` in responses with generic messages + server-side structured log | all touched routes | No internal error text in 5xx bodies |
| 1.9 | Update owner dashboard fetches to use `authFetch` | `src/components/owner/stitch/*` | Dashboard actions still work for owner |

**Tests:** route-handler tests per route for the 401/403/200 matrix (Vitest, mocked admin SDK); one integration test through the emulator Auth for token verification.
**Regression risks:** dashboard buttons that call these routes without a token will start failing → fixed by 1.9 in the same PR; scheduler must be updated with 1.6 before deploy (feature-flag/ordered rollout).
**Rollback:** revert PR; keep `CRON_SECRET` secret created.

### 2.4 Phase 2 — Trustworthy payment amounts (D-2, C-2)

**Goal:** the server decides every amount; the client only chooses *what* to buy.

**Design:** extract the existing server pricing (used by `payments/stripe/create-session`, `lib/pricing.ts`) into one pure function `computeBookingAmount({styleId, addons, choice})` reading live prices from Firestore (styles/presets/addons). All payment routes call it; none accept `amountCents`.

| # | Task | Acceptance criteria |
|---|---|---|
| 2.1 | Unit-test current `lib/pricing.ts` behavior (characterization tests) before touching it | Tests pin existing outputs for deposit/full/addons/promo/affiliate cases |
| 2.2 | **Resolved by removal:** route had no caller and was deleted (see 7.3); if an Elements checkout is built later, price it server-side per this task. Original: `create-payment-intent`: accept `{bookingId|draftId, choice}`, load the booking/draft, compute amount server-side, ignore client `amountCents`; integer-only; verify booking belongs to caller or is an unpaid draft; attach `bookingId` metadata used by the webhook | Tampered amount ignored; non-existent booking 404; metadata present |
| 2.3 | PayPal `create-order`: compute amount server-side from the booking; store `paypalOrderId` on the booking | Created order amount equals server amount |
| 2.4 | PayPal `capture-order`/`capture`: verify the order was created by us (lookup by stored `paypalOrderId`), verify captured amount/currency equals the booking's expected amount, then update the booking idempotently | Unknown order ID rejected; mismatched amount flagged; double capture is a no-op |
| 2.5 | Shop: confirm `shopOrders` are created server-side with prices from the product catalog; if created from the client, move creation to a server route that prices from `products` | Client cannot set `priceCents`; Firestore rules deny client writes to `shopOrders` price fields |
| 2.6 | Webhook: assert `amount_received` equals the expected amount from the booking before marking confirmed; keep idempotency | Underpayment does not confirm; replayed event is ignored |
| 2.7 | Add structured payment logs (event id, bookingId, amount, outcome) — no card/PII | Logs verified in test |

**Tests:** unit (pricing), route tests with Stripe/PayPal clients mocked, webhook replay test, one Stripe-test-mode e2e (Playwright) of deposit payment.
**Regression risks:** checkout UI currently sends `amountCents` → update client in the same PR; Stripe metadata contract with the webhook must stay compatible (add, don't rename).
**Rollback:** revert; both old and new client calls ignore extra fields until the cleanup phase.

### 2.5 Phase 3 — Tighten Firestore/Storage rules (D-3)

**Goal:** least privilege, proven by emulator tests, deployed to dev before prod.

| # | Task | Acceptance criteria |
|---|---|---|
| 3.1 | Write rules tests first (current behavior pinned, then target behavior) using `@firebase/rules-unit-testing` | Test file `firestore.rules.test.ts` covers each collection × role (anon, client, assistant, admin, owner) |
| 3.2 | Move owner/admin role resolution to custom claims or a `roles/{uid}` doc; keep the hardcoded email list only as a bootstrap fallback during migration; remove it after claims are set | No per-request extra `get()` for claim holders; fallback removal tracked |
| 3.3 | `bookingDrafts`: allow create; allow read/update only for the draft owner (store a client-held unguessable draftId + `ownerUid`/anonymous-auth uid) or move draft handling server-side; add field allowlist and size limits | Anonymous cannot read another's draft |
| 3.4 | `users`: read only own doc (or staff); client cannot set `role` | Role escalation test fails |
| 3.5 | `reviews`: create requires auth, valid schema, `authorUid == auth.uid`, no self-approval; read public | Schema/ownership tests |
| 3.6 | Replace owner catch-all with explicit per-collection rules; keep the final deny-all | New collections denied by default |
| 3.7 | `shopOrders`, `bookings`, `paymentEvents`, `senders`/email tokens: client writes denied (Admin SDK only); staff read | Tests |
| 3.8 | Storage: `styles/` and `hero/` writes only for owner/admin; `bookingDrafts` uploads keep size/type limits and add per-draft path ownership; default rule → deny | Storage rules tests with emulator |
| 3.9 | Review `firestore.indexes.json` against queries (availability `where date == && status in`, dashboard lists) | Queries run on emulator without missing-index errors |
| 3.10 | Deploy order: emulator → dev project → smoke test checklist (2.2) → prod | Dev smoke test passes |

**Regression risks (highest of the plan):** the owner dashboard and booking flow currently depend on permissive access (client-SDK writes in `ownerService.ts`, `/dev/migrate`). Rules tests must enumerate every client-side collection access (grep `collection(`/`doc(` in `web/src` and `web/app`) before tightening; move any needed writes behind guarded routes (Phase 1 pattern).
**Rollback:** keep previous rules file tagged; redeploy rules is instant.

### 2.6 Phase 4 — Cleanup and removal of risky surfaces (D-4, D-7 part, C-5)

| # | Task | Acceptance criteria |
|---|---|---|
| 4.1 | Remove committed noise: logs, `tsc*.txt`, `ts_errors.txt`, `build_err.txt`, `seed_error.txt`, `scratch.js`, root `test_paypal_auth_v2.js`; add patterns to `.gitignore` | Files gone from `git ls-files`; build unaffected |
| 4.2 | Move useful one-off scripts (`check_db.js`, `test-env.js`, `test-auth.js`, `download_screens.ps1`) into `web/scripts/` with a one-line header or delete; confirm with owner first | Nothing under `web/` root except config |
| 4.3 | Deduplicate the Stripe skills folders to a single location (or ignore the copies) | One copy remains |
| 4.4 | Debug/dev pages: delete `/debug/*`, `/dev/*`, or gate each with a shared `notFound()` when `NODE_ENV==="production"` plus owner role; keep the seeding via CLI (`web/scripts/run-seed.ts`) | Production build returns 404 for those routes (test) |
| 4.5 | Remove `console.log` of request bodies/PII; introduce a small `logger` (levels, redaction) in `src/lib/log.ts` | grep shows no body logging |

**Regression risk:** `/dev/migrate` is the only UI path to seed data — keep CLI seeding documented before deletion.

### 2.7 Phase 5 — Tests and CI expansion (D-6, C-3)

Test pyramid, built incrementally (each earlier phase already adds its tests):
- **Unit:** `lib/pricing.ts`, date/timezone and `.ics` helpers, affiliate tracker, `requireRole`, email templates (snapshot), booking-draft logic.
- **Integration (Vitest + emulators):** every API route (auth matrix + happy path + validation failures), webhook (signature, idempotency, replay, underpayment), reminders (sends once).
- **Rules tests:** per Phase 3.
- **E2E (Playwright, few):** (1) guest books a style and pays the deposit with Stripe test card, (2) owner signs in and confirms/reactivates a booking, (3) shop checkout. Run against emulators + Stripe test mode.
- **Coverage gate:** start at the baseline, ratchet up on critical modules (payments, auth, pricing ≥ 80%); do not chase a global percentage.
- **CI:** required checks on PR: typecheck, lint, unit/integration, rules, build; e2e nightly or on label.

### 2.8 Phase 6 — Build, type and lint health (D-5)

| # | Task | Acceptance criteria |
|---|---|---|
| 6.1 | Reproduce current `tsc`, `eslint`, `build` results (Phase 0 baseline) | Real error list, not stale logs |
| 6.2 | Fix in order: missing deps (`lucide-react` is in `package.json` — reinstall/verify lockfile), type errors (`label` in `our-styles/page.tsx:89`), auth context consumers | `tsc --noEmit` exits 0 |
| 6.3 | Replace `next lint` script with `eslint .` if confirmed removed; fix errors; ratchet `no-explicit-any` from warn → error on new code | `npm run lint` exits 0 |
| 6.4 | Remove BOM characters from source files | grep finds none |
| 6.5 | Upgrade `firebase-admin` to a supported major in its own PR, with the Phase 5 tests as the safety net | Tests and build green; Admin features smoke-tested |

**Progress (updated 2026-11-20).** Lint went from 371 problems (229 errors) to 115 errors / 48 warnings:
mechanical fixes (unused code, `prefer-const`, JSX entities), `any` removed from `app/api`, `src/lib`, `lib`, `src/providers`
and `ownerService.ts` (owner stats extracted to `src/lib/owner/ownerStats.ts` with tests), and all `react-hooks` errors fixed.
`firebase-admin` is on 14.x (6.5 done). CI now blocks on `npm run lint:gate` (server and shared code) and `npm run build`;
whole-repo lint stays informational. **Remaining:** about 108 `any` in UI folders (`src/components`, `app/checkout`, `app/book`,
`app/login`, `components/Owner`), 11 `require` imports in scripts/config, and 48 warnings (mostly `<img>`). Grow the `lint:gate`
scope as each folder is cleaned.

### 2.9 Phase 7 — Consolidate duplicated code (C-4, D-7)

**Approach (Low-regression):** strangler pattern — one canonical module, thin re-export shims at the old path, migrate importers, then delete shims. One duplicate pair per PR.

| # | Pair | Canonical choice (proposed) | Steps |
|---|---|---|---|
| 7.1 | `web/lib/firebase/admin.ts` vs `web/src/lib/firebase/admin.ts` | `web/src/lib/firebase/admin.ts` (used by all API routes) | **Done:** no importers, deleted |
| 7.2 | `lib/payments/paypal.ts` vs `src/lib/payments/paypalServer.ts` | `src/lib/payments/*Server.ts` | **Done:** no importers, deleted (with the unused mock `paymentService.ts` and `constants.ts`) |
| 7.3 | **Partly done:** `/api/stripe/create-payment-intent` (no caller, trusted client amount) deleted; `/api/stripe/webhook` kept. Remaining: `/api/paypal/*` vs `/api/payments/paypal/*`; `/api/stripe/*` vs `/api/payments/stripe/*` | `/api/payments/{provider}/*` | Find client callers; migrate; keep old paths returning 308/410 for one release; remove |
| 7.4 | `web/components/Owner/*` + `LegacyOwnerDashboard` vs Stitch components | Stitch | Confirm no route imports legacy; delete |
| 7.5 | `web/lib` vs `web/src/lib` | Decide one root (recommend `web/src`, aliased `@/src/*`) | **Done:** all of `web/lib` moved to `web/src/lib` with `git mv`; imports are `@/src/lib/*`; no behavior change |

Each step: tests green before and after; no functional change in the same commit.

### 2.10 Phase 8 — Finish in-progress work (B-1…B-4, C-6)

| # | Task | Notes |
|---|---|---|
| 8.1 | B-1: finish and commit the styles changes (`our-styles`, `lib/styles.ts`, `StitchStyles`); add tests for style data mapping; fix the `label` type issue (D-5) | Small PR |
| 8.2 | C-6/B-2: "9 styles selection" on `/book` and dynamic booking summary — write acceptance criteria with the owner first (grid of 9 styles? source: Firestore `styles` vs static `BRAID_STYLES`?) | Needs owner input (see open questions) |
| 8.3 | B-4: complete or retire `next-prompt.md` (steps 2–5 of the booking flow) once `/book` behavior is final | Doc cleanup |
| 8.4 | B-3: finish the Stitch migration — verify each module has parity with the legacy tab, then remove the legacy UI and the `NEXT_PUBLIC_OWNER_DASH_UI` switch | After Phase 7.4 |
| 8.5 | Update `SITE.md` checkboxes (Booking `[x]`) and sitemap (shop, blog, contact, affiliate pages) | Docs |

### 2.11 Phase 9 — Code quality and refactors (D-8)

Surgical, behavior-preserving, test-backed (characterization tests first):
- **`app/book/page.tsx` (1,216 lines):** extract step components (`StyleStep`, `TimeStep`, `DetailsStep`, `ReviewStep`, `PaymentStep`), a `useBookingDraft` hook (wraps `lib/bookingDraft.ts`), and a `BookingSummary` panel. No UI change.
- **`app/checkout/page.tsx` (798):** same pattern; payment widgets already in `components/StripeCheckout.tsx` and `PayPalCheckout.tsx`.
- **`ownerService.ts` (749):** split by aggregate (`bookingsRepo`, `stylesRepo`, `inventoryRepo`, `ordersRepo`) behind a small interface for testability (Dependency Inversion where it pays off).
- **Types:** replace `any` in payment/auth/booking paths first; shared domain types in `src/types`.
- **Validation:** introduce `zod` (justification: one schema = TS type + runtime validation for all route inputs; needed for Phase 1/2) and a `parseBody(schema)` helper.
- **Rate limiting:** for `contact`, `affiliate`, availability (per-IP, simple token bucket or Firebase App Check/reCAPTCHA); keep it minimal.
- **Performance (Balanced for Bottlenecks):** paginate owner lists (appointments, orders), verify indexes, cache catalog reads (styles/products) with Next `revalidate`, avoid per-render Firestore reads in carousels.
- **Availability:** timeouts and retries for Stripe/PayPal/Gmail calls; email failures must not fail a confirmed booking (queue/retry or record `emailPending`).

### 2.12 Phase 10 — Config, docs and README (C-7, D-9)

- Rewrite `web/README.md`: purpose, architecture diagram, env vars table (public vs secret), local setup with emulators, test commands, deploy procedure (dev/prod), role model.
- Add `web/.env.example`; move `GOOGLE_REDIRECT_URI` and app URL to per-environment config; remove hardcoded domain fallbacks.
- Document the data model (collections and who may write them) next to the rules.
- Add `docs/runbook.md`: rotating secrets, replaying a Stripe webhook, restoring rules, reminder cron setup.
- Keep `AUDIT-<MONTH>-<DATE>-<YEAR>.md` per audit; add a "status" column update at the end of each phase.

### 2.13 Risk register

| Risk | Phase | Mitigation |
|---|---|---|
| Locking out the owner/dashboard when rules/auth tighten | 1, 3 | Emulator rules tests, dev-project dry run, keep bootstrap email fallback until claims verified, rollback tag |
| Breaking live payments | 2 | Characterization tests, Stripe/PayPal test mode e2e, additive metadata, deploy off-hours |
| Scheduler sends reminders without secret after 1.6 | 1 | Update scheduler first, then deploy; verify with one manual call |
| Hidden client dependencies on direct Firestore writes | 3, 7 | grep audit of all client SDK calls before rules change |
| Large refactors causing UI drift | 9 | Characterization/e2e tests, no UI changes in refactor PRs, small PRs |
| Dependency upgrade (`firebase-admin`) | 6 | Isolated PR after tests exist |

### 2.14 Open questions for the owner
1. Is `/api/affiliate/generate` meant to be public signup or staff-only?
2. Who creates `shopOrders` today (client or server)? (Determines Phase 2.5 scope.)
3. "9 styles selection" on `/book`: which 9 styles, and from Firestore or static config?
4. Are any `/debug/*` or `/dev/*` pages still needed in production?
5. Which scheduler triggers `/api/admin/reminders` (Cloud Scheduler, external cron)?
6. Is the legacy owner dashboard still used by anyone (can it be deleted)?
7. Is the dev Firebase project available for rules deployment dry runs (`.firebaserc` `default` vs `prod`)?

### 2.15 Suggested PR sequence (small, independently revertible)
`P0-tooling` → `P1a-requireRole` → `P1b-guard-admin-routes` → `P1c-cron-secret` → `P2a-pricing-tests` → `P2b-payment-intent` → `P2c-paypal-verify` → `P2d-webhook-amount-check` → `P3a-rules-tests` → `P3b-rules-tighten` (dev, then prod) → `P4-cleanup` → `P6-type-lint-health` → `P7a…e-consolidation` → `P8-in-progress-features` → `P9-refactors` → `P10-docs`.

---
*No code was changed to produce this document. Findings marked **(verify)** were inferred from partial reads or stale artifacts and must be confirmed in Phase 0.*
