import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Record a webhook event for idempotency tracking
 * Prevents processing the same Stripe event twice
 */
export const recordWebhookEvent = mutation({
  args: {
    stripeEventId: v.string(),
    eventType: v.string(),
    status: v.union(
      v.literal("success"),
      v.literal("failed"),
      v.literal("pending")
    )
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("webhookEvents")
      .withIndex("by_event_id", (q) =>
        q.eq("stripeEventId", args.stripeEventId)
      )
      .first();

    if (existing) {
      // Update existing record
      await ctx.db.patch(existing._id, {
        status: args.status,
        processedAt: Date.now()
      });
    } else {
      // Create new record
      await ctx.db.insert("webhookEvents", {
        stripeEventId: args.stripeEventId,
        eventType: args.eventType,
        status: args.status,
        processedAt: Date.now()
      });
    }

    return { success: true };
  }
});

/**
 * Check if a webhook event has already been processed
 */
export const getWebhookEvent = query({
  args: {
    stripeEventId: v.string()
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("webhookEvents")
      .withIndex("by_event_id", (q) =>
        q.eq("stripeEventId", args.stripeEventId)
      )
      .first();
  }
});

/**
 * Save pending subscription details keyed by email for external purchases
 * (e.g. Squarespace -> Stripe). Later a user sign-up flow can claim these.
 */
export const savePendingSubscriptionByEmail = mutation({
  args: {
    email: v.string(),
    stripeSubscriptionId: v.string(),
    stripeCustomerId: v.optional(v.string()),
    productId: v.optional(v.string()),
    priceId: v.optional(v.string()),
    status: v.optional(v.string()),
    currentPeriodEnd: v.optional(v.number())
  },
  handler: async (ctx, args) => {
    // Upsert a pending subscription record (idempotent by stripeSubscriptionId)
    const existing = await ctx.db
      .query("pendingSubscriptions")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .filter((q) =>
        q.eq(q.field("stripeSubscriptionId"), args.stripeSubscriptionId)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        stripeCustomerId: args.stripeCustomerId,
        productId: args.productId,
        priceId: args.priceId,
        status: args.status,
        currentPeriodEnd: args.currentPeriodEnd,
        createdAt: Date.now()
      });
      return { success: true, updated: true };
    }

    await ctx.db.insert("pendingSubscriptions", {
      email: args.email,
      stripeSubscriptionId: args.stripeSubscriptionId,
      stripeCustomerId: args.stripeCustomerId,
      productId: args.productId,
      priceId: args.priceId,
      status: args.status,
      currentPeriodEnd: args.currentPeriodEnd,
      createdAt: Date.now()
    });

    return { success: true, created: true };
  }
});

/**
 * Claim pending subscription: when user signs up with email,
 * attach any pending subscription from Squarespace purchase
 */
export const claimPendingSubscriptionByEmail = mutation({
  args: {
    clerkUserId: v.string(),
    email: v.string()
  },
  handler: async (ctx, args) => {
    // Find pending subscription for this email
    const pending = await ctx.db
      .query("pendingSubscriptions")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (!pending) {
      // No pending subscription, skip
      return { success: true, claimed: false };
    }

    // Get the user
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkUserId))
      .first();

    if (!user) {
      return { success: false, error: "User not found" };
    }

    // Map product to plan type
    const planType = mapProductToPlanType(pending.productId || "");
    const maxGpts = mapPlanToMaxGpts(planType);

    // Attach subscription to user
    await ctx.db.patch(user._id, {
      stripeCustomerId: pending.stripeCustomerId || user.stripeCustomerId,
      subscription: {
        status: (pending.status || "active") as any,
        stripeSubscriptionId: pending.stripeSubscriptionId,
        plan: planType,
        productId: pending.productId || "",
        priceId: pending.priceId, // Keep for reference
        currentPeriodStart: Date.now(),
        currentPeriodEnd:
          pending.currentPeriodEnd || Date.now() + 30 * 24 * 60 * 60 * 1000,
        cancelAtPeriodEnd: false,
        maxGpts,
        gptIds: []
      },
      updatedAt: Date.now()
    });

    // Delete pending subscription record
    await ctx.db.delete(pending._id);

    return { success: true, claimed: true };
  }
});

// Helper: Map product ID to plan type
function mapProductToPlanType(
  productId: string
): "sandbox" | "clientProject" | "basic" | "pro" {
  if (!productId) return "sandbox";
  if (productId === process.env.STRIPE_PRODUCT_SDNA_CLIENT_PROJECT)
    return "clientProject";
  if (productId === process.env.STRIPE_PRODUCT_BASIC_ID) return "basic";
  if (productId === process.env.STRIPE_PRODUCT_PRO_ID) return "pro";
  return "sandbox";
}

// Helper: Map plan to max GPTs
function mapPlanToMaxGpts(plan: string) {
  const map: Record<string, number> = {
    sandbox: 12,
    clientProject: 1,
    basic: 3,
    pro: 6
  };
  return map[plan] || 1;
}
