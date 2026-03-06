# Subscription Runbook

## Check a user's subscriptions

```bash
# Get all active subscriptions for a user
npx convex run subscriptions:getUserSubscriptions '{"clerkUserId": "clerk_xxx"}'

# Get all GPTs a user has access to
npx convex run subscriptions:getUserGpts '{"clerkUserId": "clerk_xxx"}'
```

Useful cache comparison:

```bash
# Legacy cached subscription snapshot on users table
npx convex run users:getUserByClerkId '{"clerkId": "clerk_xxx"}'
```

---

## Diagnose: "subscriptions not showing"

1. **Check source-of-truth rows**
   - Run `subscriptions:getUserSubscriptions`.
   - If empty, issue is table population/webhook/backfill.

2. **Check legacy cache**
   - Run `users:getUserByClerkId` and inspect `subscription` / `subscriptionIds`.

3. **Check Stripe webhook delivery**
   - Stripe Dashboard → Developers → Webhooks → recent events.
   - Confirm `customer.subscription.created/updated` and `invoice.*` are delivered.

4. **Check webhook/app logs**
   - Look for `upsertSubscription` / `MAX_SUBSCRIPTIONS_REACHED` / resolution errors.

5. **Interpretation**
   - `getUserSubscriptions = 0` but UI still shows a subscription usually means UI is reading legacy cache (`users.subscription`) while source-of-truth table is missing rows.

---

## Diagnose: cap not enforced

1. Check active count from source-of-truth:
   - `subscriptions:getUserSubscriptions` length should be authoritative.
2. Verify status filter logic includes only `active | trialing | past_due`.
3. Verify checkout API guard in `app/api/stripe/create-subscription/route.ts` is reached.
4. Verify `upsertSubscriptionCore` cap enforcement is active (webhook safety net).
5. Check for bypass path (e.g. direct Stripe links outside app checkout).

---

## Stripe webhook safety net

If a user bypasses app checkout (e.g. direct Stripe Payment Link), webhook still calls `api.subscriptions.upsertSubscription`.

- `upsertSubscriptionCore` re-checks active count before inserting a new active row.
- On violation, it throws `ConvexError(code: "MAX_SUBSCRIPTIONS_REACHED")`.
- Webhook route (`app/api/webhooks/stripe/route.ts`) maps this to HTTP `409` with error payload.

This is the second enforcement layer after checkout API.

## Payment Links — Over-Cap Safety Net

If a user purchases a 7th subscription via a direct Stripe Payment Link (bypassing the
app checkout), the webhook handler automatically:

1. Cancels the new subscription via `stripe.subscriptions.cancel()`
2. Refunds the charge via `stripe.refunds.create()` with `reason: "duplicate"` (if `amount_paid > 0`)
3. Returns HTTP `409` with `{ error: "MAX_SUBSCRIPTIONS_REACHED", action: "subscription_auto_canceled" }`
4. Emits a structured warning log for monitoring

### Monitoring

Search your Vercel / logging provider for this pattern to detect over-cap attempts:

```
[SUBSCRIPTION_CAP_EXCEEDED]
```

Each log entry contains:

- `stripeSubscriptionId` — the subscription that was auto-canceled
- `stripeCustomerId` — the Stripe customer
- `clerkUserId` — the app user
- `timestamp` — ISO timestamp
- `action: "auto_canceled_and_refunded"`

### Failure behavior

If the auto-cancel or refund fails (e.g. Stripe API error), the webhook still returns `409`
cleanly so Stripe does not retry the event. The failure is logged via `console.error` with
the prefix "Failed to auto-cancel/refund". Monitor for these in your logs.

### Free subscriptions

If `amount_paid === 0` (free trial or $0 package), the subscription is canceled but no
refund is attempted. This is logged with "no charge to refund".

---

## Add a new package with GPTs

1. Create Stripe Product + Price.
2. Add env vars in `.env.local`.
3. Add/update package entry in `convex/packages.ts` (`PACKAGE_CATALOG`) with matching `stripeProductId` + `stripePriceId`.
4. Seed/update packages:

