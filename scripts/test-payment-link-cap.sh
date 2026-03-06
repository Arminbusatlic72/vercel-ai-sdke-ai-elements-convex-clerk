#!/bin/bash

# =============================================================================
# Payment Link Cap Test
# Simulates a user bypassing the app checkout via a direct Payment Link
# and verifies the webhook auto-cancels and refunds the 7th subscription
#
# PREREQUISITES:
# 1. Test account must have EXACTLY 6 active subscriptions in Stripe + Convex
# 2. stripe listen must be running: stripe listen --forward-to localhost:3000/api/webhooks/stripe
# 3. Dev server must be running: npm run dev
# =============================================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

STRIPE_TEST_CUSTOMER_ID="${STRIPE_TEST_CUSTOMER_ID:-}"
STRIPE_TEST_PRICE_ID="${STRIPE_TEST_PRICE_ID:-}"

if [ -z "$STRIPE_TEST_CUSTOMER_ID" ] || [ -z "$STRIPE_TEST_PRICE_ID" ]; then
  echo -e "${RED}Set STRIPE_TEST_CUSTOMER_ID and STRIPE_TEST_PRICE_ID first${NC}"
  exit 1
fi

echo -e "${YELLOW}━━━ Payment Link Cap Test ━━━${NC}"
echo "Customer: $STRIPE_TEST_CUSTOMER_ID"
echo "Price: $STRIPE_TEST_PRICE_ID"
echo ""

# Step 1 — Confirm exactly 6 active subs before test
echo "Step 1: Checking current subscription count..."
CURRENT_COUNT=$(stripe subscriptions list \
  --customer "$STRIPE_TEST_CUSTOMER_ID" \
  --status active \
  --limit 10 2>/dev/null | grep -c '"id"' || echo "0")

echo "Current active subscriptions: $CURRENT_COUNT"

if [ "$CURRENT_COUNT" != "6" ]; then
  echo -e "${RED}❌ Expected exactly 6 active subscriptions, found $CURRENT_COUNT${NC}"
  echo "Clean up your test account to exactly 6 before running this test"
  exit 1
fi

echo -e "${GREEN}✅ Confirmed 6 active subscriptions${NC}"

# Step 2 — Simulate Payment Link purchase (creates sub directly in Stripe, bypassing app)
echo ""
echo "Step 2: Simulating Payment Link purchase (bypassing app checkout)..."
echo "This creates a real Stripe subscription that should trigger auto-cancel + refund"
echo ""
echo -e "${YELLOW}⚠️  Creating 7th subscription via Stripe CLI...${NC}"

# Trigger a subscription.created event scoped to your test customer
stripe trigger customer.subscription.created \
  --override "customer.subscription.created:customer=$STRIPE_TEST_CUSTOMER_ID" \
  2>&1

echo ""
echo "Step 3: Waiting 10s for webhook to process auto-cancel + refund..."
sleep 10

# Step 4 — Verify subscription count is still 6
echo "Step 4: Verifying subscription count is still 6..."
NEW_COUNT=$(stripe subscriptions list \
  --customer "$STRIPE_TEST_CUSTOMER_ID" \
  --status active \
  --limit 10 2>/dev/null | grep -c '"id"' || echo "0")

echo "Active subscriptions after test: $NEW_COUNT"

if [ "$NEW_COUNT" = "6" ]; then
  echo -e "${GREEN}✅ PASS: Subscription count remains 6 — auto-cancel worked${NC}"
else
  echo -e "${RED}❌ FAIL: Subscription count is now $NEW_COUNT — auto-cancel may have failed${NC}"
  echo "Check Stripe Dashboard → Developers → Webhooks → Event deliveries"
  echo "Check Vercel logs for [SUBSCRIPTION_CAP_EXCEEDED] or errors"
fi

echo ""
echo "Step 5: Manual verification checklist"
echo "─────────────────────────────────────"
echo "[ ] Stripe Dashboard → Payments → check for a refund with reason: 'duplicate'"
echo "[ ] Stripe Dashboard → Webhooks → customer.subscription.created → response: 409"
echo "[ ] Vercel logs → search for [SUBSCRIPTION_CAP_EXCEEDED]"
echo "[ ] Convex dashboard → subscriptions table → still shows 6 rows for this user"
