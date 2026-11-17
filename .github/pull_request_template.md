## Summary
<!-- What changed and why. One concern per PR. Link the plan item (e.g. AUDIT-NOV-16-2026.md, Phase 1.3). -->

## STABLE Analysis
- **Goal:**
- **Affected areas:**
- **Risks:**
- **Plan:**

## Implementation Summary
- **Changed:**
- **Preserved (must not break):**
- **Why this approach:**

## Verification
- [ ] Acceptance criteria written first and met
- [ ] `npm run typecheck` (no new errors vs. baseline)
- [ ] `npm run lint` (no new errors vs. baseline)
- [ ] `npm test` (tests added/updated for changed logic, routes, auth, payments)
- [ ] `npm run test:rules` (if rules changed)
- [ ] `npm run build`
- [ ] Manual checks run (list below)
- Checks run / not run (be explicit):

## Regression checklist (tick the flows this PR could affect)
- [ ] Booking: style → time → details → pay → `/booking/success`
- [ ] Stripe webhook confirms once; replay is a no-op
- [ ] PayPal flow
- [ ] Shop checkout
- [ ] Owner login and each dashboard module; assistant/client access limits
- [ ] Availability endpoint hides PII; confirmation page unchanged
- [ ] Reminder cron sends once
- [ ] Contact form / affiliate signup

## Remaining notes
- **Risks:**
- **Follow-ups:**
- **Rollback:** <!-- revert commit / redeploy previous rules / flag -->
