import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const seedPackages = mutation({
  handler: async (ctx) => {
    const existing = await ctx.db.query("packages").collect();
    if (existing.length > 0) return "Packages already exist";

    const initialPackages = [
      {
        name: "SandBox Level",
        key: "sandbox-level",
        tier: "paid",
        stripePriceId: process.env.STRIPE_PRICE_SANDBOX_LEVEL_MONTHLY!,
        maxGpts: 12,
        durationDays: 30,
        priceAmount: 50000,
        recurring: "monthly" as const,
        description: "Full access to all GPTs hello"
      },
      {
        name: "Client Project GPTs",
        key: "client-project",
        tier: "trial",
        stripePriceId: process.env.STRIPE_PRICE_CLIENT_PROJECT_GPT_MONTHLY!,
        maxGpts: 1,
        durationDays: 30,
        description: "30-day trial, converts to paid"
      },
      {
        name: "Analyzing Trends SandBox",
        key: "analyzing-trends",
        tier: "free",
        stripePriceId: process.env.STRIPE_PRICE_ANALYZING_TRENDS_FREE!,
        maxGpts: 4,
        durationDays: 150,
        description: "Free trend analysis tools for 5 months"
      },
      {
        name: "Summer SandBox",
        key: "sandbox-summer",
        tier: "free",
        stripePriceId: process.env.STRIPE_PRICE_SUMMER_SANDBOX_FREE!,
        maxGpts: 3,
        durationDays: 90,
        description: "Free summer semester access"
      },
      {
        name: "Workshop GPTs",
        key: "sandbox-workshop",
        tier: "free",
        stripePriceId: process.env.STRIPE_PRICE_WORKSHOP_SANDBOX_FREE!,
        maxGpts: 4,
        durationDays: 33,
        description: "Free workshop series access"
      },
      {
        name: "Classroom Speaker GPT",
        key: "gpts-classroom",
        tier: "free",
        stripePriceId: process.env.STRIPE_PRICE_CLASSROOM_SPEAKER_FREE!,
        maxGpts: 1,
        durationDays: 15,
        description: "Educational use"
      },

      {
        name: "Substack GPT",
        key: "substack-gpt",
        tier: "free",
        stripePriceId: process.env.STRIPE_PRICE_SUBSTACK_GPT_FREE!,
        maxGpts: 1,
        durationDays: 14,
        description: "Substack integration"
      }
    ];

    for (const pkg of initialPackages) {
      await ctx.db.insert("packages", {
        ...pkg,
        features: ["Access to assigned GPTs", "Chat history", "PDF uploads"]
      });
    }

    return "Successfully seeded " + initialPackages.length + " packages.";
  }
});

export const listPackages = query({
  handler: async (ctx) => {
    return await ctx.db.query("packages").collect();
  }
});

export const listGptsForCurrentUser = query({
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

    const planKey = user.subscription?.plan;
    if (!planKey) return [];

    const pkg = await ctx.db
      .query("packages")
      .withIndex("by_key", (q) => q.eq("key", planKey))
      .first();

    if (!pkg) return [];

    return await ctx.db
      .query("gpts")
      .withIndex("by_packageId", (q) => q.eq("packageId", pkg._id))
      .collect();
  }
});

export const getAllPackages = query(async ({ db }) => {
  return await db.query("packages").collect();
});

/**
 * Get package by Stripe Price ID (for webhooks)
 */
export const getPackageByPriceId = query({
  args: {
    stripePriceId: v.string()
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("packages")
      .withIndex("by_stripePriceId", (q) =>
        q.eq("stripePriceId", args.stripePriceId)
      )
      .unique();
  }
});

/**
 * Get package by key
 */
export const getPackageByKey = query({
  args: {
    key: v.string()
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("packages")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .unique();
  }
});

/**
 * Get all packages
 */

/**
 * Get packages by tier (free, paid, trial)
 */
export const getPackagesByTier = query({
  args: {
    tier: v.string()
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("packages")
      .withIndex("by_tier", (q) => q.eq("tier", args.tier))
      .collect();
  }
});

/**
 * Get GPTs available to the current logged-in user based on their subscription
 *
 * Flow:
 * 1. Get the current user from Clerk auth
 * 2. Get user record from database
 * 3. Check if user has an active subscription with a priceId
 * 4. Match priceId to a package by stripePriceId
 * 5. Get all GPTs where packageId matches that package
 *
 * Returns: Array of GPTs from the user's subscription package
 * Returns: Empty array if no active subscription
 */
export const getSubscriptionGpts = query({
  args: {},
  handler: async (ctx) => {
    // Step 1: Get current user from Clerk auth
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      console.log("❌ No authenticated user");
      return [];
    }

    // Step 2: Get user record from database
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) {
      console.log(
        `❌ User not found in database for clerkId: ${identity.subject}`
      );
      return [];
    }

    // Step 3: Check for active subscription with priceId
    const subscription = user.subscription;
    if (!subscription || !subscription.priceId) {
      console.log("❌ User has no active subscription");
      return [];
    }

    // Only allow active subscriptions
    if (subscription.status !== "active") {
      console.log(
        `⚠️ Subscription status is ${subscription.status}, not active`
      );
      return [];
    }

    console.log(
      `✅ User has active subscription with priceId: ${subscription.priceId}`
    );

    // Step 4: Find the package that matches this priceId
    const matchedPackage = await ctx.db
      .query("packages")
      .withIndex("by_stripePriceId", (q) =>
        q.eq("stripePriceId", subscription.priceId)
      )
      .unique();

    if (!matchedPackage) {
      console.log(`❌ No package found for priceId: ${subscription.priceId}`);
      return [];
    }

    console.log(
      `✅ Found package: ${matchedPackage.name} (${matchedPackage._id})`
    );

    // Step 5: Get all GPTs that belong to this package
    const gpts = await ctx.db
      .query("gpts")
      .withIndex("by_packageId", (q) => q.eq("packageId", matchedPackage._id))
      .collect();

    console.log(`✅ Found ${gpts.length} GPTs for this package`);

    return gpts;
  }
});
