// // convex/users.ts
// import { v } from "convex/values";
// import { mutation, query, internalMutation } from "./_generated/server";

// // --- QUERIES ---

// export const getCurrentUser = query({
//   args: {},
//   handler: async (ctx) => {
//     const identity = await ctx.auth.getUserIdentity();
//     if (!identity) return null;

//     return await ctx.db
//       .query("users")
//       .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
//       .first();
//   }
// });

// export const getByClerkId = query({
//   args: { clerkId: v.string() },
//   handler: async (ctx, args) => {
//     return await ctx.db
//       .query("users")
//       .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
//       .first();
//   }
// });

// export const getByStripeCustomerId = query({
//   args: { stripeCustomerId: v.string() },
//   handler: async (ctx, args) => {
//     return await ctx.db
//       .query("users")
//       .filter((q) => q.eq(q.field("stripeCustomerId"), args.stripeCustomerId))
//       .collect();
//   }
// });

// export const getUserSubscription = query({
//   args: {},
//   handler: async (ctx) => {
//     const identity = await ctx.auth.getUserIdentity();
//     if (!identity) return null;

//     const user = await ctx.db
//       .query("users")
//       .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
//       .first();

//     if (!user) return null;

//     return {
//       subscription: user.subscription,
//       aiCredits: user.aiCredits || 0,
//       aiCreditsResetAt: user.aiCreditsResetAt,
//       canCreateProject:
//         user.role === "admin" || user.subscription?.status === "active",
//       plan: user.subscription?.plan,
//       role: user.role || "user"
//     };
//   }
// });

// // --- MUTATIONS ---

// /**
//  * Syncs user from Clerk to Convex.
//  * Called on every login/app load to ensure DB is current.
//  */
// // export const syncCurrentUser = mutation({
// //   args: {},
// //   handler: async (ctx) => {
// //     const identity = await ctx.auth.getUserIdentity();
// //     if (!identity) throw new Error("Not authenticated");

// //     const existingUser = await ctx.db
// //       .query("users")
// //       .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
// //       .first();

// //     const clerkRole =
// //       (identity.publicMetadata as { role?: string })?.role === "admin"
// //         ? "admin"
// //         : "user";
// //     const role = existingUser?.role ?? clerkRole;

// //     const userData = {
// //       email: identity.email ?? existingUser?.email ?? "",
// //       name: identity.name ?? existingUser?.name,
// //       imageUrl: identity.pictureUrl ?? existingUser?.imageUrl,
// //       role: role as "admin" | "user",
// //       updatedAt: Date.now()
// //     };

// //     if (existingUser) {
// //       await ctx.db.patch(existingUser._id, userData);
// //       // ✅ CHANGE THIS: Fetch and return the full updated user
// //       return await ctx.db.get(existingUser._id);
// //     }
// //     const newUserId = await ctx.db.insert("users", {
// //       clerkId: identity.subject,
// //       ...userData,
// //       aiCredits: 10, // Give them some starter credits
// //       createdAt: Date.now()
// //     });
// //     return await ctx.db.get(newUserId);
// //   }
// // });

// export const syncCurrentUser = mutation({
//   handler: async (ctx) => {
//     // Get the current user from Clerk via Convex auth
//     const identity = await ctx.auth.getUserIdentity();

//     if (!identity) {
//       throw new Error("Not authenticated");
//     }

//     const clerkId = identity.subject;
//     const email = identity.email;
//     const name = identity.name;
//     const imageUrl = identity.picture;

//     // Check if user already exists
//     const existingUser = await ctx.db
//       .query("users")
//       .withIndex("by_clerkId", (q) => q.eq("clerkId", clerkId))
//       .first();

//     if (existingUser) {
//       // Update existing user
//       await ctx.db.patch(existingUser._id, {
//         email,
//         name,

//         updatedAt: Date.now()
//       });
//       return existingUser;
//     } else {
//       // Create new user
//       const userId = await ctx.db.insert("users", {
//         clerkId,
//         email: email || "",
//         name,

//         role: "user",
//         createdAt: Date.now(),
//         updatedAt: Date.now()
//       });

