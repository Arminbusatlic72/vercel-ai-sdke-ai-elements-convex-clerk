// convex/users.ts
import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";

export const getCurrentUser = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .first();

    return user;
  }
});

// Internal mutation that can be called by queries

export const getUserSubscription = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) return null;

    const subscription = user.subscription;
    const now = Date.now();

    const isActive =
      user.role === "admin" ||
      (subscription &&
        ["active", "trialing", "incomplete"].includes(subscription.status) &&
        (!subscription.currentPeriodEnd ||
          subscription.currentPeriodEnd > now));

    // Get package name from packages table using stripePriceId
    let packageName = subscription?.plan ?? "none";
    if (subscription?.priceId) {
      const pkg = await ctx.db
        .query("packages")
        .withIndex("by_stripePriceId", (q) =>
          q.eq("stripePriceId", subscription.priceId)
        )
        .first();

      if (pkg) {
        packageName = pkg.name;
      }
    }

    return {
      role: user.role,
      subscription: subscription || null,
      aiCredits: user.aiCredits ?? 0,
      aiCreditsResetAt: user.aiCreditsResetAt,
      canCreateProject: isActive,
      plan: subscription?.plan ?? "none",
      planLabel: packageName,
      stripeCustomerId: user.stripeCustomerId
    };
  }
});

// Get user by Stripe subscription ID
export const getByStripeSubscriptionId = query({
  args: { stripeSubscriptionId: v.string() },
  handler: async (ctx, args) => {
    const users = await ctx.db
      .query("users")
      .filter((q) =>
        q.eq(
          q.field("subscription.stripeSubscriptionId"),
          args.stripeSubscriptionId
        )
      )
      .collect();
    return users.length > 0 ? users[0] : null;
  }
});

// --- MUTATIONS ---

/**
 * Syncs user from Clerk to Convex.
 * Called on every login/app load to ensure DB is current.
 * Also claims any pending subscriptions from external Stripe purchases.
 */
export const syncCurrentUser = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .first();

    // Determine role from Clerk metadata or existing user
    const clerkRole = (identity.publicMetadata as { role?: string })?.role;
    const role =
      existingUser?.role ?? (clerkRole === "admin" ? "admin" : "user");

    const userData = {
      email: identity.email ?? existingUser?.email ?? "",
      name: identity.name ?? existingUser?.name ?? "Anonymous",
      imageUrl:
        typeof identity.picture === "string"
          ? identity.picture
          : existingUser?.imageUrl,
      role: role as "admin" | "user",
      updatedAt: Date.now()
    };

    if (existingUser) {
      await ctx.db.patch(existingUser._id, userData);
      const user = await ctx.db.get(existingUser._id);

      // Check for pending subscription (external purchase) and claim if found
      if (userData.email) {
        await claimPendingSubscription(ctx, identity.subject, userData.email);
      }

      return user;
    }

    // Create new user with default values
    const userId = await ctx.db.insert("users", {
      clerkId: identity.subject,
      ...userData,
      stripeCustomerId: undefined,
      subscription: undefined,
      aiCredits: 10, // Starter credits for new users
      aiCreditsResetAt: undefined,
      createdAt: Date.now()
    });

    const user = await ctx.db.get(userId);

    // Check for pending subscription from Squarespace purchase and claim it
    if (userData.email) {
      await claimPendingSubscription(ctx, identity.subject, userData.email);
    }

    return user;
  }
});

