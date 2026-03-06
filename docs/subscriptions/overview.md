# Subscription System Overview

## Architecture overview

The system is **dual-layer**:

1. **`subscriptions` table (source of truth)**
   - Every active/canceled Stripe subscription is stored as a row in `convex/schema.ts` (`subscriptions` table).
   - Most runtime access checks and package/GPT logic read from this table (`convex/subscriptions.ts`, `convex/gptAccess.ts`).

2. **`users.subscription` (legacy read cache)**
   - `users.subscription` is an embedded object containing the “top” active subscription snapshot.
   - It exists for backward compatibility with older reads and UI paths (for example `api.users.getUserSubscription` in `convex/users.ts`).
   - It is not the primary source for entitlement decisions anymore.

### Why `users.subscription` still exists

- Existing frontend/server paths still consume `api.users.getUserSubscription` and expect one subscription-shaped object.
- The system now supports multiple subscriptions per user, so cache compaction is needed for old consumers.
- `users.subscription` provides a compatibility bridge while the app migrates to full table-based reads.

> ⚠️ Important: `users.subscription` is a cache snapshot, not authoritative state.

## `syncUserSubscriptionCache`: what/when/why

Defined in `convex/subscriptions.ts`, this function:

- loads all subscriptions for one user,
- filters to active statuses,
- sorts newest-first,
- stores up to 6 IDs in `users.subscriptionIds`,
- writes the newest active row into `users.subscription`.

### Core snippet

```ts
const activeSubs = subs
  .filter((sub: any) => isEntitled(sub))
  .sort(
    (a: any, b: any) =>
      (b.created ?? b._creationTime) - (a.created ?? a._creationTime)
  );

const subscriptionIds = activeSubs.slice(0, 6).map((sub: any) => sub._id);
const top = activeSubs[0];

await ctx.db.patch(userId, {
  subscriptionIds,
  subscription: legacySubscription,
  updatedAt: Date.now()
});
```

### When it runs

- after `upsertSubscriptionCore` (insert or update),
- after `cancelSubscription`,
- after `cancelSubscriptionAtPeriodEnd`,
- after `reactivateSubscription`,
- during migration/backfill operations.

## ACTIVE_STATUSES and why `past_due` is included

`convex/subscriptions.ts` and `convex/gptAccess.ts` treat these as active:

- `active`
- `trialing`
- `past_due`

`past_due` is included so users keep access during payment-recovery grace period. Webhook failure flow sets:

- `status: "past_due"`
- `paymentFailureGracePeriodEnd = now + 7 days`

in `app/api/webhooks/stripe/route.ts` (`handleInvoicePaymentFailed`).

Grace period enforcement is implemented in `convex/lib/subscriptionUtils.ts` via `isEntitled()`.
`past_due` subscriptions are entitled only while `Date.now() < paymentFailureGracePeriodEnd`.
Legacy rows without `paymentFailureGracePeriodEnd` default to entitled (backward compatible).

---

## Data flow diagram (text)

```txt
User buys
  ↓
Stripe Checkout (/api/stripe/create-subscription)
  ↓
Stripe events (customer.subscription.*, invoice.*)
  ↓
Webhook handler (/api/webhooks/stripe)
  ↓
api.subscriptions.upsertSubscription (Convex)
  ↓
subscriptions table (source of truth)
  ↓
syncUserSubscriptionCache
  ↓
users.subscription (legacy cache)
```

---

## Key design decisions

### 1) Each package is a separate Stripe subscription

The purchase path checks count and creates new subscription records instead of mutating one monolithic subscription. This enables package stacking and independent cancellation windows.

- Checkout-side guard: `app/api/stripe/create-subscription/route.ts`
- Storage model: one row per Stripe subscription in `subscriptions`

### 2) GPT access is a union across all active subscriptions

`convex/gptAccess.ts` merges `gptIds` from all active rows:

```ts
for (const sub of activeSubs) {
  for (const gptId of sub.gptIds || []) {
    merged.add(gptId);
  }
}
```

This allows users with multiple packages to access the combined GPT set.

### 3) `past_due` still grants access (grace)

`invoice.payment_failed` webhook sets 7-day grace metadata and keeps entitlement under `past_due` state.

### 4) Stripe package/GPT resolution is database-backed

`convex/stripe.ts` resolves packages from Convex tables (productId first, then priceId) via `resolvePackageFromStripe`, then reads real GPT IDs from `gpts.by_packageId`.

- no hardcoded `priceId -> package` map is used in the active path,
- no synthetic `gpt-1`, `gpt-2`, ... IDs are generated.

### 5) 6-subscription cap is enforced in two layers

- **Layer 1 (checkout API):** `/api/stripe/create-subscription` blocks when active count is already 6 (HTTP 400).
- **Layer 2 (data mutation):** `upsertSubscriptionCore` in `convex/subscriptions.ts` blocks insertion of additional active rows with `ConvexError(code: "MAX_SUBSCRIPTIONS_REACHED")`.

This protects both normal checkout and out-of-band Stripe paths (e.g. external payment links hitting webhook).
