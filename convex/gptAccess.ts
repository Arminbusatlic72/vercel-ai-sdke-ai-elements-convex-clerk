// convex/gptAccess.ts

import { v } from "convex/values";
import { query } from "./_generated/server";
import { Doc } from "./_generated/dataModel";
import { isEntitled } from "./lib/subscriptionUtils";

async function getActiveSubscriptionsForUser(ctx: any, userId: any) {
  const rows = await ctx.db
    .query("subscriptions")
    .withIndex("by_user_id", (q: any) => q.eq("userId", userId))
    .collect();

  return rows.filter((row: any) => isEntitled(row));
}

async function getMergedGptIdsForUser(ctx: any, user: any): Promise<string[]> {
  const activeSubs = await getActiveSubscriptionsForUser(ctx, user._id);
  const merged = new Set<string>();

  for (const sub of activeSubs) {
    for (const gptId of sub.gptIds || []) {
      merged.add(gptId);
    }
  }

  return Array.from(merged);
}

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

    const activeSubs = await getActiveSubscriptionsForUser(ctx, user._id);
    if (activeSubs.length === 0) {
      return {
        gpts: [],
        subscription: null,
        hasAccess: false,
        reason: "No subscription found"
      };
    }

    const mergedGptIds = await getMergedGptIdsForUser(ctx, user);
    const availableGpts = (
      await Promise.all(
        mergedGptIds.map((gptId) =>
          ctx.db
            .query("gpts")
            .withIndex("by_gptId", (q: any) => q.eq("gptId", gptId))
            .first()
        )
      )
    ).filter(Boolean);

    const topSub = activeSubs.sort(
      (a: any, b: any) =>
        (b.created ?? b._creationTime) - (a.created ?? a._creationTime)
    )[0];

    return {
      gpts: availableGpts,
      subscription: {
        status: topSub.status,
        plan: topSub.planType,
        maxGpts: topSub.maxGpts,
        currentGptsCount: availableGpts.length,
        currentPeriodEnd: topSub.currentPeriodEnd,
        packageName: topSub.productName
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

    // 1.5 Get GPT
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

    // Admins can access all GPTs
    if (user?.role === "admin") {
      return {
        hasAccess: true,
        reason: null,
        gpt
      };
    }

    if (!user) {
      return {
        hasAccess: false,
        reason: "No active subscription"
      };
    }

    const mergedGptIds = await getMergedGptIdsForUser(ctx, user);
    if (!mergedGptIds.includes(args.gptId)) {
      return {
        hasAccess: false,
        reason: "GPT not included in your active subscriptions"
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

    if (!user) {
      return null;
    }

    const activeSubs = await getActiveSubscriptionsForUser(ctx, user._id);
    if (activeSubs.length === 0) return null;

    const primary = activeSubs.sort(
      (a: any, b: any) =>
        (b.created ?? b._creationTime) - (a.created ?? a._creationTime)
    )[0];

    return {
      status: primary.status,
      plan: primary.planType,
      packageName: primary.productName || "Unknown",
      maxGpts: primary.maxGpts,
      currentPeriodEnd: primary.currentPeriodEnd,
      cancelAtPeriodEnd: primary.cancelAtPeriodEnd,
      isActive: true,
      activeSubscriptionCount: activeSubs.length,
      daysRemaining: primary.currentPeriodEnd
        ? Math.ceil(
            (primary.currentPeriodEnd - Date.now()) / (1000 * 60 * 60 * 24)
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

    const mergedGptIds = await getMergedGptIdsForUser(ctx, user);
    if (mergedGptIds.length === 0) return [];

    const gpts = (
      await Promise.all(
        mergedGptIds.map((gptId) =>
          ctx.db
            .query("gpts")
            .withIndex("by_gptId", (q: any) => q.eq("gptId", gptId))
            .first()
        )
      )
    ).filter(Boolean);

    return gpts;
  }
});
