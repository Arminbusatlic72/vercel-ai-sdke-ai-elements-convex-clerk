# Webhook Configuration Quick Start

## 🎯 What Changed

Your Stripe and Clerk webhooks have been refactored for better performance, reliability, and Squarespace support. All webhook signatures are now properly verified using raw bytes.

## 🔧 Configuration Required

### 1. Add CLERK_WEBHOOK_SECRET to Vercel

1. Go to [Clerk Dashboard](https://dashboard.clerk.com) → Webhooks
2. Create a new webhook endpoint:
   - **URL:** `https://yourdomain.com/api/webhooks/clerk`
   - **Events:** `user.created`, `user.updated`
   - **Copy the signing secret**

3. Add to Vercel environment variables:
   - Go to Vercel dashboard → Settings → Environment Variables
   - Add new variable: `CLERK_WEBHOOK_SECRET` = `whsec_...` (paste the secret)
   - **IMPORTANT:** Add to "Production" environment

### 2. Verify Stripe Webhook Secret

1. Go to [Stripe Dashboard](https://dashboard.stripe.com) → Webhooks
2. Verify the endpoint exists:
   - **URL:** `https://yourdomain.com/api/webhooks/stripe`
   - **Events:** `checkout.session.completed`, `customer.subscription.*`, `invoice.payment_*`
   - **Copy the signing secret**

3. Verify in Vercel:
   - `STRIPE_WEBHOOK_SECRET` should already be set
   - If not, add it: `whsec_...` (paste from Stripe)

## 📝 Webhook Endpoints

| Endpoint               | Method | Purpose                           | Signature                 |
| ---------------------- | ------ | --------------------------------- | ------------------------- |
| `/api/webhooks/stripe` | POST   | Handle Stripe subscription events | `stripe-signature` header |
| `/api/webhooks/clerk`  | POST   | Auto-claim pending subscriptions  | `svix-signature` header   |

## 🔄 Flow Diagrams

### Squarespace Purchase → Auto-Claim

```
1. User buys on Squarespace with their email
2. Stripe creates customer (no Clerk metadata)
3. Stripe webhook saves to "pending subscriptions"
4. User signs up with Clerk (same email)
5. Clerk webhook finds pending subscription
6. Auto-claims and links to user ✅
```

### Direct Subscription Checkout

```
1. Clerk user goes to checkout
2. Creates Stripe subscription
3. Stripe sends checkout.session.completed
4. Webhook resolves user and syncs subscription ✅
```

### Payment Failure Recovery

```
1. Invoice payment fails
2. Stripe sends invoice.payment_failed
3. Webhook sets grace period (7 days)
4. User can retry payment within grace period
5. If successful → restore access ✅
6. If failed → subscription expires, downgrade to free
```

## 🧪 Testing Webhooks Locally

### Stripe Webhook Testing

```bash
# Install Stripe CLI: https://stripe.com/docs/stripe-cli

# Start forwarding Stripe events to local server
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# Trigger a test event
stripe trigger payment_intent.succeeded

# Check logs in your Next.js dev server
```

### Clerk Webhook Testing

```bash
# Clerk webhooks are harder to test locally because they require:
# 1. Real Clerk secret (from Clerk dashboard)
# 2. ngrok or similar to expose localhost

# Easier approach: Deploy to Vercel and test there

# To test locally with ngrok:
npx ngrok http 3000
# Copy forwarding URL, add to Clerk webhooks

# Then create a test user in Clerk dashboard
```

## 📋 Deployment Checklist

- [ ] Set `CLERK_WEBHOOK_SECRET` in Vercel environment variables
- [ ] Verify `STRIPE_WEBHOOK_SECRET` is set in Vercel
- [ ] Create webhook endpoint in Clerk dashboard
- [ ] Verify webhook endpoint in Stripe dashboard
- [ ] Deploy to Vercel: `git push`
- [ ] Wait for Vercel build to complete
- [ ] Check Vercel logs for webhook processing
- [ ] Test with a Squarespace → Stripe → Clerk flow
- [ ] Monitor webhook delivery in both dashboards

## ⚙️ Environment Variables Summary

```bash
# REQUIRED - NEW (from Clerk)
CLERK_WEBHOOK_SECRET=whsec_...

# REQUIRED - EXISTING (verify set)
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_CONVEX_URL=https://...

# OPTIONAL - Price mapping (already configured)
STRIPE_PRICE_SANDBOX_LEVEL_MONTHLY=price_...
STRIPE_PRICE_CLIENT_PROJECT_GPT_MONTHLY=price_...
STRIPE_PRICE_BASIC_ID=price_...
STRIPE_PRICE_PRO_ID=price_...
```

## 🚨 Troubleshooting

### "CLERK_WEBHOOK_SECRET not configured"

- ✅ Check Vercel environment variables
- ✅ Value must be set in "Production" environment
- ✅ Redeploy after setting env vars

### "Signature verification failed"

- ✅ Verify correct secret is set (not other provider's secret)
- ✅ Check webhook endpoint URL matches exactly
- ✅ For Stripe: `stripe-signature` header
- ✅ For Clerk: `svix-signature` header

### Pending subscriptions not claiming

- ✅ Verify Clerk webhook endpoint is working
- ✅ Check that user email matches Squarespace email
- ✅ Look at Convex logs for claim operation
- ✅ Verify `getPendingSubscriptionByEmail` query exists

### Webhook not processing

- ✅ Check Vercel logs: `vercel logs`
- ✅ Check webhook delivery in provider dashboard (Stripe/Clerk)
- ✅ Verify endpoint returns 200 OK status
- ✅ Check TypeScript errors: `npm run build`

## 📞 Support Resources

- **Stripe Webhooks:** https://stripe.com/docs/webhooks
- **Clerk Webhooks:** https://clerk.com/docs/webhooks/overview
- **Next.js API Routes:** https://nextjs.org/docs/app/building-your-application/routing/route-handlers

## ✅ Ready?

Once you've completed the checklist above, your webhook system is ready for:

- ✅ Squarespace external purchases
- ✅ Direct checkout subscriptions
- ✅ Payment failure recovery
- ✅ Auto-claim on user sign-up
- ✅ Production-grade reliability

**Deploy with confidence!** 🚀
