// // convex/subscriptions.ts
// import { v } from "convex/values";
// import { mutation, query } from "./_generated/server";

// export const createSubscription = mutation({
//   args: {
//     clerkUserId: v.string(),
//     stripeSubscriptionId: v.string(),
//     stripeCustomerId: v.string(),
//     status: v.string(),
//     priceId: v.string(),
//     planType: v.string(),
//     currentPeriodStart: v.number(),
//     currentPeriodEnd: v.number(),
//     cancelAtPeriodEnd: v.boolean()
//   },
//   handler: async (ctx, args) => {
//     // Get user ID from clerkId
//     const user = await ctx.db
//       .query("users")
//       .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkUserId))
//       .first();

//     if (!user) {
//       throw new Error("User not found");
//     }

//     return await ctx.db.insert("subscriptions", {
//       clerkUserId: args.clerkUserId,
//       userId: user._id,
//       stripeSubscriptionId: args.stripeSubscriptionId,
//       stripeCustomerId: args.stripeCustomerId,
//       status: args.status,
//       priceId: args.priceId,
//       planType: args.planType,
//       currentPeriodStart: args.currentPeriodStart,
//       currentPeriodEnd: args.currentPeriodEnd,
//       cancelAtPeriodEnd: args.cancelAtPeriodEnd,
//       created: Date.now()
//     });
//   }
// });

// export const getSubscriptionsByUser = query({
//   args: { clerkUserId: v.string() },
//   handler: async (ctx, args) => {
//     return await ctx.db
//       .query("subscriptions")
//       .withIndex("by_clerk_user_id", (q) =>
//         q.eq("clerkUserId", args.clerkUserId)
//       )
//       .collect();
//   }
// });

// /**
//  * Main function to sync subscription from Stripe webhook
//  */
// export const syncSubscriptionFromStripe = mutation({
//   args: {
//     clerkUserId: v.string(),
//     stripeSubscriptionId: v.string(),
//     stripeCustomerId: v.string(),
//     status: v.string(),
//     priceId: v.string(),
//     packageKey: v.string(),
//     currentPeriodStart: v.number(),
//     currentPeriodEnd: v.number(),
//     cancelAtPeriodEnd: v.boolean(),
//     maxGpts: v.number()
//   },
//   handler: async (ctx, args) => {
//     // 1. Find the user
//     const user = await ctx.db
//       .query("users")
//       .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkUserId))
//       .unique();

//     if (!user) {
//       throw new Error(`User not found: ${args.clerkUserId}`);
//     }

//     // 2. Get the package to determine plan type
//     const packageData = await ctx.db
//       .query("packages")
//       .withIndex("by_key", (q) => q.eq("key", args.packageKey))
//       .unique();

//     if (!packageData) {
//       throw new Error(`Package not found: ${args.packageKey}`);
//     }

//     // 3. Map package key to plan type for the schema
//     const planType = mapPackageToPlan(args.packageKey);

//     // 4. Update user's subscription field
//     await ctx.db.patch(user._id, {
//       stripeCustomerId: args.stripeCustomerId,
//       subscription: {
//         status: args.status as any,
//         stripeSubscriptionId: args.stripeSubscriptionId,
//         plan: planType,
//         priceId: args.priceId,
//         currentPeriodEnd: args.currentPeriodEnd,
//         cancelAtPeriodEnd: args.cancelAtPeriodEnd,
//         maxGpts: args.maxGpts,
//         gptIds: [] // Initialize empty, will be populated when user assigns GPTs
//       },
//       updatedAt: Date.now()
//     });

//     // 5. Create/update subscription record in subscriptions table
//     const existingSubscription = await ctx.db
//       .query("subscriptions")
//       .withIndex("by_clerk_user_id", (q) =>
//         q.eq("clerkUserId", args.clerkUserId)
//       )
//       .filter((q) =>
//         q.eq(q.field("stripeSubscriptionId"), args.stripeSubscriptionId)
//       )
//       .unique();

//     if (existingSubscription) {
//       // Update existing
//       await ctx.db.patch(existingSubscription._id, {
//         status: args.status,
//         currentPeriodStart: args.currentPeriodStart,
//         currentPeriodEnd: args.currentPeriodEnd,
//         cancelAtPeriodEnd: args.cancelAtPeriodEnd
//       });
//     } else {
//       // Create new
//       await ctx.db.insert("subscriptions", {
//         clerkUserId: args.clerkUserId,
//         userId: user._id,
//         stripeSubscriptionId: args.stripeSubscriptionId,
//         stripeCustomerId: args.stripeCustomerId,
//         status: args.status,
//         priceId: args.priceId,
//         planType: args.packageKey,
//         currentPeriodStart: args.currentPeriodStart,
//         currentPeriodEnd: args.currentPeriodEnd,
//         cancelAtPeriodEnd: args.cancelAtPeriodEnd,
//         created: Math.floor(Date.now() / 1000)
//       });
//     }

//     console.log(`✅ Subscription synced for user ${args.clerkUserId}`);
//     return { success: true };
//   }
// });

