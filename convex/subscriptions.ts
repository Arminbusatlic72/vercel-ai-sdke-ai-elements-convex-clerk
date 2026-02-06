import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const syncSubscriptionFromStripe = mutation({
  args: {
    clerkUserId: v.string(),
    stripeSubscriptionId: v.string(),
    stripeCustomerId: v.string(),
    status: v.union(
      v.literal("active"),
      v.literal("canceled"),
      v.literal("past_due"),
      v.literal("trialing"),
      v.literal("incomplete"),
      v.literal("incomplete_expired"),
      v.literal("unpaid"),
      v.literal("paused")
    ),
    priceId: v.string(),
    planType: v.union(
      v.literal("sandbox"),
      v.literal("clientProject"),
      v.literal("basic"),
      v.literal("pro")
    ),
    currentPeriodStart: v.number(),
    currentPeriodEnd: v.number(),
    cancelAtPeriodEnd: v.boolean(),
    maxGpts: v.number(),
    // ✅ NEW: Optional fields for enhanced tracking
    trialEndDate: v.optional(v.number()),
    paymentFailureGracePeriodEnd: v.optional(v.number()),
    lastPaymentFailedAt: v.optional(v.number()),
    canceledAt: v.optional(v.number())
  },
  handler: async (ctx, args) => {
    // 1️⃣ Find user by Clerk ID
    let user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkUserId))
      .unique();

    // ✨ NEW: Auto-create user if not found (race condition fix)
    if (!user) {
      console.warn(
        `⚠️ User not found for clerkId: ${args.clerkUserId}. Auto-creating from subscription sync.`
      );

      const userId = await ctx.db.insert("users", {
        clerkId: args.clerkUserId,
        email: "unknown@example.com",
        name: "User",
        role: "user",
        stripeCustomerId: args.stripeCustomerId,
        subscription: undefined,
        aiCredits: 10,
        aiCreditsResetAt: undefined,
        createdAt: Date.now(),
        updatedAt: Date.now()
      });

      user = await ctx.db.get(userId);
      console.log(
        `✅ Created user from subscription sync: ${args.clerkUserId}`
      );
    }

    if (!user) throw new Error(`Failed to create user: ${args.clerkUserId}`);

    // 2️⃣ Update user's subscription nested field
    // CRITICAL: Preserve existing gptIds during sync (only reset on true cancellation)
    const existingGptIds = user.subscription?.gptIds || [];

    await ctx.db.patch(user._id, {
      stripeCustomerId: args.stripeCustomerId,
      subscription: {
        status: args.status,
        stripeSubscriptionId: args.stripeSubscriptionId,
        plan: args.planType,
        priceId: args.priceId,
        currentPeriodStart: args.currentPeriodStart,
        currentPeriodEnd: args.currentPeriodEnd,
        cancelAtPeriodEnd: args.cancelAtPeriodEnd,
        trialEndDate: args.trialEndDate,
        paymentFailureGracePeriodEnd: args.paymentFailureGracePeriodEnd,
        lastPaymentFailedAt: args.lastPaymentFailedAt,
        canceledAt:
          args.status === "canceled"
            ? args.canceledAt || Date.now()
            : undefined,
        maxGpts: args.maxGpts,
        // Only reset gptIds if subscription truly canceled (not on schedule-for-cancellation)
        gptIds: args.status === "canceled" ? [] : existingGptIds
      },
      updatedAt: Date.now()
    });

    // 3️⃣ Also update or create in subscriptions table (audit/history)
    // IDEMPOTENCY: Prevent duplicates by finding the latest record for this subscription
    const existing = await ctx.db
      .query("subscriptions")
      .withIndex("by_clerk_user_id", (q) =>
        q.eq("clerkUserId", args.clerkUserId)
      )
      .filter((q) =>
        q.eq(q.field("stripeSubscriptionId"), args.stripeSubscriptionId)
      )
      .order("desc")
      .first(); // Latest record only

    if (existing) {
      await ctx.db.patch(existing._id, {
        status: args.status,
        currentPeriodEnd: args.currentPeriodEnd,
        cancelAtPeriodEnd: args.cancelAtPeriodEnd,
        planType: args.planType
      });
    } else {
      await ctx.db.insert("subscriptions", {
        clerkUserId: args.clerkUserId,
        userId: user._id,
        stripeSubscriptionId: args.stripeSubscriptionId,
        stripeCustomerId: args.stripeCustomerId,
        status: args.status,
        priceId: args.priceId,
        planType: args.planType,
        currentPeriodStart: args.currentPeriodStart,
        currentPeriodEnd: args.currentPeriodEnd,
        cancelAtPeriodEnd: args.cancelAtPeriodEnd,
        created: Math.floor(Date.now() / 1000)
      });
    }

    return { success: true };
  }
});

