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
    maxGpts: v.number()
  },
  handler: async (ctx, args) => {
    // 1️⃣ Find user by Clerk ID
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkUserId))
      .unique();

    if (!user) throw new Error(`User not found: ${args.clerkUserId}`);

    // 2️⃣ Update user's subscription nested field
    // Note: planType is already the correct plan type from webhook
    await ctx.db.patch(user._id, {
      stripeCustomerId: args.stripeCustomerId,
      subscription: {
        status: args.status,
        stripeSubscriptionId: args.stripeSubscriptionId,
        plan: args.planType, // Use the plan type directly
        priceId: args.priceId,
        currentPeriodEnd: args.currentPeriodEnd,
        cancelAtPeriodEnd: args.cancelAtPeriodEnd,
        maxGpts: args.maxGpts,
        gptIds: [] // Initialize empty, will be populated when user assigns GPTs
      },
      updatedAt: Date.now()
    });

    // 3️⃣ Also update or create in subscriptions table
    const existing = await ctx.db
      .query("subscriptions")
      .withIndex("by_clerk_user_id", (q) =>
        q.eq("clerkUserId", args.clerkUserId)
      )
      .filter((q) =>
        q.eq(q.field("stripeSubscriptionId"), args.stripeSubscriptionId)
      )
      .unique();

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
