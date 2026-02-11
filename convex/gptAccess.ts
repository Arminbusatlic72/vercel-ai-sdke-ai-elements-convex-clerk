// convex/gptAccess.ts

import { v } from "convex/values";
import { query } from "./_generated/server";
import { Doc } from "./_generated/dataModel";

/**
 * HELPER: Find package by subscription (tries productId first, then priceId)
 * Used by createChat and other mutations for consistency
 * Returns the package doc or null if no match found
 */
export async function findPackageBySubscription(
  ctx: any,
  productId?: string,
  priceId?: string
): Promise<Doc<"packages"> | null> {
  // Try productId first (preferred, more stable)
  if (productId) {
    const pkg = await ctx.db
      .query("packages")
      .withIndex("by_stripeProductId", (q: any) =>
        q.eq("stripeProductId", productId)
      )
      .unique();
    if (pkg) return pkg;
  }

  // Fall back to priceId for backward compatibility (older subscriptions)
  if (priceId) {
    const pkg = await ctx.db
      .query("packages")
      .withIndex("by_stripePriceId", (q: any) => q.eq("stripePriceId", priceId))
      .unique();
    if (pkg) return pkg;
  }

  return null;
}

/**
 * Get all GPTs available to a user based on their subscription
 */
export const getAvailableGptsForUser = query({
  args: {
    clerkUserId: v.string()
  },
  handler: async (ctx, args) => {
    // 1. Get user and their subscription
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkUserId))
      .unique();

    if (!user) {
      return {
        gpts: [],
        subscription: null,
        hasAccess: false,
        reason: "User not found"
      };
    }

    // 2. Check if user has active subscription
    if (!user.subscription) {
      return {
        gpts: [],
        subscription: null,
        hasAccess: false,
        reason: "No subscription found"
      };
    }

    const subscription = user.subscription;

    // 3. Validate subscription status and period
    const isStatusActive =
      subscription.status === "active" || subscription.status === "trialing";

    const isWithinPeriod =
      !subscription.currentPeriodEnd ||
      subscription.currentPeriodEnd * 1000 > Date.now();

    if (!isStatusActive || !isWithinPeriod) {
      return {
        gpts: [],
        subscription: {
          status: subscription.status,
          plan: subscription.plan,
          maxGpts: subscription.maxGpts,
          currentPeriodEnd: subscription.currentPeriodEnd
        },
        hasAccess: false,
        reason: `Subscription ${subscription.status}${!isWithinPeriod ? " and expired" : ""}`
      };
    }

    // 4. Get package details to find which GPTs are included
    let packageData;
    if (subscription.productId) {
      packageData = await ctx.db
        .query("packages")
        .withIndex("by_stripeProductId", (q) =>
          q.eq("stripeProductId", subscription.productId as string)
        )
        .unique();
    } else if (subscription.priceId) {
      packageData = await ctx.db
        .query("packages")
        .withIndex("by_stripePriceId", (q) =>
          q.eq("stripePriceId", subscription.priceId as string)
        )
        .unique();
    } else {
      packageData = null;
    }

    if (!packageData) {
      return {
        gpts: [],
        subscription: {
          status: subscription.status,
          plan: subscription.plan,
          maxGpts: subscription.maxGpts,
          currentPeriodEnd: subscription.currentPeriodEnd
        },
        hasAccess: false,
        reason: "Package not found"
      };
    }

    // 5. Get GPTs associated with this package
    const gpts = await ctx.db
      .query("gpts")
      .withIndex("by_packageId", (q) => q.eq("packageId", packageData._id))
      .collect();

    // 6. Check if user is within their GPT limit
    const availableGpts = gpts.slice(0, subscription.maxGpts);

    return {
      gpts: availableGpts,
      subscription: {
        status: subscription.status,
        plan: subscription.plan,
        maxGpts: subscription.maxGpts,
        currentGptsCount: availableGpts.length,
        currentPeriodEnd: subscription.currentPeriodEnd,
        packageName: packageData.name
      },
      hasAccess: true,
      reason: null
    };
  }
});

/**
 * Check if user has access to a specific GPT
 */