//       return await ctx.db.get(userId);
//     }
//   }
// });

// /**
//  * The Primary Subscription Update Mutation.
//  * Matches your Schema exactly.
//  */
// export const updateSubscription = mutation({
//   args: {
//     userId: v.id("users"),
//     stripeCustomerId: v.string(),
//     subscription: v.object({
//       status: v.union(
//         v.literal("active"),
//         v.literal("canceled"),
//         v.literal("past_due"),
//         v.literal("trialing"),
//         v.literal("incomplete"),
//         v.literal("incomplete_expired"),
//         v.literal("unpaid")
//       ),
//       stripeSubscriptionId: v.string(),
//       plan: v.union(v.literal("basic"), v.literal("pro")),
//       priceId: v.string(),
//       currentPeriodEnd: v.number(),
//       cancelAtPeriodEnd: v.optional(v.boolean()),
//       maxGpts: v.number(),
//       gptIds: v.array(v.string())
//     }),
//     aiCredits: v.optional(v.number())
//   },
//   handler: async (ctx, args) => {
//     const patchData: any = {
//       stripeCustomerId: args.stripeCustomerId,
//       subscription: args.subscription,
//       updatedAt: Date.now()
//     };

//     if (args.aiCredits !== undefined) {
//       patchData.aiCredits = args.aiCredits;
//     }

//     await ctx.db.patch(args.userId, patchData);
//   }
// });

// /**
//  * AI Credit Manager
//  * Decrements credits based on usage.
//  */
// export const updateAICredits = mutation({
//   args: { creditsUsed: v.number() },
//   handler: async (ctx, args) => {
//     const identity = await ctx.auth.getUserIdentity();
//     if (!identity) throw new Error("Unauthorized");

//     const user = await ctx.db
//       .query("users")
//       .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
//       .first();

//     if (!user) throw new Error("User not found");

//     if (user.role !== "admin" && (user.aiCredits || 0) < args.creditsUsed) {
//       throw new Error("Insufficient AI credits");
//     }

//     const newCredits = Math.max(0, (user.aiCredits || 0) - args.creditsUsed);
//     await ctx.db.patch(user._id, {
//       aiCredits: newCredits,
//       updatedAt: Date.now()
//     });

//     return { success: true, remaining: newCredits };
//   }
// });

// // --- CRON / INTERNAL ---

// export const resetMonthlyCredits = internalMutation({
//   args: {},
//   handler: async (ctx) => {
//     const users = await ctx.db.query("users").collect();
//     let resetCount = 0;

//     for (const user of users) {
//       if (user.subscription?.status === "active") {
//         const shouldReset =
//           !user.aiCreditsResetAt || user.aiCreditsResetAt <= Date.now();
//         if (shouldReset) {
//           const newCredits = user.subscription.plan === "basic" ? 1000 : 10000;
//           await ctx.db.patch(user._id, {
//             aiCredits: newCredits,
//             aiCreditsResetAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
//             updatedAt: Date.now()
//           });
//           resetCount++;
//         }
//       }
//     }
//     return { resetCount };
//   }
// });

// // convex/users.ts
// // import { v } from "convex/values";
// // import { mutation, query, internalMutation } from "./_generated/server";

// // // --- QUERIES ---

// // export const getCurrentUser = query({
// //   args: {},
// //   handler: async (ctx) => {
// //     const identity = await ctx.auth.getUserIdentity();
// //     if (!identity) return null;

// //     return await ctx.db
// //       .query("users")
// //       .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
// //       .first();
// //   }
// // });

// // // ... (getByClerkId and getByStripeCustomerId remain the same) ...

// // export const getUserSubscription = query({
// //   args: {},
// //   handler: async (ctx) => {
// //     const identity = await ctx.auth.getUserIdentity();
// //     if (!identity) return null;

// //     const user = await ctx.db
// //       .query("users")
// //       .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
// //       .first();

// //     if (!user) return null;

