# Subscription System - Developer Checklist

Use this checklist to verify the subscription system is properly set up and working.

---

## Pre-Deployment Verification

### Database Schema

- [ ] `convex/schema.ts` contains enhanced `subscription` object with:
  - [ ] `currentPeriodStart: number`
  - [ ] `currentPeriodEnd: number`
  - [ ] `trialEndDate?: number`
  - [ ] `paymentFailureGracePeriodEnd?: number`
  - [ ] `lastPaymentFailedAt?: number`
  - [ ] `canceledAt?: number`
- [ ] `convex/schema.ts` contains `webhookEvents` table with:
  - [ ] `stripeEventId` (primary key, unique)
  - [ ] `eventType`
  - [ ] `status`
  - [ ] Index on `stripeEventId` for fast lookup

### Backend Mutations & Queries

- [ ] `convex/subscriptions.ts` has `syncSubscriptionFromStripe()` mutation with:
  - [ ] Optional args: `trialEndDate`, `paymentFailureGracePeriodEnd`, `lastPaymentFailedAt`, `canceledAt`
  - [ ] Auto-create user fallback if not found
  - [ ] Preserves `gptIds` on non-cancellation
  - [ ] Resets `gptIds` only when `status === "canceled"`
- [ ] `convex/subscriptions.ts` has `getSubscriptionHealth()` query returning:
  - [ ] `isActive` (true if active, trialing, or in grace period)
  - [ ] `status` (descriptive key for frontend)
  - [ ] `daysUntilExpiration`
  - [ ] `isInGracePeriod`
  - [ ] `isTrialing`
  - [ ] All tracking fields
- [ ] `convex/webhooks.ts` exists with:
  - [ ] `recordWebhookEvent()` mutation for tracking
  - [ ] `getWebhookEvent()` query for idempotency check
- [ ] `convex/users.ts` has `getOrCreateUserFromWebhook()` mutation

### Webhook Handler

- [ ] `app/api/webhooks/stripe/route.ts` POST handler:
  - [ ] Verifies Stripe signature
  - [ ] Checks `webhookEvents` table for duplicates (idempotency)
  - [ ] Routes to appropriate handler
  - [ ] Records webhook event after successful processing
  - [ ] Returns proper error status codes
- [ ] Handler: `handleCheckoutSessionCompleted()`
  - [ ] Auto-creates user if missing
  - [ ] Extracts subscription ID from session
  - [ ] Delegates to `handleSubscriptionUpdate()`
- [ ] Handler: `handleSubscriptionUpdate()`
  - [ ] Detects trial status: `subscription.status === "trialing"`
  - [ ] Tracks `trial_end` → `trialEndDate` (in milliseconds)
  - [ ] Maps correct `maxGpts` per plan type:
    - [ ] sandbox: 12
    - [ ] clientProject: 1
    - [ ] basic: 3
    - [ ] pro: 6
  - [ ] Passes all fields to `syncSubscriptionFromStripe()`
  - [ ] Logs `cancel_at_period_end` scenarios
- [ ] Handler: `handleSubscriptionDeleted()`
  - [ ] Sets `status: "canceled"` (true cancellation)
  - [ ] Sets `gptIds: []` (reset access)
  - [ ] Sets `maxGpts: 0` (downgrade to free)
  - [ ] Sets `canceledAt: Date.now()`
  - [ ] Clears trial and grace period fields
- [ ] Handler: `handleInvoicePaymentFailed()`
  - [ ] Sets `status: "past_due"`
  - [ ] Calculates `gracePeriodEnd = now + 7 days`
  - [ ] Sets `lastPaymentFailedAt: Date.now()`
  - [ ] Passes all 3 fields to mutation
  - [ ] Correct plan mapping (not hardcoded)
- [ ] Handler: `handleInvoicePaymentSucceeded()`
  - [ ] Fetches subscription from Stripe
  - [ ] Delegates to `handleSubscriptionUpdate()`
  - [ ] Clears grace period on recovery

### Frontend Hook

- [ ] `lib/hooks/useSubscriptionStatus.ts` exists with:
  - [ ] `useSubscriptionStatus()` hook returns correct shape
  - [ ] `getStatusMessage(status)` helper
  - [ ] `getExpirationText(status, formatDate)` helper
  - [ ] `getStatusBadgeClass(status)` helper
- [ ] Hook queries `api.subscriptions.getSubscriptionHealth`

### Frontend Component

- [ ] `components/subscription/SubscriptionStatusCard.tsx` exists with:
  - [ ] Active state: Green card, "Subscription Active" with renewal date
  - [ ] Trial state: Blue card, "Free Trial Active" with countdown
  - [ ] Grace Period state: Yellow card, "Payment Failed" with update button
  - [ ] Expires Soon state: Orange card, cancel warning with reactivate button
  - [ ] Canceled state: Gray card, downgrade notice with upgrade button
  - [ ] Past Due state: Red card, urgent payment request
  - [ ] No Subscription state: Gray card, upgrade prompt
  - [ ] All states have `onManageClick` button handler
  - [ ] All states show `daysUntilExpiration` when available