export const checkGptAccess = query({
  args: {
    clerkUserId: v.string(),
    gptId: v.string()
  },
  handler: async (ctx, args) => {
    // 1. Get user
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkUserId))
      .unique();

    if (!user?.subscription) {
      return {
        hasAccess: false,
        reason: "No active subscription"
      };
    }

    // 2. Check subscription validity
    const isStatusActive =
      user.subscription.status === "active" ||
      user.subscription.status === "trialing";

    const isWithinPeriod =
      !user.subscription.currentPeriodEnd ||
      user.subscription.currentPeriodEnd * 1000 > Date.now();

    if (!isStatusActive || !isWithinPeriod) {
      return {
        hasAccess: false,
        reason: "Subscription expired or inactive"
      };
    }

    // 3. Get the GPT
    const gpt = await ctx.db
      .query("gpts")
      .withIndex("by_gptId", (q) => q.eq("gptId", args.gptId))
      .unique();

    if (!gpt) {
      return {
        hasAccess: false,
        reason: "GPT not found"
      };
    }

    // 4. Get package and verify GPT belongs to user's package
    let packageData;
    if (user.subscription!.productId) {
      packageData = await ctx.db
        .query("packages")
        .withIndex("by_stripeProductId", (q) =>
          q.eq("stripeProductId", user.subscription!.productId as string)
        )
        .unique();
    } else if (user.subscription!.priceId) {
      packageData = await ctx.db
        .query("packages")
        .withIndex("by_stripePriceId", (q) =>
          q.eq("stripePriceId", user.subscription!.priceId as string)
        )
        .unique();
    } else {
      packageData = null;
    }

    if (!packageData) {
      return {
        hasAccess: false,
        reason: "Package not found"
      };
    }

    // Check if GPT belongs to this package
    if (gpt.packageId?.toString() !== packageData._id.toString()) {
      return {
        hasAccess: false,
        reason: "GPT not included in your subscription package"
      };
    }

    return {
      hasAccess: true,
      reason: null,
      gpt
    };
  }
});

/**
 * Get subscription summary for user dashboard
 */
export const getSubscriptionSummary = query({
  args: {
    clerkUserId: v.string()
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkUserId))
      .unique();

    if (!user?.subscription) {
      return null;
    }

    let packageData;
    if (user.subscription!.productId) {
      packageData = await ctx.db
        .query("packages")
        .withIndex("by_stripeProductId", (q) =>
          q.eq("stripeProductId", user.subscription!.productId as string)
        )
        .unique();
    } else if (user.subscription!.priceId) {
      packageData = await ctx.db
        .query("packages")
        .withIndex("by_stripePriceId", (q) =>
          q.eq("stripePriceId", user.subscription!.priceId as string)
        )
        .unique();
    } else {
      packageData = null;
    }

    const isActive =
      (user.subscription.status === "active" ||
        user.subscription.status === "trialing") &&
      (!user.subscription.currentPeriodEnd ||
        user.subscription.currentPeriodEnd * 1000 > Date.now());

    return {
      status: user.subscription.status,
      plan: user.subscription.plan,
      packageName: packageData?.name || "Unknown",
      maxGpts: user.subscription.maxGpts,
      currentPeriodEnd: user.subscription.currentPeriodEnd,
      cancelAtPeriodEnd: user.subscription.cancelAtPeriodEnd,
      isActive,
      daysRemaining: user.subscription.currentPeriodEnd
        ? Math.ceil(
            (user.subscription.currentPeriodEnd * 1000 - Date.now()) /
              (1000 * 60 * 60 * 24)
          )
        : null
    };
  }
});

/**
 * Return GPTs the current user is allowed to access.
 * - Admins get all GPTs
 * - Otherwise: must have active subscription, package matched by productId or priceId
 */
export const getUserAccessibleGpts = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) return [];

    // Admin sees everything
    if (user.role === "admin") {
      return await ctx.db.query("gpts").collect();
    }

    const subscription = user.subscription;
    if (!subscription) return [];

    if (subscription.status !== "active") return [];

    // Find package by productId first, then fallback to priceId
    let pkg = null as any;
    if (subscription.productId) {
      pkg = await ctx.db
        .query("packages")
        .withIndex("by_stripeProductId", (q) =>
          q.eq("stripeProductId", subscription.productId as string)
        )
        .unique();
    }

    if (!pkg && subscription.priceId) {
      pkg = await ctx.db
        .query("packages")
        .withIndex("by_stripePriceId", (q) =>
          q.eq("stripePriceId", subscription.priceId as string)
        )
        .unique();
    }

    if (!pkg) return [];

    return await ctx.db
      .query("gpts")
      .withIndex("by_packageId", (q) => q.eq("packageId", pkg._id))
      .collect();
  }
});
