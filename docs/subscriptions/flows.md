# Subscription Flows

This document describes the implemented behavior from current code.

---

## Flow 1 — New subscription purchase

1. User selects a package on pricing (`components/subscribe/CheckoutForm.tsx`).
2. Frontend reads current active subscriptions via `api.subscriptions.getUserSubscriptions`.
3. Frontend blocks submit if already at cap (`>= 6`) or already subscribed to selected product.
4. Frontend posts to `POST /api/stripe/create-subscription`.
5. Checkout API checks cap again by querying `api.subscriptions.getUserSubscriptions`.
6. If count is `>= 6`, API returns `400` with `MAX_SUBSCRIPTIONS_REACHED`.
7. API calls Convex action `api.stripe.createSubscription` to create Stripe subscription.
8. API saves `stripeCustomerId` to user immediately.
9. API does immediate sync attempt using `api.subscriptions.syncSubscriptionFromStripe`.
10. Stripe webhook (`/api/webhooks/stripe`) also processes subscription events and calls `api.subscriptions.upsertSubscription`.
11. `upsertSubscriptionCore` enforces cap again before inserting a new active row.
12. Row is inserted/updated in `subscriptions` table.
13. `syncUserSubscriptionCache` runs and refreshes `users.subscription` and `users.subscriptionIds`.
14. Frontend redirects to `/dashboard?success=true`.
15. `DashboardShell` polls for up to 10 seconds (`retryCount < 10`, 1s interval) while waiting for subscription to appear.

### Key cap gate snippet

```ts
if ((activeSubscriptions?.length ?? 0) >= 6) {
  return NextResponse.json(
    { error: "MAX_SUBSCRIPTIONS_REACHED" },
    { status: 400 }
  );
}
```

(from `app/api/stripe/create-subscription/route.ts`)

---

## Flow 2 — Subscription cancellation

Current implemented flow (from dashboard card):

1. User clicks **Cancel Subscription** in `components/dashboard/ManageSubscription.tsx`.
2. UI posts to `POST /api/stripe/cancel-subscription` with `cancelAtPeriodEnd: true`.
3. API updates Stripe subscription `cancel_at_period_end`.
4. UI then calls Convex mutation `api.subscriptions.cancelSubscriptionAtPeriodEnd`.
5. Convex patches row (`cancelAtPeriodEnd: true`) and runs `syncUserSubscriptionCache`.
6. UI sets local `canceledId` and starts polling visual state every 2s up to 15 cycles.
7. Webhook `customer.subscription.updated` may later arrive and run `upsertSubscription` again.

> ⚠️ Note: this path does **not** require Stripe portal for cancellation; portal is used by the separate **Manage in Stripe Portal** button.

### Polling snippet

```ts
if (stillVisible && pollCount < 15) {
  const timer = setTimeout(() => setPollCount((p) => p + 1), 2000);
  return () => clearTimeout(timer);
}
```

---

## Flow 3 — Payment failure

1. Stripe sends `invoice.payment_failed`.
2. Webhook handler runs `handleInvoicePaymentFailed` in `app/api/webhooks/stripe/route.ts`.
3. It retrieves subscription and resolves `clerkUserId`.
4. It computes grace end: `Date.now() + 7 * 24 * 60 * 60 * 1000`.
5. Calls `syncAllSubscriptionUpdates(..., { status: "past_due", lastPaymentFailedAt, paymentFailureGracePeriodEnd })`.
6. This upserts subscription row and refreshes cache.
7. Entitlement checks call `isEntitled()` from `convex/lib/subscriptionUtils.ts`.
8. `past_due` is entitled only while `Date.now() < paymentFailureGracePeriodEnd` (legacy rows without the timestamp stay entitled).

### Grace snippet

```ts
const gracePeriodEnd = Date.now() + 7 * 24 * 60 * 60 * 1000;
await syncAllSubscriptionUpdates(clerkUserId, subscription, {
  status: "past_due",
  lastPaymentFailedAt: Date.now(),
  paymentFailureGracePeriodEnd: gracePeriodEnd
});
```

### What happens when grace period expires

- `isEntitled()` returns `false` for `past_due` rows once `paymentFailureGracePeriodEnd` is in the past.
- Access is denied even before Stripe transitions status to `canceled`/`unpaid`.

---

## Flow 4 — GPT access check

Implemented in `convex/gptAccess.ts`:

1. Load user by `clerkUserId`.
2. Load target GPT by `gptId`.
3. If GPT missing → deny.
4. If user is admin → allow.
5. Load all user subscriptions by `subscriptions.by_user_id`.
6. Filter subscriptions via `isEntitled()` (`active`/`trialing`, plus `past_due` only within grace window).
7. Merge all `gptIds` across active subscriptions into a deduped `Set`.
8. Allow only if requested `gptId` is in merged set.

### Dedup logic snippet

```ts
const merged = new Set<string>();
for (const sub of activeSubs) {
  for (const gptId of sub.gptIds || []) {
    merged.add(gptId);
  }
}
```

Why union-based: users can hold multiple active package subscriptions simultaneously; entitlement is additive.

---

## Flow 6 — Stripe subscription sync package resolution

Implemented in `convex/stripe.ts` (`handleSubscriptionUpdate`):

1. Read `priceId` and `productId` from Stripe subscription item.
2. Resolve package from DB via `resolvePackageFromStripe(ctx, { priceId, productId })`.
3. Resolver prefers `packages.by_stripeProductId`, falls back to `packages.by_stripePriceId`.
4. Fetch GPTs by package via `gpts.by_packageId` and map real `gptId` values.
5. Call `api.subscriptions.upsertSubscription` with DB-derived package metadata and real `gptIds`.

Safety behavior:

- if no package is resolved, the handler logs a warning and returns without writing fallback fake GPT IDs.

---

## Flow 5 — Existing user backfill (one-time migration)

Problem addressed:

- legacy users had `users.subscription` populated but missing rows in `subscriptions`.
- table-based reads (`getUserSubscriptions`) returned empty for those users.

Implemented mutation:

- `api.subscriptions.backfillUsersToSubscriptionsTable` in `convex/subscriptions.ts`.

Behavior:

1. Collect users with embedded `user.subscription`.
2. For each user, skip if `stripeSubscriptionId` already exists in table.
3. Skip rows missing both `priceId` and `productId`.
4. In non-dry-run mode, insert reconstructed row into `subscriptions`.
5. Run `syncUserSubscriptionCache` for migrated users.
6. Return counters: `migrated`, `alreadyExists`, `skipped`, `total`, `dryRun`.

Safe execution:

1. Dry run first:
   - `npx convex run subscriptions:backfillUsersToSubscriptionsTable '{"dryRun": true}'`
2. Execute:
   - `npx convex run subscriptions:backfillUsersToSubscriptionsTable '{"dryRun": false}'`

When needed again:

- should not be part of normal operation after migration stabilization.
- only re-run for historical repair scenarios or environments with legacy drift.

---

## Flow lookup notes

- `app/api/stripe/checkout/route.ts` is not present in this codebase.
- Equivalent active purchase route is `app/api/stripe/create-subscription/route.ts`.