### Bug Fixes

- [ ] `components/dashboard/ManageSubscription.tsx` has fixed `formatDate()`:
  - [ ] No multiplication by 1000 (timestamps already in ms)
  - [ ] Shows correct dates (not year 58147)

### Documentation

- [ ] `docs/SUBSCRIPTION_IMPLEMENTATION.md` exists
- [ ] `docs/SUBSCRIPTION_QUICK_REFERENCE.md` exists
- [ ] `docs/IMPLEMENTATION_SUMMARY.md` exists

---

## Runtime Verification

### Webhook Processing

- [ ] Webhook endpoint configured in Stripe dashboard: `/api/webhooks/stripe`
- [ ] `STRIPE_WEBHOOK_SECRET` in `.env.local`
- [ ] Webhook events enabled:
  - [ ] `checkout.session.completed`
  - [ ] `customer.subscription.created`
  - [ ] `customer.subscription.updated`
  - [ ] `customer.subscription.deleted`
  - [ ] `invoice.payment_succeeded`
  - [ ] `invoice.payment_failed`

### Test Scenarios

Run through each scenario and verify:

#### Scenario 1: New Subscription

- [ ] User completes checkout
- [ ] Webhook fires: `checkout.session.completed`
- [ ] User auto-created if missing (check logs)
- [ ] Subscription synced to Convex
- [ ] `subscription.status = "active"`
- [ ] `subscription.maxGpts` = correct per plan
- [ ] Frontend hook returns `isActive: true`
- [ ] SubscriptionStatusCard shows green "Active" state
- [ ] Logs show "✅ Subscription synced"

#### Scenario 2: Plan Upgrade

- [ ] User upgrades from basic (3 GPTs) to pro (6 GPTs)
- [ ] Webhook fires: `customer.subscription.updated`
- [ ] Webhook handler detects plan change (price ID changed)
- [ ] `maxGpts` updated from 3 → 6
- [ ] User can immediately create more GPTs
- [ ] No gaps in service

#### Scenario 3: Trial Period

- [ ] User signs up with trial
- [ ] `subscription.status = "trialing"`
- [ ] `trialEndDate` is set to correct timestamp
- [ ] Frontend hook returns `isTrialing: true`
- [ ] SubscriptionStatusCard shows blue "Trial Active"
- [ ] Countdown shows correct days remaining
- [ ] At trial end, status changes to active or canceled

#### Scenario 4: Payment Failure with Grace Period

- [ ] Payment fails during billing
- [ ] Webhook fires: `invoice.payment_failed`
- [ ] `subscription.status = "past_due"`
- [ ] `paymentFailureGracePeriodEnd` = 7 days from now
- [ ] Frontend hook returns:
  - [ ] `isActive: true` (still has access!)
  - [ ] `isInGracePeriod: true`
  - [ ] `status: "grace_period"`
- [ ] SubscriptionStatusCard shows yellow warning
- [ ] "Update Payment Method" button present
- [ ] User retains full access during grace period
- [ ] Logs show "⏳ Setting 7-day grace period"

#### Scenario 5: Payment Recovery

- [ ] User updates payment method
- [ ] Stripe retries and succeeds
- [ ] Webhook fires: `invoice.payment_succeeded`
- [ ] `subscription.status` back to "active"
- [ ] `paymentFailureGracePeriodEnd` cleared
- [ ] Frontend hook returns `isInGracePeriod: false`
- [ ] SubscriptionStatusCard back to green state
- [ ] User access fully restored

#### Scenario 6: Scheduled Cancellation

- [ ] User clicks "Cancel Subscription"
- [ ] API call: `POST /api/stripe/cancel-subscription` with `cancelAtPeriodEnd: true`
- [ ] Webhook fires: `customer.subscription.updated` with `cancel_at_period_end: true`
- [ ] `subscription.cancelAtPeriodEnd = true`
- [ ] `gptIds` NOT reset (user keeps access)
- [ ] SubscriptionStatusCard shows orange warning
- [ ] "Expires on [date]" displayed
- [ ] User has full access until period end
- [ ] At period end, subscription truly deleted

#### Scenario 7: True Cancellation

- [ ] Billing period ends (after scheduled cancellation)
- [ ] Webhook fires: `customer.subscription.deleted`
- [ ] `subscription.status = "canceled"`
- [ ] `subscription.gptIds = []` (access revoked)
- [ ] `subscription.maxGpts = 0`
- [ ] `subscription.canceledAt` timestamp set
- [ ] Frontend hook returns `isActive: false`
- [ ] SubscriptionStatusCard shows gray state
- [ ] User downgraded to free tier

### Webhook Idempotency

- [ ] Send same webhook event twice
- [ ] Check `webhookEvents` table:
  - [ ] First call: Event recorded as "success"
  - [ ] Second call: Event already exists, processing skipped
- [ ] Logs show warning on duplicate: "⚠️ Event already processed"
- [ ] No duplicate subscription records in DB
- [ ] Audit trail clean (one entry per event)

### Race Condition Prevention