// Helper: Claim pending subscription by email
async function claimPendingSubscription(
  ctx: any,
  clerkUserId: string,
  email: string
) {
  try {
    const pending = await ctx.db
      .query("pendingSubscriptions")
      .withIndex("by_email", (q: any) => q.eq("email", email))
      .first();

    if (!pending) return; // No pending subscription

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q: any) => q.eq("clerkId", clerkUserId))
      .first();

    if (!user) return;

    // Map price to plan type
    const planType = mapPriceToPlanType(pending.priceId || "");
    const maxGpts = mapPlanToMaxGpts(planType);

    // Attach subscription to user
    await ctx.db.patch(user._id, {
      stripeCustomerId: pending.stripeCustomerId || user.stripeCustomerId,
      subscription: {
        status: (pending.status || "active") as any,
        stripeSubscriptionId: pending.stripeSubscriptionId,
        plan: planType,
        priceId: pending.priceId || "",
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

    console.log(`✅ Claimed pending subscription for ${email}`);
  } catch (e) {
    console.warn(`Could not claim pending subscription for ${email}:`, e);
  }
}

// Helper: Map price ID to plan type
function mapPriceToPlanType(
  priceId: string
): "sandbox" | "clientProject" | "basic" | "pro" {
  if (!priceId) return "sandbox";
  if (priceId === process.env.STRIPE_PRICE_CLIENT_PROJECT_GPT_MONTHLY)
    return "clientProject";
  if (priceId === process.env.STRIPE_PRICE_BASIC_ID) return "basic";
  if (priceId === process.env.STRIPE_PRICE_PRO_ID) return "pro";
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

/**
 * Update user subscription (for use with Stripe webhooks)
 */
export const updateSubscription = mutation({
  args: {
    clerkId: v.string(), // Use clerkId for webhook compatibility
    userId: v.optional(v.id("users")), // Optional userId for direct updates
    stripeCustomerId: v.string(),
    subscription: v.object({
      status: v.union(
        v.literal("active"),
        v.literal("canceled"),
        v.literal("past_due"),
        v.literal("trialing"),
        v.literal("incomplete"),
        v.literal("incomplete_expired"),
        v.literal("unpaid")
      ),
      stripeSubscriptionId: v.string(),
      plan: v.union(
        v.literal("basic"),
        v.literal("pro"),
        v.literal("sandbox"),
        v.literal("clientProject")
      ),
      priceId: v.string(),
      productName: v.optional(v.string()),
      currentPeriodEnd: v.number(),
      cancelAtPeriodEnd: v.optional(v.boolean()),
      maxGpts: v.number(),
      gptIds: v.array(v.string())
    }),
    aiCredits: v.optional(v.number())
  },
  handler: async (ctx, args) => {
    // Use provided userId or look up by clerkId
    let user;
    if (args.userId) {
      user = await ctx.db.get(args.userId);
    } else {
      user = await ctx.db
        .query("users")
        .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
        .first();
    }

    if (!user) {
      throw new Error(`User with clerkId ${args.clerkId} not found`);
    }

    const patchData: any = {
      stripeCustomerId: args.stripeCustomerId,
      subscription: args.subscription,
      updatedAt: Date.now()
    };

    if (args.aiCredits !== undefined) {
      patchData.aiCredits = args.aiCredits;
    }

    await ctx.db.patch(user._id, patchData);

    // Create subscription history record
    await ctx.db.insert("subscriptions", {
      clerkUserId: args.clerkId,
      userId: user._id,
      stripeSubscriptionId: args.subscription.stripeSubscriptionId,
      stripeCustomerId: args.stripeCustomerId,
      status: args.subscription.status,
      priceId: args.subscription.priceId,
      planType: args.subscription.plan,
      currentPeriodStart: Date.now(),
      currentPeriodEnd: args.subscription.currentPeriodEnd,
      cancelAtPeriodEnd: args.subscription.cancelAtPeriodEnd || false,
      created: Date.now(),
      canceledAt:
        args.subscription.status === "canceled" ? Date.now() : undefined
    });

    return { success: true };
  }
});

/**
 * Save Stripe customer ID to user record immediately
 * Called during subscription creation to enable webhook lookups
 */
export const saveStripeCustomerId = mutation({
  args: {
    clerkId: v.string(),
    stripeCustomerId: v.string()
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (!user) {
      throw new Error(`User with clerkId ${args.clerkId} not found`);
    }

    await ctx.db.patch(user._id, {
      stripeCustomerId: args.stripeCustomerId,
      updatedAt: Date.now()
    });

    console.log(
      `✅ Saved stripeCustomerId ${args.stripeCustomerId} for user ${args.clerkId}`
    );
    return { success: true };
  }
});

/**
 * Internal version for Stripe webhook handling
 */
export const updateSubscriptionInternal = internalMutation({
  args: {
    clerkId: v.string(),
    stripeCustomerId: v.string(),
    subscription: v.object({
      status: v.union(
        v.literal("active"),
        v.literal("canceled"),
        v.literal("past_due"),
        v.literal("trialing"),
        v.literal("incomplete"),
        v.literal("incomplete_expired"),
        v.literal("unpaid")
      ),
      stripeSubscriptionId: v.string(),
      plan: v.union(
        v.literal("basic"),
        v.literal("pro"),
        v.literal("sandbox"),
        v.literal("clientProject")
      ),
      priceId: v.string(),
      currentPeriodEnd: v.number(),
      cancelAtPeriodEnd: v.optional(v.boolean()),
      maxGpts: v.number(),
      gptIds: v.array(v.string())
    }),
    aiCredits: v.optional(v.number())
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (!user) {
      console.error(`User with clerkId ${args.clerkId} not found`);
      return { success: false, error: "User not found" };
    }

    const patchData: any = {
      stripeCustomerId: args.stripeCustomerId,
      subscription: args.subscription,
      updatedAt: Date.now()
    };

    if (args.aiCredits !== undefined) {
      patchData.aiCredits = args.aiCredits;
    }

    await ctx.db.patch(user._id, patchData);

    // Create subscription history record
    await ctx.db.insert("subscriptions", {
      clerkUserId: args.clerkId,
      userId: user._id,
      stripeSubscriptionId: args.subscription.stripeSubscriptionId,
      stripeCustomerId: args.stripeCustomerId,
      status: args.subscription.status,
      priceId: args.subscription.priceId,
      planType: args.subscription.plan,
      currentPeriodStart: Date.now(),
      currentPeriodEnd: args.subscription.currentPeriodEnd,
      cancelAtPeriodEnd: args.subscription.cancelAtPeriodEnd || false,
      created: Date.now(),
      canceledAt:
        args.subscription.status === "canceled" ? Date.now() : undefined
    });

    return { success: true };
  }
});

/**
 * Update subscription by Stripe subscription ID (for webhooks)
 */
// In convex/users.ts - update the updateSubscriptionByStripeId mutation
export const updateSubscriptionByStripeId = internalMutation({
  args: {
    stripeSubscriptionId: v.string(),
    status: v.union(
      v.literal("active"),
      v.literal("canceled"),
      v.literal("past_due"),
      v.literal("trialing"),
      v.literal("incomplete"),
      v.literal("incomplete_expired"),
      v.literal("unpaid")
    ),
    currentPeriodEnd: v.optional(v.number()),
    cancelAtPeriodEnd: v.optional(v.boolean()),
    plan: v.optional(
      v.union(
        v.literal("basic"),
        v.literal("pro"),
        v.literal("sandbox"),
        v.literal("clientProject")
      )
    )
  },
  handler: async (ctx, args) => {
    // Find user by stripe subscription ID
    const users = await ctx.db
      .query("users")
      .filter((q) =>
        q.eq(
          q.field("subscription.stripeSubscriptionId"),
          args.stripeSubscriptionId
        )
      )
      .collect();

    if (users.length === 0) {
      console.error(
        `User with stripeSubscriptionId ${args.stripeSubscriptionId} not found`
      );
      return { success: false, error: "User not found" };
    }

    const user = users[0];

    if (!user.subscription) {
      console.error(`User ${user._id} has no subscription to update`);
      return { success: false, error: "No subscription found" };
    }

    // Ensure currentPeriodEnd is always a number, not undefined
    const currentPeriodEnd =
      args.currentPeriodEnd !== undefined
        ? args.currentPeriodEnd
        : user.subscription.currentPeriodEnd !== undefined
          ? user.subscription.currentPeriodEnd
          : Date.now() + 30 * 24 * 60 * 60 * 1000; // Default: 30 days from now

    const updatedSubscription = {
      ...user.subscription,
      status: args.status,
      currentPeriodEnd, // Now guaranteed to be a number
      cancelAtPeriodEnd:
        args.cancelAtPeriodEnd !== undefined
          ? args.cancelAtPeriodEnd
          : user.subscription.cancelAtPeriodEnd,
      plan: args.plan || user.subscription.plan
    };

    await ctx.db.patch(user._id, {
      subscription: updatedSubscription,
      updatedAt: Date.now()
    });

    // Update subscription history - currentPeriodEnd is now guaranteed to be a number
    await ctx.db.insert("subscriptions", {
      clerkUserId: user.clerkId,
      userId: user._id,
      stripeSubscriptionId: args.stripeSubscriptionId,
      stripeCustomerId: user.stripeCustomerId || "", // Provide default if undefined
      status: args.status,
      priceId: user.subscription.priceId,
      planType: updatedSubscription.plan,
      currentPeriodStart: Date.now(),
      currentPeriodEnd: currentPeriodEnd, // This is now a number
      cancelAtPeriodEnd: updatedSubscription.cancelAtPeriodEnd || false,
      created: Date.now(),
      canceledAt: args.status === "canceled" ? Date.now() : undefined
    });

    return { success: true };
  }
});

/**
 * Set Stripe customer ID for a user
 */
// export const setStripeCustomerId = mutation({
//   args: {
//     stripeCustomerId: v.string()
//   },
//   handler: async (ctx, args) => {
//     const identity = await ctx.auth.getUserIdentity();
//     if (!identity) throw new Error("Not authenticated");

//     const user = await ctx.db
//       .query("users")
//       .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
//       .first();

//     if (!user) throw new Error("User not found");

//     await ctx.db.patch(user._id, {
//       stripeCustomerId: args.stripeCustomerId,
//       updatedAt: Date.now()
//     });

//     return { success: true };
//   }
// });

export const setStripeCustomerId = internalMutation({
  args: {
    clerkId: v.string(),
    stripeCustomerId: v.string()
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (!user) throw new Error("User not found");

    await ctx.db.patch(user._id, {
      stripeCustomerId: args.stripeCustomerId,
      updatedAt: Date.now()
    });

    return { success: true };
  }
});
/**
 * AI Credit Manager
 * Decrements credits based on usage.
 */
export const updateAICredits = mutation({
  args: { creditsUsed: v.number() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) throw new Error("User not found");

    // Admins have infinite credits
    if (user.role === "admin") {
      return { success: true, remaining: Infinity };
    }

    // Check if user has subscription
    if (!user.subscription || user.subscription.status !== "active") {
      throw new Error("No active subscription");
    }

    if ((user.aiCredits || 0) < args.creditsUsed) {
      throw new Error("Insufficient AI credits");
    }

    const newCredits = Math.max(0, (user.aiCredits || 0) - args.creditsUsed);
    await ctx.db.patch(user._id, {
      aiCredits: newCredits,
      updatedAt: Date.now()
    });

    return { success: true, remaining: newCredits };
  }
});

/**
 * Add AI credits to user
 */
export const addAICredits = mutation({
  args: {
    clerkId: v.string(),
    credits: v.number()
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (!user) throw new Error("User not found");

    const currentCredits = user.aiCredits || 0;
    const newCredits = currentCredits + args.credits;

    await ctx.db.patch(user._id, {
      aiCredits: newCredits,
      updatedAt: Date.now()
    });

    return { success: true, newCredits };
  }
});

// --- CRON / INTERNAL ---

/**
 * Reset monthly credits for active subscribers
 */
export const resetMonthlyCredits = internalMutation({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    let resetCount = 0;

    for (const user of users) {
      // Only reset for active subscribers
      if (user.subscription?.status === "active") {
        const shouldReset =
          !user.aiCreditsResetAt || user.aiCreditsResetAt <= Date.now();

        if (shouldReset) {
          // Set credits based on plan
          const newCredits = user.subscription.plan === "pro" ? 10000 : 1000;

          await ctx.db.patch(user._id, {
            aiCredits: newCredits,
            aiCreditsResetAt: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
            updatedAt: Date.now()
          });
          resetCount++;
        }
      }
    }
    return { resetCount };
  }
});

