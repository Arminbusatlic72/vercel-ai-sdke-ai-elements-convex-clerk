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
