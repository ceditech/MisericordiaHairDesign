# Project guidance — Misericordia Hair Design

Apply the **STABLE** framework to all code work (see the `stable-app-development` skill):
Surgical & SOLID · Testable & Traceable · Architecture-Aligned & Available ·
Balanced for Bottlenecks · Low-Regression & Loosely Coupled · Expandable & Elastic.

- The audit and phased implementation plan live in `AUDIT-NOV-16-2026.md`.
  Future audits follow `AUDIT-MONTH-DATE-YEAR.md`.
- Work one plan item per commit/PR; write acceptance criteria first; tests ship with the fix.
- App code is in `web/` (Next.js 16, Firebase, Stripe, PayPal). Run from `web/`:
  `npm run typecheck`, `npm run lint`, `npm test`, `npm run test:rules`, `npm run build`.
- Never claim a check passed unless it was run. Record baseline-red checks honestly.
- Do not change payment, auth, or Firestore/Storage rules without tests and a rollback note.
