# Environment Configuration Guide (M11 Payments)

This document outlines the required environment variables for the Misericordia Hair Designs Next.js application, specifically for Firebase Admin and Stripe/PayPal payment integrations.

## Core Security Rules
1. **Never commit `.env.local`** to version control.
2. **Never use `NEXT_PUBLIC_` prefixes** for backend secrets (Stripe Secret Key, Firebase Service Account JSON).
3. **Use Base64** for complex JSON strings as an alternative to prevent character escaping issues.

## Required Environment Variables

### 1. Firebase Admin SDK (Server-Side)
Required for Firestore and Auth management in API routes.

| Variable | Description | Example / Format |
|----------|-------------|------------------|
| `FIREBASE_SERVICE_ACCOUNT_KEY` | Full JSON string from Firebase Console | `{"type": "service_account", ...}` |
| `FIREBASE_SERVICE_ACCOUNT_KEY_BASE64` | Base64 encoded version of the JSON (Alternative) | `eyJ0eXBlIjogInNlcnZ...` |
| `GOOGLE_APPLICATION_CREDENTIALS` | Path to service-account.json (Alternative for local dev) | `./service-account.json` |

### 2. Stripe Payments
Required for creating checkout sessions and handling webhooks.

| Variable | Description | Example / Format |
|----------|-------------|------------------|
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Client-side key for Stripe.js | `pk_test_...` |
| `STRIPE_SECRET_KEY` | Server-side secret key | `sk_test_...` |
| `STRIPE_WEBHOOK_SECRET` | Secret to verify incoming webhooks | `whsec_...` |

### 3. PayPal Payments (Alternative)
| Variable | Description |
|----------|-------------|
| `PAYPAL_CLIENT_ID` | PayPal REST App Client ID |
| `PAYPAL_CLIENT_SECRET` | PayPal REST App Secret |
| `PAYPAL_MODE` | `sandbox` or `live` |

---

## Troubleshooting
If you encounter authentication errors, visit the **Diagnostic Dashboard** (Development only):
`http://localhost:3000/debug/env`

This page verifies the presence and basic format of your local `.env.local` settings.