/**
 * Update user role (admin only)
 */
export const updateUserRole = mutation({
  args: {
    clerkId: v.string(),
    role: v.union(v.literal("admin"), v.literal("user"))
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // Check if current user is admin
    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!currentUser || currentUser.role !== "admin") {
      throw new Error("Admin access required");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (!user) throw new Error("User not found");

    await ctx.db.patch(user._id, {
      role: args.role,
      updatedAt: Date.now()
    });

    return { success: true };
  }
});

/**
 * Get user subscription history
 */
export const getSubscriptionHistory = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) return [];

    const subscriptions = await ctx.db
      .query("subscriptions")
      .withIndex("by_user_id", (q) => q.eq("userId", user._id))
      .order("desc")
      .collect();

    return subscriptions;
  }
});

// Mutation to update user's Stripe customer ID
export const updateUserStripeCustomerId = mutation({
  args: {
    userId: v.id("users"),
    stripeCustomerId: v.string()
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, {
      stripeCustomerId: args.stripeCustomerId
    });
  }
});

export const updateUserSubscription = mutation({
  args: {
    clerkId: v.string(),
    subscriptionData: v.object({
      stripeSubscriptionId: v.string(),
      status: v.union(
        v.literal("active"),
        v.literal("canceled"),
        v.literal("past_due"),
        v.literal("trialing"),
        v.literal("incomplete"),
        v.literal("incomplete_expired"),
        v.literal("unpaid")
      ),
      plan: v.union(
        v.literal("sandbox"),
        v.literal("clientProject"),
        v.literal("basic"),
        v.literal("pro")
      ),
      priceId: v.string(),
      currentPeriodEnd: v.number(),
      cancelAtPeriodEnd: v.boolean(),
      maxGpts: v.number(),
      gptIds: v.array(v.string())
    })
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    await ctx.db.patch(user._id, {
      subscription: args.subscriptionData,
      updatedAt: Date.now()
    });

    return { success: true };
  }
});