// //     return {
// //       subscription: user.subscription,
// //       aiCredits: user.aiCredits || 0,
// //       aiCreditsResetAt: user.aiCreditsResetAt,
// //       canCreateProject:
// //         user.role === "admin" || user.subscription?.status === "active",
// //       // ✅ Fallback for the "plan" and "role"
// //       plan: user.subscription?.plan || "free",
// //       role: user.role || "user"
// //     };
// //   }
// // });

// // // --- MUTATIONS ---

// // export const syncCurrentUser = mutation({
// //   args: {},
// //   handler: async (ctx) => {
// //     const identity = await ctx.auth.getUserIdentity();
// //     if (!identity) throw new Error("Not authenticated");

// //     const existingUser = await ctx.db
// //       .query("users")
// //       .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
// //       .first();

// //     // ✅ Robust Role Detection
// //     // Checks Clerk metadata first, then existing DB role, defaults to "user"
// //     const clerkRole = (identity.publicMetadata as { role?: string })?.role;
// //     const role =
// //       existingUser?.role ?? (clerkRole === "admin" ? "admin" : "user");

// //     const userData = {
// //       email: identity.email ?? existingUser?.email ?? "",
// //       name: identity.name ?? existingUser?.name ?? "Anonymous",
// //       imageUrl: identity.pictureUrl ?? existingUser?.imageUrl,
// //       role: role as "admin" | "user", // Ensure this matches your schema
// //       updatedAt: Date.now()
// //     };

// //     if (existingUser) {
// //       await ctx.db.patch(existingUser._id, userData);
// //       return existingUser._id;
// //     }

// //     return await ctx.db.insert("users", {
// //       clerkId: identity.subject,
// //       ...userData,
// //       aiCredits: 10, // ✅ Give new users some starter credits!
// //       createdAt: Date.now()
// //     });
// //   }
// // });

// // // ... (updateSubscription remains the same) ...

// // export const updateAICredits = mutation({
// //   args: { creditsUsed: v.number() },
// //   handler: async (ctx, args) => {
// //     const identity = await ctx.auth.getUserIdentity();
// //     if (!identity) throw new Error("Unauthorized");

// //     const user = await ctx.db
// //       .query("users")
// //       .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
// //       .first();

// //     if (!user) throw new Error("User not found");

// //     // ✅ Admins have infinite credits
// //     if (user.role === "admin") return { success: true, remaining: Infinity };

// //     if ((user.aiCredits || 0) < args.creditsUsed) {
// //       throw new Error("Insufficient AI credits");
// //     }

// //     const newCredits = Math.max(0, (user.aiCredits || 0) - args.creditsUsed);
// //     await ctx.db.patch(user._id, {
// //       aiCredits: newCredits,
// //       updatedAt: Date.now()
// //     });

// //     return { success: true, remaining: newCredits };
// //   }
// // });

// convex/users.ts
import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";

// --- QUERIES ---

export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    return await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .first();
  }
});

export const getByClerkId = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .first();
  }
});

export const getByStripeCustomerId = query({
  args: { stripeCustomerId: v.string() },
  handler: async (ctx, args) => {
    // Since stripeCustomerId isn't indexed, we need to filter
    const users = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("stripeCustomerId"), args.stripeCustomerId))
      .collect();
    return users.length > 0 ? users[0] : null;
  }
});

export const getUserSubscription = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) return null;

    return {
      subscription: user.subscription,
      aiCredits: user.aiCredits || 0,
      aiCreditsResetAt: user.aiCreditsResetAt,
      canCreateProject:
        user.role === "admin" || user.subscription?.status === "active",
      plan: user.subscription?.plan || "basic",
      role: user.role || "user"
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
      imageUrl: identity.picture ?? existingUser?.imageUrl,
      role: role as "admin" | "user",
      updatedAt: Date.now()
    };

    if (existingUser) {
      await ctx.db.patch(existingUser._id, userData);
      return await ctx.db.get(existingUser._id);
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

    return await ctx.db.get(userId);
  }
});

/**
 * Update user subscription (for use with Stripe webhooks)
 */
export const updateSubscription = mutation({
  args: {
    clerkId: v.string(), // Use clerkId for webhook compatibility
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
