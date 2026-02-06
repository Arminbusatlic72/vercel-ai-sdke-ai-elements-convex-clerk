# Subscription System - Quick Reference Guide

## Files Modified/Created

### Schema & Database

- **`convex/schema.ts`** - Enhanced subscription object with trial/payment failure tracking
- **`convex/webhooks.ts`** (NEW) - Idempotency tracking for webhooks

### Backend - Mutations & Queries

- **`convex/subscriptions.ts`** - Enhanced `syncSubscriptionFromStripe()` with new args, new `getSubscriptionHealth()` query
- **`convex/users.ts`** - Ensure `getOrCreateUserFromWebhook()` mutation exists

### Webhook Handlers

- **`app/api/webhooks/stripe/route.ts`** - Enhanced POST handler with idempotency checks, new handlers, trial/grace period tracking

### Frontend - Hooks & Components

- **`lib/hooks/useSubscriptionStatus.ts`** (NEW) - React hook for subscription health
- **`components/subscription/SubscriptionStatusCard.tsx`** (NEW) - Component for all subscription states

### Documentation

- **`docs/SUBSCRIPTION_IMPLEMENTATION.md`** (NEW) - Complete reference guide

---

## API Mutation Signatures

### Sync Subscription from Stripe

```typescript
await convex.mutation(api.subscriptions.syncSubscriptionFromStripe, {
  clerkUserId: "user_123",
  stripeSubscriptionId: "sub_xyz",
  stripeCustomerId: "cus_abc",
  status: "active",
  priceId: "price_xxx",
  planType: "pro",
  currentPeriodStart: 1704067200000,
  currentPeriodEnd: 1706745600000,
  cancelAtPeriodEnd: false,
  maxGpts: 6,
  trialEndDate: undefined,
  paymentFailureGracePeriodEnd: undefined,
  lastPaymentFailedAt: undefined,
  canceledAt: undefined
});
```

### Record Webhook Event (Idempotency)

```typescript
await convex.mutation(api.webhooks.recordWebhookEvent, {
  stripeEventId: "evt_1a2b3c",
  eventType: "customer.subscription.updated",
  status: "success"
});
```

### Get Webhook Event (Check if Already Processed)

```typescript
const existing = await convex.query(api.webhooks.getWebhookEvent, {
  stripeEventId: "evt_1a2b3c"
});
```

### Cancel Subscription at Period End

```typescript
await convex.mutation(api.subscriptions.cancelSubscriptionAtPeriodEnd, {
  stripeSubscriptionId: "sub_xyz"
});
```

### Reactivate Subscription

```typescript
await convex.mutation(api.subscriptions.reactivateSubscription, {
  stripeSubscriptionId: "sub_xyz"
});
```

### Get Subscription Health

```typescript
const health = await convex.query(api.subscriptions.getSubscriptionHealth);
// Returns: { isActive, status, daysUntilExpiration, isInGracePeriod, isTrialing, ... }
```

---

## Frontend Hook Usage

### useSubscriptionStatus()

```typescript
'use client';

import { useSubscriptionStatus } from '@/lib/hooks/useSubscriptionStatus';

export function MyComponent() {
  const status = useSubscriptionStatus();

  if (status.isLoading) return <div>Loading...</div>;

  console.log({
    isActive: status.isActive,        // true/false
    statusKey: status.status,         // "active" | "trialing" | "grace_period" | etc
    daysLeft: status.daysUntilExpiration,
    inGrace: status.isInGracePeriod,
    isTrial: status.isTrialing,
    plan: status.plan,
    trialEnds: status.trialEndDate,
    graceEnds: status.gracePeriodEndDate,
    willExpire: status.cancelAtPeriodEnd
  });

  return (
    <div>
      {status.isActive ? 'Premium' : 'Free'}
      {status.isInGracePeriod && '⚠️ Update payment!'}
    </div>
  );
}
```

### useSubscriptionStatus() + SubscriptionStatusCard

```typescript
import { SubscriptionStatusCard } from '@/components/subscription/SubscriptionStatusCard';

export function BillingPage() {
  return (
    <SubscriptionStatusCard
      showDetails={true}
      onManageClick={() => window.location.href = '/billing'}
    />
  );
}
```

### Status Message Helper

```typescript
import { getStatusMessage } from "@/lib/hooks/useSubscriptionStatus";

const status = useSubscriptionStatus();
const message = getStatusMessage(status.status);
// "Your subscription is active" | "Trial ends soon" | etc
```

### Format Expiration Text

```typescript
import { getExpirationText } from "@/lib/hooks/useSubscriptionStatus";
import { formatDate } from "@/lib/formatters";

const status = useSubscriptionStatus();
const text = getExpirationText(status, formatDate);
// "Renews Jan 15, 2024" | "Trial ends Jan 8, 2024" | etc
```