// convex/users.ts
// export const updateStripeCustomerId = mutation({
//   args: {
//     clerkId: v.string(),
//     stripeCustomerId: v.string()
//   },
//   handler: async (ctx, args) => {
//     const user = await ctx.db
//       .query("users")
//       .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
//       .first();

//     if (!user) {
//       throw new Error("User not found");
//     }

//     await ctx.db.patch(user._id, {
//       stripeCustomerId: args.stripeCustomerId,
//       updatedAt: Date.now()
//     });

//     return { success: true };
//   }
// });

/**
 * Get user by Stripe Customer ID (for webhooks)
 */
export const getUserByStripeCustomerId = query({
  args: {
    stripeCustomerId: v.string()
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("stripeCustomerId"), args.stripeCustomerId))
      .unique();
  }
});

// Get user by email (used for external Stripe purchases mapping)
export const getUserByEmail = query({
  args: {
    email: v.string()
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();
  }
});

/**
 * Get or create user from Stripe webhook
 * This is critical for handling the race condition where webhooks fire
 * before the user has synced via syncCurrentUser.
 *
 * Called by Stripe webhook handlers to ensure user exists.
 */
export const getOrCreateUserFromWebhook = mutation({
  args: {
    clerkId: v.string(),
    email: v.optional(v.string()),
    name: v.optional(v.string()),
    imageUrl: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    // Try to find existing user
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (existingUser) {
      return existingUser;
    }

    // User doesn't exist yet - create with minimal info from webhook
    console.warn(
      `⚠️ User not found for clerkId: ${args.clerkId}. Creating from webhook data.`
    );

    const userId = await ctx.db.insert("users", {
      clerkId: args.clerkId,
      email: args.email || "unknown@example.com",
      name: args.name || "User",
      imageUrl: args.imageUrl,
      role: "user", // Default role
      stripeCustomerId: undefined, // Will be set later by webhook
      subscription: undefined,
      aiCredits: 10, // Starter credits
      aiCreditsResetAt: undefined,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });

    const newUser = await ctx.db.get(userId);
    console.log(`✅ Created user from webhook: ${args.clerkId}`);
    return newUser;
  }
});

