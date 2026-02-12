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
 * Fetch pending subscription by email (called by Clerk webhook)
 */
export const getPendingSubscriptionByEmail = query({
  args: {
    email: v.string()
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("pendingSubscriptions")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();
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

// Helper: Map product ID to plan type (productId is stable, priceId changes)
function mapProductToPlanType(
  productId: string
): "sandbox" | "clientProject" | "basic" | "pro" {
  if (!productId) return "sandbox";

  const map: Record<string, "sandbox" | "clientProject" | "basic" | "pro"> = {
    // Free/Sandbox products
    [process.env.STRIPE_PRODUCT_CRISIS_SIMULATOR || ""]: "sandbox",
    [process.env.STRIPE_PRODUCT_CULTURE_MAPPING_TOOLKIT || ""]: "sandbox",
    [process.env.STRIPE_PRODUCT_DIAGNOSTIC_TOOLKIT || ""]: "sandbox",
    [process.env.STRIPE_PRODUCT_DIGITAL_FLANEUR_TOOLKIT || ""]: "sandbox",
    [process.env.STRIPE_PRODUCT_PACKAGING_ANALYSIS || ""]: "sandbox",
    [process.env.STRIPE_PRODUCT_REGIONAL_CODE_TOOLKIT || ""]: "sandbox",
    [process.env.STRIPE_PRODUCT_SPECULATIVE_FUTURES || ""]: "sandbox",
    [process.env.STRIPE_PRODUCT_SUBCULTURE_ANALYSIS || ""]: "sandbox",
    [process.env.STRIPE_PRODUCT_VISUALIZING_UNKNOWNS || ""]: "sandbox",
    [process.env.STRIPE_PRODUCT_LANGUAGE_MEANING_WORKSHOP || ""]: "sandbox",
    [process.env.STRIPE_PRODUCT_NARRATIVE_SYSTEMS || ""]: "sandbox",
    [process.env.STRIPE_PRODUCT_STRUCTURED_FORESIGHT || ""]: "sandbox",
    [process.env.STRIPE_PRODUCT_2026_TREND_THEME || ""]: "sandbox",
    [process.env.STRIPE_PRODUCT_ANALYZING_TRENDS || ""]: "sandbox",
    [process.env.STRIPE_PRODUCT_WORKSHOP_GPTS || ""]: "sandbox",
    [process.env.STRIPE_PRODUCT_RIKKYO_GPT || ""]: "sandbox",
    [process.env.STRIPE_PRODUCT_SUBSTACK_GPTS || ""]: "sandbox",
    [process.env.STRIPE_PRODUCT_SUMMER_SANDBOX || ""]: "sandbox",
    [process.env.STRIPE_PRODUCT_LINKEDIN_GPT || ""]: "sandbox",
    [process.env.STRIPE_PRODUCT_WORKSHOP_PRIMER || ""]: "sandbox",
    [process.env.STRIPE_PRODUCT_SPACE_ANALYSIS_TOOLKIT || ""]: "sandbox",
    // Paid products
    [process.env.STRIPE_PRODUCT_SDNA_CLIENT_PROJECT || ""]: "clientProject",
    [process.env.STRIPE_PRODUCT_BRAND_DECODER || ""]: "basic",
    [process.env.STRIPE_PRODUCT_CONTRARIAN_TOOLKIT || ""]: "basic",
    [process.env.STRIPE_PRODUCT_SDNA_STORYENGINE || ""]: "pro"
  };

  const planType = map[productId];
  if (!planType) {
    console.warn(
      `⚠️ Unknown product ID "${productId}". Defaulting to "sandbox". Make sure the product ID is configured in environment variables.`
    );
    return "sandbox";
  }

  return planType;
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
