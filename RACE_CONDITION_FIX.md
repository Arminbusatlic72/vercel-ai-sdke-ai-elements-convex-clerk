# User Creation Race Condition Fix

## Problem

When a user signs up and creates a Stripe subscription, the webhook fires faster than the client-side user sync completes:

```
Timeline:
1. User signs up in Clerk (instantly)
2. Frontend initiates Stripe subscription
3. Stripe webhook fires immediately (< 100ms)
4. Webhook tries to sync subscription → User not found in Convex
5. Mutation throws error: "User with clerkId ... not found"
6. Webhook returns 400, Stripe retries forever
```

## Root Cause

The user's local Convex record doesn't exist until `syncCurrentUser()` mutation runs, which happens in the background after auth. Stripe webhooks are much faster than the client-side sync.

## Solution: Auto-Create Users in Webhooks

### Three-Layer Defense

#### 1. **New Mutation: `getOrCreateUserFromWebhook`** (convex/users.ts)

- Created as an internal mutation (called only from server)
- Checks if user exists by `clerkId`
- **If user missing**: Auto-creates with minimal info from Stripe metadata
- Returns the user record (new or existing)
- Includes logging for debugging

```typescript
export const getOrCreateUserFromWebhook = internalMutation({
  args: {
    clerkId: v.string(),
    email: v.optional(v.string()),
    name: v.optional(v.string()),
    imageUrl: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (existingUser) return existingUser;

    // Auto-create with webhook data
    const userId = await ctx.db.insert("users", {
      clerkId: args.clerkId,
      email: args.email || "unknown@example.com",
      name: args.name || "User",
      role: "user", // Default role
      stripeCustomerId: undefined, // Will be set by webhook
      subscription: undefined,
      aiCredits: 10, // Starter credits
      createdAt: Date.now(),
      updatedAt: Date.now()
    });

    const newUser = await ctx.db.get(userId);
    console.log(`✅ Created user from webhook: ${args.clerkId}`);
    return newUser;
  }
});
```

#### 2. **Webhook Handler Updates** (app/api/webhooks/stripe/route.ts)

All three webhook handlers now call `getOrCreateUserFromWebhook`:

**`handleSubscriptionUpdate`:**

```typescript
// After finding clerkUserId
try {
  await convex.mutation(api.users.getOrCreateUserFromWebhook, {
    clerkId: clerkUserId,
    email: subscription.metadata?.email,
    name: subscription.metadata?.name
  });
} catch (error) {
  console.error(`❌ Failed to ensure user exists: ${error}`);
  return { success: false };
}
```

**`handleSubscriptionDeleted`:**

- Ensures user exists before deletion sync
- Gracefully skips if user truly cannot be found

**`handleInvoicePaymentFailed`:**

- Auto-creates user before updating subscription to past_due
- Uses invoice customer email as fallback

#### 3. **Fallback in Subscription Sync** (convex/subscriptions.ts)

The `syncSubscriptionFromStripe` mutation itself now auto-creates users:

```typescript
let user = await ctx.db
  .query("users")
  .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkUserId))
  .unique();

// Auto-create if not found
if (!user) {
  const userId = await ctx.db.insert("users", {
    clerkId: args.clerkUserId,
    email: "unknown@example.com",
    name: "User",
    role: "user",
    stripeCustomerId: args.stripeCustomerId,
    subscription: undefined,
    aiCredits: 10,
    createdAt: Date.now(),
    updatedAt: Date.now()
  });
  user = await ctx.db.get(userId);
}
```

## Benefits

✅ **Webhooks never fail due to missing users**

- Users auto-created with minimal info from Stripe
- Subscription sync always succeeds

✅ **Graceful degradation**

- If email unavailable, uses "unknown@example.com"
- Users can still use app and update profile later

✅ **Logging for visibility**

- When auto-created: `✅ Created user from webhook: {clerkId}`
- When already exists: Proceeds normally
- When user lookup fails: `⚠️ Gracefully skips`

✅ **Multiple fallback layers**

1. Webhook auto-creates via `getOrCreateUserFromWebhook`
2. Subscription sync auto-creates if mutation called directly
3. Graceful error handling if absolutely no clerkId found

## Testing the Fix

### Test Case 1: Fast Webhook (Race Condition)

1. Sign up new user
2. Immediately subscribe (before sync completes)
3. **Expected**: Webhook succeeds, user auto-created, subscription synced
4. **Verify**: No "User not found" errors in logs

### Test Case 2: Normal Flow

1. Sign up user
2. Wait for sync complete (isSynced = true)
3. Subscribe normally
4. **Expected**: Works as before, user found immediately

### Test Case 3: Manual Stripe Events

1. Create Stripe customer manually
2. Trigger subscription webhook
3. **Expected**: User auto-created from webhook metadata

## Future Improvements

1. **Email required for subscription**: When creating subscription, require email in metadata
2. **Webhook event logging**: Add `webhook_events` table to track all Stripe events
3. **User profile completion**: Prompt users to complete profile if auto-created
4. **Analytics**: Track auto-created users to monitor sign-up friction

## Related Files Changed

- `convex/users.ts`: Added `getOrCreateUserFromWebhook` mutation
- `app/api/webhooks/stripe/route.ts`: Updated all handlers to auto-create users
- `convex/subscriptions.ts`: Added fallback user creation in sync mutation
