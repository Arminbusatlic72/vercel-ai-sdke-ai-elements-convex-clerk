// // convex/packages.ts
// import { mutation, query } from "./_generated/server";
// import { v } from "convex/values";

// export const seedPackages = mutation({
//   handler: async (ctx) => {
//     const existing = await ctx.db.query("packages").collect();
//     if (existing.length > 0) return "Packages already exist";

//     const initialPackages = [
//       {
//         name: "SandBox Level",
//         key: "sandbox-level",
//         tier: "paid",
//         stripePriceId: "price_sandbox_level",
//         maxGpts: 12,
//         priceAmount: 50000, // $500 in cents
//         recurring: "monthly",
//         description: "Full access to all GPTs"
//       },
//       {
//         name: "Client Project",
//         key: "client-project",
//         tier: "trial",
//         stripePriceId: "price_client_project_trial",
//         maxGpts: 1,
//         durationDays: 30,
//         description: "30-day trial, converts to paid"
//       },
//       {
//         name: "Analyzing Trends",
//         key: "analyzing-trends",
//         tier: "free",
//         stripePriceId: "free_trends",
//         maxGpts: 4,
//         durationDays: 150, // 5 months
//         description: "Free trend analysis tools for 5 months"
//       },
//       {
//         name: "SandBox Summer",
//         key: "sandbox-summer",
//         tier: "free",
//         stripePriceId: "free_summer",
//         maxGpts: 3,
//         durationDays: 90, // 3 months
//         description: "Free summer semester access"
//       },
//       {
//         name: "SandBox Workshop",
//         key: "sandbox-workshop",
//         tier: "free",
//         stripePriceId: "free_workshop",
//         maxGpts: 4,
//         durationDays: 33, // 3 days + 30 days
//         description: "Free workshop series access"
//       },
//       {
//         name: "GPTs Classroom",
//         key: "gpts-classroom",
//         tier: "free",
//         stripePriceId: "free_classroom",
//         maxGpts: 1,
//         durationDays: 15, // 1 day + 14 days
//         description: "Educational use"
//       },
//       {
//         name: "Speaker GPT",
//         key: "speaker-gpt",
//         tier: "free",
//         stripePriceId: "free_speaker",
//         maxGpts: 1,
//         durationDays: 1,
//         description: "Public speaking assistant"
//       },
//       {
//         name: "Substack GPT",
//         key: "substack-gpt",
//         tier: "free",
//         stripePriceId: "free_substack",
//         maxGpts: 1,
//         durationDays: 14,
//         description: "Substack integration"
//       }
//     ];

//     for (const pkg of initialPackages) {
//       await ctx.db.insert("packages", {
//         ...pkg,
//         features: ["Access to assigned GPTs", "Chat history", "PDF uploads"]
//       });
//     }
//     return "Successfully seeded " + initialPackages.length + " packages.";
//   }
// });

// export const listPackages = query({
//   handler: async (ctx) => {
//     return await ctx.db.query("packages").collect();
//   }
// });

// // Add a query to get packages with GPT counts
// export const getPackagesWithGpts = query({
//   handler: async (ctx) => {
//     const packages = await ctx.db.query("packages").collect();

//     const packagesWithGpts = await Promise.all(
//       packages.map(async (pkg) => {
//         const gpts = await ctx.db
//           .query("gpts")
//           .filter((q) => q.eq(q.field("packageId"), pkg._id))
//           .collect();

//         return {
//           ...pkg,
//           gpts,
//           gptCount: gpts.length
//         };
//       })
//     );

//     return packagesWithGpts;
//   }
// });

// // Get a single package by ID
// export const getPackageById = query({
//   args: { packageId: v.id("packages") },
//   handler: async (ctx, args) => {
//     return await ctx.db.get(args.packageId);
//   }
// });

// // Get a single package by key
// export const getPackageByKey = query({
//   args: { key: v.string() },
//   handler: async (ctx, args) => {
//     return await ctx.db
//       .query("packages")
//       .withIndex("by_key", (q) => q.eq("key", args.key))
//       .first();
//   }
// });

// // Update a package
// export const updatePackage = mutation({
//   args: {
//     packageId: v.id("packages"),
//     name: v.optional(v.string()),
//     description: v.optional(v.string()),
//     maxGpts: v.optional(v.number()),
//     tier: v.optional(v.string()),
//     stripePriceId: v.optional(v.string())
//   },
//   handler: async (ctx, args) => {
//     const { packageId, ...updates } = args;

//     // Remove undefined values
//     const cleanUpdates = Object.fromEntries(
//       Object.entries(updates).filter(([_, value]) => value !== undefined)
//     );

//     await ctx.db.patch(packageId, cleanUpdates);
//     return { success: true };
//   }
// });

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
        priceAmount: 50000,
        recurring: "monthly" as const,
        description: "Full access to all GPTs"
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