```bash
npx convex run packages:seedPackages
```

5. Create/update GPT rows with `packageId` = package `_id`.
6. Verify package resolution:

```bash
npx convex run packages:getPackageByPriceId '{"stripePriceId":"price_xxx"}'
```

7. Test purchase:
   - subscribe,
   - verify row in `subscriptions`,
   - verify `gptIds` populated from package GPT set.

---

## Add a GPT to an existing package

1. Update GPT `packageId` in Convex.
2. Existing subscription rows are denormalized snapshots (`subscriptions.gptIds`), so they do not instantly refresh.
3. Refresh path options:
   - wait for next Stripe `customer.subscription.updated` webhook (re-resolves package + GPT IDs), or
   - run a targeted migration/patch script for affected subscriptions.

---

## Reset a user's subscription state (support/debug)

```bash
# 1) inspect source-of-truth rows
npx convex run subscriptions:getUserSubscriptions '{"clerkUserId": "clerk_xxx"}'

# 2) inspect legacy cache state
npx convex run users:getUserByClerkId '{"clerkId": "clerk_xxx"}'

# 3) dry-run backfill (legacy -> subscriptions table)
npx convex run subscriptions:backfillUsersToSubscriptionsTable '{"dryRun": true}'

# 4) execute backfill if needed
npx convex run subscriptions:backfillUsersToSubscriptionsTable '{"dryRun": false}'
```

---

## Detect and fix fake GPT IDs (`gpt-N`)

`fixFakeGptIds` is available in `convex/subscriptions.ts` as an internal repair mutation.

```bash
# 1) dry-run scan (safe)
npx convex run subscriptions:fixFakeGptIds '{"dryRun": true}'

# 2) apply fixes (patches only affected rows)
npx convex run subscriptions:fixFakeGptIds '{"dryRun": false}'
```

Expected indicator:

- `fixed > 0` means rows contained synthetic IDs matching `^gpt-\d+$` and were repaired from package-linked GPT assignments.

---

## Environment variables required

### Core runtime

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `NEXT_PUBLIC_CONVEX_URL`
- `NEXT_PUBLIC_APP_URL` (used as fallback return URL for portal)

### Package resolution source

`convex/stripe.ts` resolves package/GPT metadata from Convex DB (`packages` + `gpts`), not from hardcoded price maps. Ensure package rows are correctly configured with:

- `stripeProductId` (preferred lookup)
- `stripePriceId` (fallback lookup)
- GPT rows linked via `gpts.packageId`

### New workshop package env vars (Mar 2026)

These are referenced from `convex/packages.ts` and seeded via `packages:seedPackages`:

- `STRIPE_PRICE_NARATIVE`
- `STRIPE_PRODUCT_NARATIVE`
- `STRIPE_PRICE_STRUCTURED`
- `STRIPE_PRODUCT_STRUCTURED`
- `STRIPE_PRICE_SPECULATIVE_FUTURES`
- `STRIPE_PRODUCT_SPECULATIVE_FUTURES`
- `STRIPE_PRICE_LANGUAGE`
- `STRIPE_PRODUCT_LANGUAGE`

> Note: `NARATIVE` is intentionally spelled this way in current code/env to match existing variable names.

> ⚠️ Keep product/price mappings consistent between Stripe and Convex package rows; mismatches typically surface as unknown plan/package fallbacks or missing GPT entitlements.

## Pre-Production Checklist (Payment Links)

Before promoting Stripe Payment Links to real users, confirm:

- [ ] `npx convex run subscriptions:backfillUsersToSubscriptionsTable '{"dryRun": true}'` returns `migrated: 0`
- [ ] `[SUBSCRIPTION_CAP_EXCEEDED]` log pattern is monitored in your logging provider
- [ ] Stripe webhook endpoint is registered for all required events:
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_succeeded`
  - `invoice.payment_failed`
- [ ] Stripe Payment Link products match `stripeProductId` values in Convex `packages` table
- [ ] Test a Payment Link purchase in Stripe test mode and verify subscription appears in dashboard