---

## Webhook Event Flow

### Checkout Session Completed → New Subscription

```
User clicks Checkout → Stripe creates subscription → Webhook: checkout.session.completed
  ├─ Auto-create user if missing (race condition prevention)
  ├─ Fetch subscription from Stripe
  └─ Call syncSubscriptionFromStripe() → User ready to use premium features
```

### Subscription Updated → Plan Change or Trial

```
User upgrades plan → Stripe updates subscription → Webhook: customer.subscription.updated
  ├─ Detect trial if status === "trialing"
  ├─ Map correct maxGpts per plan type
  ├─ Handle cancel_at_period_end (user keeps access)
  └─ Sync to Convex
```

### Subscription Deleted → True Cancellation

```
Admin/user cancels → Stripe deletes subscription → Webhook: customer.subscription.deleted
  ├─ Mark as truly canceled (status = "canceled")
  ├─ Reset gptIds = []
  ├─ Set maxGpts = 0 (downgrade to free)
  └─ User loses access to paid features
```

### Invoice Payment Failed → Grace Period

```
Payment attempt fails → Webhook: invoice.payment_failed
  ├─ Set status = "past_due"
  ├─ Calculate gracePeriodEnd = now + 7 days
  ├─ Store lastPaymentFailedAt timestamp
  └─ User RETAINS FULL ACCESS for 7 days (grace period)
```

### Invoice Payment Succeeded → Grace Period Recovery

```
Payment retried & succeeds → Webhook: invoice.payment_succeeded
  ├─ Fetch latest subscription from Stripe
  ├─ Clear paymentFailureGracePeriodEnd
  ├─ Set status back to "active"
  └─ Grace period no longer applies
```

---

## Subscription States & User Access

| Status                       | Has Access? | Notes                                             |
| ---------------------------- | :---------: | ------------------------------------------------- |
| `active`                     |   ✅ YES    | Normal paid subscription                          |
| `trialing`                   |   ✅ YES    | Free trial period                                 |
| `past_due` (in grace period) |   ✅ YES    | Payment failed but 7-day grace period not expired |
| `past_due` (grace expired)   |    ❌ NO    | Payment failed and grace period expired           |
| `incomplete`                 |    ❌ NO    | Payment not completed during checkout             |
| `incomplete_expired`         |    ❌ NO    | Incomplete subscription expired                   |
| `unpaid`                     |    ❌ NO    | Invoice unpaid                                    |
| `paused`                     |    ❌ NO    | Subscription paused                               |
| `canceled`                   |    ❌ NO    | Subscription truly canceled                       |

### Frontend Grace Period Check

```typescript
const isActive =
  sub.status === "active" ||
  sub.status === "trialing" ||
  (sub.status === "past_due" &&
    sub.paymentFailureGracePeriodEnd &&
    sub.paymentFailureGracePeriodEnd > now);
```

---

## Key Fields in Subscription Object

```typescript
subscription: {
  // Core subscription info
  status: "active" | "trialing" | "past_due" | "canceled" | ...,
  stripeSubscriptionId: "sub_xyz",
  plan: "sandbox" | "clientProject" | "basic" | "pro",
  priceId: "price_xyz",
  maxGpts: 6,
  gptIds: ["gpt1", "gpt2"], // GPTs user has access to

  // Billing period tracking
  currentPeriodStart: 1704067200000,  // milliseconds
  currentPeriodEnd: 1706745600000,    // milliseconds (renewal/expiration date)

  // Cancellation tracking
  cancelAtPeriodEnd: false,           // User scheduled cancellation
  canceledAt: null,                   // Timestamp when actually canceled

  // ✅ NEW: Trial tracking
  trialEndDate: 1704067200000,        // When free trial ends

  // ✅ NEW: Payment failure tracking
  lastPaymentFailedAt: 1704067200000,
  paymentFailureGracePeriodEnd: 1705272000000, // 7 days from failure
}
```

---

## Testing Scenarios

### Scenario 1: New Subscription (Happy Path)

```
1. User completes checkout
2. Stripe webhook: checkout.session.completed fires
3. User auto-created if missing
4. Subscription synced
5. User can immediately use premium features
6. Status query shows isActive: true
```

### Scenario 2: Plan Upgrade

```
1. User in /manage-subscription page
2. User clicks "Manage in Stripe Portal"
3. User upgrades from basic (3 GPTs) to pro (6 GPTs)
4. Stripe webhook: customer.subscription.updated fires
5. maxGpts updated to 6
6. User can now create more GPTs
```

### Scenario 3: Payment Failure with Recovery