// /**
//  * Cancel user subscription
//  */
// export const cancelUserSubscription = mutation({
//   args: {
//     clerkUserId: v.string(),
//     stripeSubscriptionId: v.string(),
//     canceledAt: v.number()
//   },
//   handler: async (ctx, args) => {
//     // 1. Find user
//     const user = await ctx.db
//       .query("users")
//       .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkUserId))
//       .unique();

//     if (!user) {
//       throw new Error(`User not found: ${args.clerkUserId}`);
//     }

//     // 2. Update user's subscription status
//     if (user.subscription) {
//       await ctx.db.patch(user._id, {
//         subscription: {
//           ...user.subscription,
//           status: "canceled",
//           cancelAtPeriodEnd: true
//         },
//         updatedAt: Date.now()
//       });
//     }

//     // 3. Update subscriptions table
//     const subscription = await ctx.db
//       .query("subscriptions")
//       .withIndex("by_clerk_user_id", (q) =>
//         q.eq("clerkUserId", args.clerkUserId)
//       )
//       .filter((q) =>
//         q.eq(q.field("stripeSubscriptionId"), args.stripeSubscriptionId)
//       )
//       .unique();

//     if (subscription) {
//       await ctx.db.patch(subscription._id, {
//         status: "canceled",
//         canceledAt: args.canceledAt
//       });
//     }

//     console.log(`🚫 Subscription canceled for user ${args.clerkUserId}`);
//     return { success: true };
//   }
// });

// /**
//  * Update subscription status (for payment failures/successes)
//  */
// export const updateSubscriptionStatus = mutation({
//   args: {
//     clerkUserId: v.string(),
//     stripeSubscriptionId: v.string(),
//     status: v.string()
//   },
//   handler: async (ctx, args) => {
//     // 1. Find user
//     const user = await ctx.db
//       .query("users")
//       .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkUserId))
//       .unique();

//     if (!user) {
//       throw new Error(`User not found: ${args.clerkUserId}`);
//     }

//     // 2. Update user's subscription status
//     if (user.subscription) {
//       await ctx.db.patch(user._id, {
//         subscription: {
//           ...user.subscription,
//           status: args.status as any
//         },
//         updatedAt: Date.now()
//       });
//     }

//     // 3. Update subscriptions table
//     const subscription = await ctx.db
//       .query("subscriptions")
//       .withIndex("by_clerk_user_id", (q) =>
//         q.eq("clerkUserId", args.clerkUserId)
//       )
//       .filter((q) =>
//         q.eq(q.field("stripeSubscriptionId"), args.stripeSubscriptionId)
//       )
//       .unique();

//     if (subscription) {
//       await ctx.db.patch(subscription._id, {
//         status: args.status
//       });
//     }

//     console.log(
//       `📝 Subscription status updated to ${args.status} for user ${args.clerkUserId}`
//     );
//     return { success: true };
//   }
// });

// /**
//  * Get user's active subscription
//  */
// export const getUserSubscription = query({
//   args: {
//     clerkUserId: v.string()
//   },
//   handler: async (ctx, args) => {
//     const user = await ctx.db
//       .query("users")
//       .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkUserId))
//       .unique();

//     if (!user?.subscription) {
//       return null;
//     }

//     // Check if subscription is still valid
//     const isActive =
//       (user.subscription.status === "active" ||
//         user.subscription.status === "trialing") &&
//       (!user.subscription.currentPeriodEnd ||
//         user.subscription.currentPeriodEnd * 1000 > Date.now());

//     return {
//       ...user.subscription,
//       isActive
//     };
//   }
// });

// /**
//  * Get subscription history for a user
//  */
// export const getSubscriptionHistory = query({
//   args: {
//     clerkUserId: v.string()
//   },
//   handler: async (ctx, args) => {
//     return await ctx.db
//       .query("subscriptions")
//       .withIndex("by_clerk_user_id", (q) =>
//         q.eq("clerkUserId", args.clerkUserId)
//       )
//       .collect();
//   }
// });

// /**
//  * Helper function to map package keys to plan types in schema
//  */
// function mapPackageToPlan(
//   packageKey: string
// ): "sandbox" | "clientProject" | "basic" | "pro" {
//   // Map your package keys to the plan types defined in your schema
//   if (packageKey.includes("sandbox")) return "sandbox";
//   if (packageKey.includes("client")) return "clientProject";
//   if (packageKey.includes("basic")) return "basic";
//   if (packageKey.includes("pro")) return "pro";

//   // Default fallback
//   return "basic";
// }

import { v } from "convex/values";
import { mutation } from "./_generated/server";

export const syncSubscriptionFromStripe = mutation({
  args: {
    clerkUserId: v.string(),
    stripeSubscriptionId: v.string(),
    stripeCustomerId: v.string(),
    status: v.string(), // "active", "canceled", "past_due", etc.
    priceId: v.string(),
    planType: v.union(
      v.literal("sandbox"),
      v.literal("clientProject"),
      v.literal("basic"),
      v.literal("pro")
    ), // Plan type from webhook (not packageKey)
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