- [ ] Fire webhook before client-side `syncCurrentUser()` completes
- [ ] Check logs for: "Auto-creating from subscription sync"
- [ ] User still created (3-layer defense worked)
- [ ] Subscription synced successfully
- [ ] No "User not found" errors

### Frontend Real-Time Updates

- [ ] Open SubscriptionStatusCard component
- [ ] Trigger webhook in Stripe dashboard (test event)
- [ ] Component updates without page refresh
- [ ] Status changes reflected in real-time
- [ ] Convex reactive query working

---

## Performance & Monitoring

### Database Queries

- [ ] `webhookEvents` query by `stripeEventId` is fast (indexed)
- [ ] `getSubscriptionHealth()` returns in <100ms
- [ ] No N+1 queries in webhook handler

### Logging

- [ ] All webhook events logged with event ID
- [ ] Errors logged with context (clerkId, subscriptionId, etc.)
- [ ] Grace period logic logged with exact timestamps
- [ ] Trial tracking logged when detected
- [ ] User auto-create logged as fallback

### Error Handling

- [ ] Network errors don't crash webhook handler
- [ ] Missing user handled gracefully (auto-create)
- [ ] Invalid subscription state logged with details
- [ ] Stripe API errors caught and logged
- [ ] Mutations return success/failure clearly

---

## Security Verification

- [ ] Stripe webhook signature verified on every request
- [ ] No Stripe secret key exposed in frontend code
- [ ] `cancelSubscriptionAtPeriodEnd()` checks user owns subscription
- [ ] `reactivateSubscription()` checks user owns subscription
- [ ] Idempotency prevents accidental duplicate processing
- [ ] Webhook events stored with timestamps for audit
- [ ] No PII logged in webhook handler

---

## Deployment Checklist

### Before Going Live

- [ ] All tests passing
- [ ] Webhook endpoint tested with Stripe test events
- [ ] Database migrations applied
- [ ] Environment variables set:
  - [ ] `STRIPE_SECRET_KEY`
  - [ ] `STRIPE_WEBHOOK_SECRET`
  - [ ] `NEXT_PUBLIC_CONVEX_URL`
- [ ] All team members have documentation links
- [ ] On-call plan for webhook failures
- [ ] Rollback plan documented

### First Week Monitoring

- [ ] Check webhook logs daily
- [ ] Monitor error rates in Stripe dashboard
- [ ] Verify users can subscribe without issues
- [ ] Verify grace period works correctly
- [ ] Check no race condition errors
- [ ] Monitor response times
- [ ] Set up alerts for webhook failures

### Documentation

- [ ] Team has access to `SUBSCRIPTION_IMPLEMENTATION.md`
- [ ] QA team has testing scenarios
- [ ] Support team understands subscription states
- [ ] Product team can explain grace period to customers

---

## Troubleshooting Checklist

If something isn't working:

### Webhook Not Processing

- [ ] Check webhook endpoint in Stripe dashboard
- [ ] Verify `STRIPE_WEBHOOK_SECRET` matches
- [ ] Check server logs for signature verification errors
- [ ] Verify event type is in the router switch statement
- [ ] Check database for webhook event record (was it recorded?)

### User Showing as Canceled When Shouldn't Be

- [ ] Check webhook type: was it `customer.subscription.deleted`?
- [ ] Or was it `customer.subscription.updated` with `cancel_at_period_end: true`?
- [ ] If scheduled cancel, `status` should NOT be "canceled" yet
- [ ] Check logs for the exact webhook that caused the issue

### Subscription Status Stuck

- [ ] Force refresh query in Convex dashboard
- [ ] Check user's subscription object in DB
- [ ] Look for latest webhook event in `webhookEvents` table
- [ ] Check if webhook recording failed (error in logs)
- [ ] Manually re-trigger webhook in Stripe dashboard

### Grace Period Not Working

- [ ] Verify `paymentFailureGracePeriodEnd` set correctly
- [ ] Check frontend grace period calculation: `gracePeriodEnd > now`
- [ ] Verify status is "past_due"
- [ ] Check `getSubscriptionHealth()` returning `isInGracePeriod: true`
- [ ] Look at SubscriptionStatusCard state detection logic

### Dates Showing Wrong

- [ ] Verify no multiplication by 1000 in `formatDate()`
- [ ] Check all timestamps are in milliseconds (not seconds)
- [ ] Verify Convex returning milliseconds from database
- [ ] Check frontend date formatting library settings

### Race Condition Still Occurring

- [ ] Verify `getOrCreateUserFromWebhook()` called in webhook
- [ ] Check mutation auto-create fallback working
- [ ] Verify all fallback lookups: metadata → query → customer
- [ ] Look for "Auto-creating" log messages
- [ ] Increase log verbosity to trace user creation

---

## Sign-Off

- [ ] Implemented by: **********\_********** Date: **\_**
- [ ] Reviewed by: **********\_********** Date: **\_**
- [ ] Tested by: **********\_********** Date: **\_**
- [ ] Approved for production: **********\_********** Date: **\_**

All checkboxes completed? **System ready for production! ✨**
