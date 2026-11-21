# Runbook

Operational procedures. Items marked **Owner to confirm** depend on setup that is not recorded in the repo. Do each step on the **dev** project first, then production.

## Rotate a secret

Secrets (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `PAYPAL_CLIENT_SECRET`, `GOOGLE_CLIENT_SECRET`, `FIREBASE_SERVICE_ACCOUNT_KEY`, `CRON_SECRET`) live in Google Secret Manager and are bound in `apphosting.yaml` as `NAME@version`.

1. Create the new value at the provider (Stripe, PayPal, Google Cloud, Firebase).
2. Add a new version in Secret Manager (`firebase apphosting:secrets:set NAME`, or the console).
3. Point `apphosting.yaml` at the new version number (`NAME@2`, ...) and roll out the app.
4. Confirm a payment or login works, then revoke the old value at the provider.

A leaked service-account key: delete the key in Google Cloud IAM first, then do the steps above. Never keep key files in the repo; `scripts/gen-env-key.js` reads one from outside it, and its hardcoded file name must be edited to match your key.

## Replay a Stripe webhook

The webhook (`/api/stripe/webhook`) verifies the signature and records each handled event id in `paymentEvents`, so a repeated event is ignored.

1. Stripe dashboard > Developers > Webhooks > the endpoint > the event > **Resend**.
2. If the booking or order already exists, the resend is ignored by design.
3. If the first attempt failed, check the app logs for `[Stripe Webhook]`, fix the cause, then resend.
4. Locally: `stripe listen --forward-to localhost:3000/api/stripe/webhook`, and put the printed signing secret in `STRIPE_WEBHOOK_SECRET`.

## Restore Firestore or Storage rules

The rules are in git (`firestore.rules`, `storage.rules`).

1. `git log -- firestore.rules` and pick the last known-good commit.
2. Check it out on a branch, run `npm run test:rules` from `web/`, and deploy to dev: `npm run firebase:deploy:dev`.
3. Smoke-test sign-in, a booking draft, and an owner-dashboard save on dev, then `npm run firebase:deploy:prod`.

`.firebaserc` is empty in the repo, so the `default` and `prod` aliases must exist on the machine running the deploy. **Owner to confirm** which Firebase project is dev and which is prod.

## Schedule appointment reminders

`POST /api/admin/reminders` emails clients with a confirmed booking tomorrow and marks it `reminderSent`.

1. Generate a long random value and store it as the secret `CRON_SECRET`.
2. Create a scheduler (Cloud Scheduler or any cron) that sends `POST https://<site>/api/admin/reminders` with the header `Authorization: Bearer <CRON_SECRET>` once a day.
3. Without `CRON_SECRET`, only a super admin can trigger it (from the dashboard).

**Owner to confirm** which scheduler is used today. "Tomorrow" is the salon's calendar day in `America/Chicago` (`src/lib/reminders/targetDate.ts`), whatever the server's time zone is.

## Clean up legacy draft passwords

Older booking drafts may contain a `password` field. The rules now reject it for new drafts.

```bash
npx tsx scripts/scrub-draft-passwords.ts           # dry run: lists what would change
npx tsx scripts/scrub-draft-passwords.ts --apply   # removes the fields
```

## Presets not showing owner edits

Presets live in the `presets` collection. If `braidPresets` has documents, they were saved by an older version and are not used: copy any you still want into `presets` by hand, then ignore the old collection.
