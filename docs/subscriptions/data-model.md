# Subscription Data Model

## `subscriptions` table (source of truth)

Defined in `convex/schema.ts`.

### Fields

- `clerkUserId: string` — Clerk user identifier snapshot used by webhook/user lookups.
- `userId: Id<"users">` — FK to `users` table; primary ownership link.
- `stripeSubscriptionId: string` — Stripe subscription ID (`sub_...`), unique business key in practice.
- `stripeCustomerId: string` — Stripe customer (`cus_...`) owning the subscription.
- `status: string` — Stripe lifecycle state (`active`, `trialing`, `past_due`, etc.).
- `productId?: string` — Stripe product ID, preferred package resolver.
- `priceId: string` — Stripe price ID, fallback resolver.
- `planType: string` — internal plan/package key snapshot.
- `currentPeriodStart: number` — billing period start (ms in current write paths).
- `currentPeriodEnd: number` — billing period end (ms in current write paths).
- `cancelAtPeriodEnd?: boolean` — whether cancellation is scheduled.
- `gptIds: string[]` — denormalized GPT IDs for entitlement checks.
- `maxGpts?: number` — package cap snapshot.
- `productName?: string` — display name snapshot.
- `trialEndDate?: number` — trial end timestamp.
- `paymentFailureGracePeriodEnd?: number` — grace end timestamp for failed payment.
- `lastPaymentFailedAt?: number` — last payment failure timestamp.
- `created: number` — row creation timestamp.
- `canceledAt?: number` — cancellation timestamp.

### Required vs optional

- **Required:** identity (`clerkUserId`, `userId`, `stripeSubscriptionId`, `stripeCustomerId`), status, plan linkage (`priceId`, `planType`), period bounds, `gptIds`, `created`.
- **Optional:** product metadata (`productId`, `productName`), cancellation/trial/failure timestamps, `maxGpts`.
- Optionality exists because some webhook/pending/backfill paths may not have full package metadata at first write.

### Indexes and query usage

- `by_user_id` (`userId`)
  - used by: `getUserSubscriptionsCore`, `syncUserSubscriptionCache`, `hasActiveSubscription`, `gptAccess` helpers.
- `by_clerk_user_id` (`clerkUserId`)
  - currently defined; mostly historical fallback indexing.
- `by_status` (`status`)
  - currently defined; no major hot-path query currently depends on it directly.
- `by_stripe_subscription_id` (`stripeSubscriptionId`)
  - used by: `upsertSubscriptionCore`, `cancelSubscription`, `getSubscriptionWithGpts`, legacy user lookup by subscription, cancel/reactivate auth checks.
- `by_user_status` (`userId`, `status`)
  - currently defined for compound filtering; current code still mostly loads by `by_user_id` then filters in memory.

---

## `users.subscription` embedded object (legacy cache)

Defined in `convex/schema.ts` inside `users`.

### Fields (cache shape)

- `status`
- `stripeSubscriptionId`
- `plan`
- `productId?`
- `priceId?`
- `productName?`
- `currentPeriodStart?`
- `currentPeriodEnd?`
- `cancelAtPeriodEnd?`
- `canceledAt?`
- `trialEndDate?`
- `paymentFailureGracePeriodEnd?`
- `lastPaymentFailedAt?`
- `maxGpts?`
- `gptIds`

### Mapping to `subscriptions`

Cache fields map from the top active subscription row selected by `syncUserSubscriptionCache`:

- `plan <- planType`
- `stripeSubscriptionId <- stripeSubscriptionId`
- `status <- status`
- `productId/priceId/productName <- same-name row fields`
- period/cancel/trial/failure fields <- same-name row fields
- `gptIds/maxGpts <- row gpt entitlement snapshot`

### Critical warning

> ⚠️ Do not write `users.subscription` directly — always update through `api.subscriptions.upsertSubscription` / cancel / reactivate paths so `syncUserSubscriptionCache` stays canonical.

### When cache can be out of sync

- partial failures after table write but before cache patch,
- legacy/manual writes to `users.subscription`,
- historical data before migration/backfill.

### How to detect drift

1. Compare `subscriptions:getUserSubscriptions` output vs `users.getUserSubscription` payload.
2. If active rows exist but embedded cache is null/stale, run a controlled sync path (e.g. webhook-triggered update or backfill).

---

## `packages` table

Relevant fields (`convex/schema.ts`):

- `key` — internal package key.
- `name` — display name.
- `stripePriceId` — Stripe price link.
- `stripeProductId` — Stripe product link.
- `tier` — package tier classification (`free`, `paid`, `trial` values used by UI and package setup).
- `maxGpts` — package GPT limit snapshot.
- `durationDays`, `priceAmount`, `recurring`, `features`, `hidden` — display/plan behavior metadata.

### Stripe linkage

Package resolution prefers `stripeProductId`, then `stripePriceId` in subscription sync paths.

### GPT assignment

`gpts.packageId` links GPT rows to package rows. During sync, package-linked GPTs are denormalized into `subscriptions.gptIds`.

---

## `gpts` table (subscription-relevant fields)

- `gptId: string` — stable public identifier used in routing/access checks and stored inside `subscriptions.gptIds`.
- `packageId?: Id<"packages">` — package ownership relation used to derive package GPT entitlement.

---

## Entity relationship diagram (text)

```txt
packages ──< gpts (via packageId)
    │
    └── stripeProductId / stripePriceId (links to Stripe)

users ──< subscriptions (via userId)
    │         └── gptIds[] (denormalized from gpts.gptId)
    └── subscription{} (cache of latest active sub)
```
