# Misericordia Hair Design (web)

Booking and shop site for a hair-braiding business: customers pick a style, book a time, pay a deposit or the full price (Stripe or PayPal), and buy products; staff run the business from an owner dashboard.

Stack: Next.js 16 (App Router), React 19, TypeScript (strict), Tailwind v4, Firebase (Auth, Firestore, Storage, Admin SDK), Stripe Checkout, PayPal Orders v2, Vitest. Hosted on Firebase App Hosting. Requires Node 22 or newer.

Planning and status live in [`../AUDIT-NOV-16-2026.md`](../AUDIT-NOV-16-2026.md); project rules in [`../CLAUDE.md`](../CLAUDE.md).

## Layout

| Path | What is in it |
|---|---|
| `app/` | Pages and API routes (`app/api/*`) |
| `app/api/payments/{stripe,paypal}` | Create a payment session/order; the server recalculates the price |
| `app/api/stripe/webhook` | Stripe webhook: confirms bookings and shop orders |
| `app/api/admin/*` | Staff-only routes (roles checked server-side) |
| `src/lib/` | Shared code: pricing, auth guards, Firebase clients, email, owner stats |
| `src/components/owner/stitch/` | The owner dashboard (the legacy `components/Owner` is being retired) |
| `tests/unit`, `tests/rules` | Unit and route tests; Firestore/Storage rules tests (emulator) |
| `scripts/` | One-off maintenance and seed scripts (see below) |
| `../firestore.rules`, `../storage.rules` | Security rules, deployed separately from the app |

## Local setup

1. `npm ci`
2. `cp .env.example .env.local` and fill it in. The variable list is in [Environment variables](#environment-variables). Use the Firebase emulators, or a **dev** Firebase project: never point local work at production.
3. With emulators (`NEXT_PUBLIC_USE_FIREBASE_EMULATORS=true`), start them in one terminal and the app in another:

```bash
npm run firebase:emulators   # auth 9099, firestore 8080, storage 9199, UI
npm run dev                  # http://localhost:3000
```

4. Seed the catalog (styles, presets, add-ons) into the project your `.env.local` points to: `npx tsx scripts/migrate-all.ts`. `scripts/run-seed.ts` seeds dashboard sample data. Read a script before running it against a real project.

## Checks

Run from `web/`:

| Command | Purpose |
|---|---|
| `npm run typecheck` | TypeScript, no emit |
| `npm run lint:gate` | ESLint on the folders that are lint-clean (blocking in CI) |
| `npm run lint` | ESLint on everything (informational in CI) |
| `npm test` | Unit and route tests (Vitest) |
| `npm run test:rules` | Firestore and Storage rules tests (starts the emulators) |
| `npm run build` | Production build (blocking in CI) |
| `npm run test:e2e` | Playwright end-to-end tests |

CI (`.github/workflows/ci.yml`) runs tests, typecheck, `lint:gate` and build in one job and the rules tests in another.

## Environment variables

[`.env.example`](.env.example) is the source of truth: every variable the code reads, with a note on whether it is public (sent to the browser) or secret.

- **Public** (`NEXT_PUBLIC_*`): Firebase web config, Stripe publishable key, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_OWNER_DASH_UI`. These are not secrets and may appear in `apphosting.yaml`.
- **Secret**: `FIREBASE_SERVICE_ACCOUNT_KEY` (or `_BASE64`), `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `PAYPAL_CLIENT_ID/SECRET`, `GOOGLE_CLIENT_ID/SECRET`, `CRON_SECRET`. In production they come from Secret Manager through `apphosting.yaml`. Never commit them.
- **Optional with defaults**: `PAYPAL_MODE` (`sandbox`), `SUPER_ADMIN_EMAILS`, `OWNER_NOTIFICATION_EMAIL`, `NEXT_PUBLIC_APP_URL` (a built-in domain). Set them per environment.

## Roles and access

Staff roles are stored on `users/{uid}.role`: `owner`, `admin` or `assistant`. Super admins are the emails in `SUPER_ADMIN_EMAILS`, which defaults to the list in `src/lib/config/adminEmails.ts`; an account must have a verified email to count. The dashboard UI cannot read that server variable, so it uses the defaults to decide what to show, while the API always enforces the real list. The Firestore rules keep their own owner allowlist (`firestore.rules`), so a new super admin also needs the rules updated or a `users/{uid}.role` of `owner`. Clients have no role. Rules and API routes both enforce this; see [`docs/data-model.md`](docs/data-model.md). Roles are assigned by staff or by server routes with the Admin SDK, never by the client.

## Payments in one paragraph

The browser sends only a booking draft id and a choice (deposit or full). The server loads the draft, recalculates the price from Firestore styles, presets and add-ons plus any validated promo code, creates the Stripe session or PayPal order, and the Stripe webhook or PayPal capture confirms the booking. Shop tax is 8.25% with flat $15 shipping; bookings are not taxed. Deposit rule: $50 plus add-on deposits.

## Deploying

Do not deploy rules or the app without a dry run on the dev project first.

```bash
npm run firebase:deploy:dev    # rules and indexes to the default (dev) project
npm run firebase:deploy:prod   # rules and indexes to production
```

The app itself deploys through Firebase App Hosting from the connected branch, using `apphosting.yaml`. Operational procedures (rotating secrets, replaying a webhook, restoring rules, scheduling reminders) are in [`docs/runbook.md`](docs/runbook.md).

## Known gaps

See the audit for the full list. Notable: `.firebaserc` is empty so the `default`/`prod` project aliases are not defined in the repo (the owner must confirm which Firebase project is dev and which is prod); some email and calendar code still has a hardcoded domain fallback.