// Helper: Map package key to plan type
function mapPackageToPlan(
  packageKey: string
): "sandbox" | "clientProject" | "basic" | "pro" {
  const map: Record<string, "sandbox" | "clientProject" | "basic" | "pro"> = {
    // Free plans
    free: "sandbox",
    "analyzing-trends": "sandbox",
    "sandbox-summer": "sandbox",
    "sandbox-workshop": "sandbox",
    "gpts-classroom": "sandbox",
    "substack-gpt": "sandbox",
    "speaker-gpt": "sandbox",

    // Paid plans
    "sandbox-level": "sandbox",
    "client-project": "clientProject",
    basic: "basic",
    pro: "pro"
  };

  const planType = map[packageKey];
  if (!planType) {
    throw new Error(
      `Unknown package key: "${packageKey}". Valid keys are: ` +
        `free, analyzing-trends, sandbox-summer, sandbox-workshop, gpts-classroom, substack-gpt, ` +
        `speaker-gpt, sandbox-level, client-project, basic, pro`
    );
  }

  return planType;
}

export const cancelSubscriptionAtPeriodEnd = mutation({
  args: {
    stripeSubscriptionId: v.string()
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // Find user
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) throw new Error("User not found");

    // Verify this subscription belongs to the user
    if (user.subscription?.stripeSubscriptionId !== args.stripeSubscriptionId) {
      throw new Error("Unauthorized: This subscription does not belong to you");
    }

    // Update user's subscription
    await ctx.db.patch(user._id, {
      subscription: {
        ...user.subscription,
        cancelAtPeriodEnd: true
      },
      updatedAt: Date.now()
    });

    // Update subscriptions table
    const subscription = await ctx.db
      .query("subscriptions")
      .withIndex("by_clerk_user_id", (q) =>
        q.eq("clerkUserId", identity.subject)
      )
      .filter((q) =>
        q.eq(q.field("stripeSubscriptionId"), args.stripeSubscriptionId)
      )
      .unique();

    if (subscription) {
      await ctx.db.patch(subscription._id, {
        cancelAtPeriodEnd: true
      });
    }

    return { success: true };
  }
});

export const reactivateSubscription = mutation({
  args: {
    stripeSubscriptionId: v.string()
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) throw new Error("User not found");

    if (user.subscription?.stripeSubscriptionId !== args.stripeSubscriptionId) {
      throw new Error("Unauthorized");
    }

    await ctx.db.patch(user._id, {
      subscription: {
        ...user.subscription,
        cancelAtPeriodEnd: false
      },
      updatedAt: Date.now()
    });

    const subscription = await ctx.db
      .query("subscriptions")
      .withIndex("by_clerk_user_id", (q) =>
        q.eq("clerkUserId", identity.subject)
      )
      .filter((q) =>
        q.eq(q.field("stripeSubscriptionId"), args.stripeSubscriptionId)
      )
      .unique();

    if (subscription) {
      await ctx.db.patch(subscription._id, {
        cancelAtPeriodEnd: false
      });
    }

    return { success: true };
  }
});

// Query to check for active subscriptions (to prevent multiple subscriptions)
export const hasActiveSubscription = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return false;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user || !user.subscription) return false;

    const activeStatuses = ["active", "trialing", "past_due"];
    return activeStatuses.includes(user.subscription.status);
  }
});

// ✅ NEW QUERY: Get subscription health/status
export const getSubscriptionHealth = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return {
        isActive: false,
        status: "no-subscription" as const,
        daysUntilExpiration: null,
        isInGracePeriod: false,
        isTrialing: false,
        messageKey: "no_subscription"
      };
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user || !user.subscription) {
      return {
        isActive: false,
        status: "no-subscription" as const,
        daysUntilExpiration: null,
        isInGracePeriod: false,
        isTrialing: false,
        messageKey: "no_subscription"
      };
    }

    const sub = user.subscription;
    const now = Date.now();

    // ✅ Check if in grace period (past_due with grace period end in future)
    const isInGracePeriod =
      sub.status === "past_due" &&
      sub.paymentFailureGracePeriodEnd &&
      sub.paymentFailureGracePeriodEnd > now;

    // ✅ Check if actively subscription (allowing grace period access)
    const isActive =
      sub.status === "active" || sub.status === "trialing" || isInGracePeriod;

    // ✅ Calculate days until expiration (period end or grace period end)
    const expirationTime = isInGracePeriod
      ? sub.paymentFailureGracePeriodEnd
      : sub.status === "canceled"
        ? now // Already expired
        : sub.currentPeriodEnd || now;

    const daysUntilExpiration = Math.ceil(
      (expirationTime - now) / (1000 * 60 * 60 * 24)
    );

    // ✅ Determine status message key for frontend
    let statusKey: string;
    if (sub.status === "canceled") {
      statusKey = "canceled";
    } else if (sub.status === "trialing") {
      statusKey = "trialing";
    } else if (isInGracePeriod) {
      statusKey = "grace_period";
    } else if (sub.status === "past_due") {
      statusKey = "past_due";
    } else if (sub.cancelAtPeriodEnd) {
      statusKey = "expires_soon";
    } else if (sub.status === "active") {
      statusKey = "active";
    } else {
      statusKey = sub.status; // incomplete, unpaid, paused, etc.
    }

    return {
      isActive,
      status: statusKey,
      daysUntilExpiration: isActive ? daysUntilExpiration : null,
      isInGracePeriod,
      isTrialing: sub.status === "trialing",
      messageKey: statusKey,
      plan: sub.plan,
      currentPeriodEnd: sub.currentPeriodEnd,
      trialEndDate: sub.trialEndDate,
      gracePeriodEndDate: sub.paymentFailureGracePeriodEnd,
      cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
      lastPaymentFailedAt: sub.lastPaymentFailedAt
    };
  }
});