```
1. Billing date arrives, payment fails
2. Stripe webhook: invoice.payment_failed fires
3. paymentFailureGracePeriodEnd = now + 7 days
4. User still has full access for 7 days
5. SubscriptionStatusCard shows yellow warning with "Update Payment"
6. User updates payment method in Stripe portal
7. Stripe webhook: invoice.payment_succeeded fires
8. Grace period cleared
9. Status back to "active"
```

### Scenario 4: Cancellation

```
1. User clicks "Cancel Subscription" in dashboard
2. Calls API: POST /api/stripe/cancel-subscription with cancelAtPeriodEnd: true
3. Stripe webhook: customer.subscription.updated fires with cancel_at_period_end: true
4. cancelAtPeriodEnd set to true
5. SubscriptionStatusCard shows orange warning "Expires on [date]" with "Reactivate" button
6. User keeps full access until currentPeriodEnd
7. At period end, Stripe webhook: customer.subscription.deleted fires
8. Status = "canceled", gptIds = [], user downgraded to free
```

### Scenario 5: Trial Expiration

```
1. User on trial (status: "trialing", trialEndDate: future date)
2. SubscriptionStatusCard shows blue "Free Trial Active" with countdown
3. Trial end date arrives
4. Stripe auto-renews if payment method on file
5. If payment fails on trial end, invoice.payment_failed webhook fires
6. Grace period starts (user has 7 days to pay)
7. If no payment by grace period end, subscription canceled
```

---

## Debugging Checklist

- [ ] **Race Condition:** Check `users.createdAt` vs webhook timestamp in logs
- [ ] **Idempotency:** Verify webhooks table has entry for event ID
- [ ] **Grace Period:** Confirm `paymentFailureGracePeriodEnd > now` for grace status
- [ ] **Max GPTs:** Verify correct mapping per plan type
- [ ] **Cancel Logic:** Ensure `cancelAtPeriodEnd: true` doesn't downgrade immediately
- [ ] **Trial Tracking:** Check `trialEndDate` is set when `status: "trialing"`
- [ ] **User Lookup:** Verify fallback order: metadata → Convex query → Stripe customer
- [ ] **Timestamp Units:** Confirm all timestamps in milliseconds (not seconds)
- [ ] **Frontend Refresh:** Check if Convex query auto-updates after webhook (real-time)

---

## Common Issues & Solutions

### Issue: User created, but subscription not syncing

**Cause:** Race condition - webhook fires before user creation complete
**Solution:** Mutations have 3-layer defense. Check:

1. Is `getOrCreateUserFromWebhook` called in webhook?
2. Does `syncSubscriptionFromStripe` auto-create fallback?
3. Check logs for "Auto-creating from subscription sync"

### Issue: Date showing as year 58147

**Cause:** Timestamp multiplied by 1000 (was milliseconds, treated as seconds)
**Solution:** Already fixed in `formatDate()` - no multiplication

### Issue: User loses access on cancel_at_period_end

**Cause:** Code downgrading immediately instead of at period end
**Solution:** Check webhook handler - should only downgrade on `status: "canceled"`, not on flag

### Issue: Grace period not showing for payment failed

**Cause:** `paymentFailureGracePeriodEnd` not set, or already expired
**Solution:**

1. Check `handleInvoicePaymentFailed` sets grace period: `Date.now() + 7 * 24 * 60 * 60 * 1000`
2. Verify current timestamp not past grace period end
3. Check subscription status is "past_due"

### Issue: Duplicate subscriptions created

**Cause:** No idempotency check on webhook
**Solution:** Verify `api.webhooks.recordWebhookEvent` called after every webhook

---

## Performance Notes

- **Webhook Idempotency:** O(1) lookup on `webhookEvents` table by `stripeEventId` index
- **User Auto-Create:** O(log n) lookup by `clerkId` index, then insert
- **Subscription Sync:** O(log n) queries for lookups, O(1) patch operations
- **Frontend Hook:** Real-time reactive query via Convex (no polling needed)
- **Status Card Rendering:** ~40-50ms for style computation (7 different states)

---

## Security Considerations

1. **Stripe Signature Verification:** Always verify webhook signature before processing
2. **User Authorization:** `cancelSubscriptionAtPeriodEnd` checks user owns subscription
3. **Idempotency:** Even if webhook replayed, duplicate processing prevented
4. **Secret Management:** Keep `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` in `.env`
5. **Rate Limiting:** Consider rate-limiting webhook endpoint if traffic spikes
6. **Audit Trail:** All mutations with timestamps for compliance

---

## Future Enhancements

- [ ] Email notifications for payment failures
- [ ] SMS reminders for grace period expiration
- [ ] Dunning workflow (automatic retry schedule)
- [ ] Usage-based billing integration
- [ ] Seat-based pricing
- [ ] Annual plan support with discount logic
- [ ] Refund/credit processing
- [ ] Subscription pause/resume
- [ ] Admin override capabilities
- [ ] Revenue analytics dashboard