/**
 * Get user by Clerk ID (you probably already have this)
 */
export const getUserByClerkId = query({
  args: {
    clerkId: v.string()
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .unique();
  }
});

/**
 * Create user with Stripe customer ID
 */
export const createUser = mutation({
  args: {
    clerkId: v.string(),
    email: v.string(),
    name: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    stripeCustomerId: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .unique();

    if (existingUser) {
      // Update with stripe customer ID if provided
      if (args.stripeCustomerId && !existingUser.stripeCustomerId) {
        await ctx.db.patch(existingUser._id, {
          stripeCustomerId: args.stripeCustomerId,
          updatedAt: Date.now()
        });
      }
      return existingUser._id;
    }

    return await ctx.db.insert("users", {
      clerkId: args.clerkId,
      email: args.email,
      name: args.name,
      imageUrl: args.imageUrl,
      role: "user",
      stripeCustomerId: args.stripeCustomerId,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
  }
});

/**
 * Update user's Stripe customer ID
 */
export const updateStripeCustomerId = mutation({
  args: {
    clerkId: v.string(),
    stripeCustomerId: v.string()
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .unique();

    if (!user) {
      throw new Error(`User not found: ${args.clerkId}`);
    }

    await ctx.db.patch(user._id, {
      stripeCustomerId: args.stripeCustomerId,
      updatedAt: Date.now()
    });

    return user._id;
  }
});

export const getByStripeCustomerId = query({
  args: { stripeCustomerId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_stripeCustomerId", (q) =>
        q.eq("stripeCustomerId", args.stripeCustomerId)
      )
      .collect();
  }
});
