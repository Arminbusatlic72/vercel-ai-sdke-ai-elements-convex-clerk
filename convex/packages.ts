import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const seedPackages = mutation({
  handler: async (ctx) => {
    const existing = await ctx.db.query("packages").collect();
    if (existing.length > 0) return "Packages already exist";

    const initialPackages = [
      {
        name: "sDNA StoryEngine",
        key: "storyengine",
        tier: "paid",
        stripePriceId: process.env.STRIPE_PRICE_STORYENGINE!,
        stripeProductId: process.env.STRIPE_PRODUCT_STORYENGINE!,
        maxGpts: undefined,
        durationDays: undefined,
        priceAmount: 50000,
        recurring: "monthly" as const,
        description:
          "StoryEngine is a modular intelligence platform for cultural sensemaking,bringing together twelve specialized GPT toolkits designed to challenge assumptions and surface emerging patterns. Each toolkit applies a distinct analytical lens, from subculture and regional analysis to crisis simulation and speculative futures, allowing users to move fluidly between diagnosis and interpretation. Designed for strategists, creatives, and decision-makers operating at the edge of change, StoryEngine extends perception while keeping authorship human-led."
      },
      {
        name: "sDNA Client Project",
        key: "client-project",
        tier: "paid",
        stripePriceId: process.env.STRIPE_PRICE_CLIENT!,
        stripeProductId: process.env.STRIPE_PRODUCT_CLIENT!,
        maxGpts: undefined,
        durationDays: undefined,
        priceAmount: 40000,
        recurring: "monthly" as const,
        description: "",
        hidden: true
      },
      {
        name: "Brand Decoder",
        key: "brand-decoder",
        tier: "paid",
        stripePriceId: process.env.STRIPE_PRICE_BRAND_DECODER!,
        stripeProductId: process.env.STRIPE_PRODUCT_BRAND_DECODER!,
        maxGpts: undefined,
        durationDays: undefined,
        priceAmount: 0,
        recurring: "monthly" as const,
        description: ""
      },
      {
        name: "Contrarian Toolkit",
        key: "contrarian-toolkit",
        tier: "paid",
        stripePriceId: process.env.STRIPE_PRICE_CONTRARIAN_TOOLKIT!,
        stripeProductId: process.env.STRIPE_PRODUCT_CONTRARIAN_TOOLKIT!,
        maxGpts: undefined,
        durationDays: undefined,
        priceAmount: 0,
        recurring: "monthly" as const,
        description: ""
      },
      {
        name: "Crisis Simulator",
        key: "crisis-simulator",
        tier: "free",
        stripePriceId: process.env.STRIPE_PRICE_CRISIS!,
        stripeProductId: process.env.STRIPE_PRODUCT_CRISIS!,
        maxGpts: undefined,
        durationDays: undefined,
        priceAmount: 0,
        recurring: "monthly" as const,
        description: ""
      },
      {
        name: "Culture Mapping Toolkit",
        key: "culture-mapping-toolkit",
        tier: "free",
        stripePriceId: process.env.STRIPE_PRICE_CULTURE!,
        stripeProductId: process.env.STRIPE_PRODUCT_CULTURE!,
        maxGpts: undefined,
        durationDays: undefined,
        priceAmount: 0,
        recurring: "monthly" as const,
        description: ""
      },
      {
        name: "Diagnostic Toolkit",
        key: "diagnostic-toolkit",
        tier: "free",
        stripePriceId: process.env.STRIPE_PRICE_DIAGNOSTIC!,
        stripeProductId: process.env.STRIPE_PRODUCT_DIAGNOSTIC!,
        maxGpts: undefined,
        durationDays: undefined,
        priceAmount: 0,
        recurring: "monthly" as const,
        description: ""
      },
      {
        name: "Digital Flaneur Toolkit",
        key: "digital-flaneur-toolkit",
        tier: "free",
        stripePriceId: process.env.STRIPE_PRICE_DIGITAL!,
        stripeProductId: process.env.STRIPE_PRODUCT_DIGITAL!,
        maxGpts: undefined,
        durationDays: undefined,
        priceAmount: 0,
        recurring: "monthly" as const,
        description: ""
      },
      {
        name: "Packaging Analysis Toolkit",
        key: "packaging-analysis-toolkit",
        tier: "free",
        stripePriceId: process.env.STRIPE_PRICE_PACKAGING_ANALYSIS!,
        stripeProductId: process.env.STRIPE_PRODUCT_PACKAGING_ANALYSIS!,
        maxGpts: undefined,
        durationDays: undefined,
        priceAmount: 0,
        recurring: "monthly" as const,
        description: ""
      },
      {
        name: "Regional Code Toolkit",
        key: "regional-code-toolkit",
        tier: "free",
        stripePriceId: process.env.STRIPE_PRICE_REGIONAL!,
        stripeProductId: process.env.STRIPE_PRODUCT_REGIONAL!,
        maxGpts: undefined,
        durationDays: undefined,
        priceAmount: 0,
        recurring: "monthly" as const,
        description: ""
      },
      {
        name: "Speculative Futures Toolkit",
        key: "speculative-futures-toolkit",
        tier: "free",
        stripePriceId: process.env.STRIPE_PRICE_SPECULATIVE_FUTURES!,
        stripeProductId: process.env.STRIPE_PRODUCT_SPECULATIVE_FUTURES!,
        maxGpts: undefined,
        durationDays: undefined,
        priceAmount: 0,
        recurring: "monthly" as const,
        description: ""
      },
      {
        name: "Subculture Analysis Toolkit",
        key: "subculture-analysis-toolkit",
        tier: "free",
        stripePriceId: process.env.STRIPE_PRICE_SUBCULTURE!,
        stripeProductId: process.env.STRIPE_PRODUCT_SUBCULTURE!,
        maxGpts: undefined,
        durationDays: undefined,
        priceAmount: 0,
        recurring: "monthly" as const,
        description: ""
      },
      {
        name: "Visualizing Unknowns Toolkit",
        key: "visualizing-unknowns-toolkit",
        tier: "free",
        stripePriceId: process.env.STRIPE_PRICE_VISUALIZING!,
        stripeProductId: process.env.STRIPE_PRODUCT_VISUALIZING!,
        maxGpts: undefined,
        durationDays: undefined,
        priceAmount: 0,
        recurring: "monthly" as const,
        description: ""
      },
      {
        name: "Language & Meaning Workshop",
        key: "language-meaning-workshop",
        tier: "free",
        stripePriceId: process.env.STRIPE_PRICE_WORKSHOP!,
        stripeProductId: process.env.STRIPE_PRODUCT_WORKSHOP!,
        maxGpts: undefined,
        durationDays: undefined,
        priceAmount: 0,
        recurring: "monthly" as const,
        description: ""
      },
      {
        name: "Narrative Systems Workshop",
        key: "narrative-systems-workshop",
        tier: "free",
        stripePriceId: process.env.STRIPE_PRICE_WORKSHOP!,
        stripeProductId: process.env.STRIPE_PRODUCT_WORKSHOP!,
        maxGpts: undefined,
        durationDays: undefined,
        priceAmount: 0,
        recurring: "monthly" as const,
        description: ""
      },
      {
        name: "Speculative Futures Workshop",
        key: "speculative-futures-workshop",
        tier: "free",
        stripePriceId: process.env.STRIPE_PRICE_SPECULATIVE_FUTURES!,
        stripeProductId: process.env.STRIPE_PRODUCT_SPECULATIVE_FUTURES!,
        maxGpts: undefined,
        durationDays: undefined,
        priceAmount: 0,
        recurring: "monthly" as const,
        description: ""
      },
      {
        name: "Structured Foresight Workshop",
        key: "structured-foresight-workshop",
        tier: "free",
        stripePriceId: process.env.STRIPE_PRICE_WORKSHOP!,
        stripeProductId: process.env.STRIPE_PRODUCT_WORKSHOP!,
        maxGpts: undefined,
        durationDays: undefined,
        priceAmount: 0,
        recurring: "monthly" as const,
        description: ""
      },
      {
        name: "2026 Trend Theme Toolkit",
        key: "2026-trend-theme-toolkit",
        tier: "free",
        stripePriceId: process.env.STRIPE_PRICE_2026_TREND!,
        stripeProductId: process.env.STRIPE_PRODUCT_2026_TREND!,
        maxGpts: undefined,
        durationDays: undefined,
        priceAmount: 0,
        recurring: "monthly" as const,
        description: ""
      },
      {
        name: "Analyzing Trends",
        key: "analyzing-trends",
        tier: "free",
        stripePriceId: process.env.STRIPE_PRICE_BOOK!,
        stripeProductId: process.env.STRIPE_PRODUCT_BOOK!,
        maxGpts: undefined,
        durationDays: undefined,
        priceAmount: 0,
        recurring: "monthly" as const,
        description: ""
      },
      {
        name: "Workshop GPTs",
        key: "workshop-gpts",
        tier: "free",
        stripePriceId: process.env.STRIPE_PRICE_WORKSHOP!,
        stripeProductId: process.env.STRIPE_PRODUCT_WORKSHOP!,
        maxGpts: undefined,
        durationDays: undefined,
        priceAmount: 0,
        recurring: "monthly" as const,
        description: ""
      },
      {
        name: "Rikkyo GPT",
        key: "rikkyo-gpt",
        tier: "free",
        stripePriceId: process.env.STRIPE_PRICE_RIKKYO!,
        stripeProductId: process.env.STRIPE_PRODUCT_RIKKYO!,
        maxGpts: undefined,
        durationDays: undefined,
        priceAmount: 0,
        recurring: "monthly" as const,
        description: ""
      },
      {
        name: "Substack GPTs",
        key: "substack-gpts",
        tier: "free",
        stripePriceId: process.env.STRIPE_PRICE_BOOK!,
        stripeProductId: process.env.STRIPE_PRODUCT_BOOK!,
        maxGpts: undefined,
        durationDays: undefined,
        priceAmount: 0,
        recurring: "monthly" as const,
        description: ""
      },
      {
        name: "Summer SandBox",
        key: "summer-sandbox",
        tier: "free",
        stripePriceId: process.env.STRIPE_PRICE_BOOK!,
        stripeProductId: process.env.STRIPE_PRODUCT_BOOK!,
        maxGpts: undefined,
        durationDays: undefined,
        priceAmount: 0,
        recurring: "monthly" as const,
        description: ""
      },
      {
        name: "LinkedIN GPT",
        key: "linkedin-gpt",
        tier: "free",
        stripePriceId: process.env.STRIPE_PRICE_BOOK!,
        stripeProductId: process.env.STRIPE_PRODUCT_BOOK!,
        maxGpts: undefined,
        durationDays: undefined,
        priceAmount: 0,
        recurring: "monthly" as const,
        description: ""
      },
      {
        name: "Workshop Primer",
        key: "workshop-primer",
        tier: "free",
        stripePriceId: process.env.STRIPE_PRICE_WORKSHOP!,
        stripeProductId: process.env.STRIPE_PRODUCT_WORKSHOP!,
        maxGpts: undefined,
        durationDays: undefined,
        priceAmount: 0,
        recurring: "monthly" as const,
        description: ""
      },
      {
        name: "Space Analysis Toolkit",
        key: "space-analysis-toolkit",
        tier: "free",
        stripePriceId: process.env.STRIPE_PRICE_SPACE!,
        stripeProductId: process.env.STRIPE_PRODUCT_SPACE!,
        maxGpts: undefined,
        durationDays: undefined,
        priceAmount: 0,
        recurring: "monthly" as const,
        description: ""
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

/**
 * Migration: Hide the sDNA Client Project package
 * Run this once to update existing records
 */
export const hideClientProjectPackage = mutation({
  handler: async (ctx) => {
    const pkg = await ctx.db
      .query("packages")
      .withIndex("by_key", (q) => q.eq("key", "client-project"))
      .first();

    if (!pkg) {
      return "Package not found";
    }

    await ctx.db.patch(pkg._id, {
      hidden: true
    });

    return "Successfully hid sDNA Client Project package";
  }
});

/**
 * Re-seed all packages (clears and rebuilds)
 */
export const reseedPackages = mutation({
  handler: async (ctx) => {
    // Delete all existing packages
    const allPackages = await ctx.db.query("packages").collect();
    for (const pkg of allPackages) {
      await ctx.db.delete(pkg._id);
    }

    const initialPackages = [
      {
        name: "Brand Decoder RV",
        key: "standalone",
        tier: "free",
        stripePriceId: process.env.STRIPE_PRICE_BRAND_DECODER_RV!,
        stripeProductId: process.env.STRIPE_PRODUCT_BRAND_DECODER_RV!,
        maxGpts: undefined,
        durationDays: undefined,
        priceAmount: 0,
        recurring: "monthly" as const,
        description: ""
      },
      {
        name: "Contrarian Toolkit RV",
        key: "standalone",
        tier: "free",
        stripePriceId: process.env.STRIPE_PRICE_CONTRARIAN_TOOLKIT_RV!,
        stripeProductId: process.env.STRIPE_PRODUCT_CONTRARIAN_TOOLKIT_RV!,
        maxGpts: undefined,
        durationDays: undefined,
        priceAmount: 0,
        recurring: "monthly" as const,
        description: ""
      },
      {
        name: "Crisis Simulator RV",
        key: "standalone",
        tier: "free",
        stripePriceId: process.env.STRIPE_PRICE_CRISIS_SIMULATOR_RV!,
        stripeProductId: process.env.STRIPE_PRODUCT_CRISIS_SIMULATOR_RV!,
        maxGpts: undefined,
        durationDays: undefined,
        priceAmount: 0,
        recurring: "monthly" as const,
        description: ""
      },
      {
        name: "Culture Mapping Toolkit RV",
        key: "standalone",
        tier: "free",
        stripePriceId: process.env.STRIPE_PRICE_CULTURE_MAPPING_RV!,
        stripeProductId: process.env.STRIPE_PRODUCT_CULTURE_MAPPING_RV!,
        maxGpts: undefined,
        durationDays: undefined,
        priceAmount: 0,
        recurring: "monthly" as const,
        description: ""
      },
      {
        name: "Diagnostic Toolkit RV",
        key: "standalone",
        tier: "free",
        stripePriceId: process.env.STRIPE_PRICE_DIAGNOSTIC_TOOLKIT_RV!,
        stripeProductId: process.env.STRIPE_PRODUCT_DIAGNOSTIC_TOOLKIT_RV!,
        maxGpts: undefined,
        durationDays: undefined,
        priceAmount: 0,
        recurring: "monthly" as const,
        description: ""
      },
      {
        name: "Digital Flaneur Toolkit RV",
        key: "standalone",
        tier: "free",
        stripePriceId: process.env.STRIPE_PRICE_DIGITAL_FLANEUR_RV!,
        stripeProductId: process.env.STRIPE_PRODUCT_DIGITAL_FLANEUR_RV!,
        maxGpts: undefined,
        durationDays: undefined,
        priceAmount: 0,
        recurring: "monthly" as const,
        description: ""
      },
      {
        name: "Packaging Analysis Toolkit RV",
        key: "standalone",
        tier: "free",
        stripePriceId: process.env.STRIPE_PRICE_PACKAGING_ANALYSIS_RV!,
        stripeProductId: process.env.STRIPE_PRODUCT_PACKAGING_ANALYSIS_RV!,
        maxGpts: undefined,
        durationDays: undefined,
        priceAmount: 0,
        recurring: "monthly" as const,
        description: ""
      },
      {
        name: "Regional Code Toolkit RV",
        key: "standalone",
        tier: "free",
        stripePriceId: process.env.STRIPE_PRICE_REGIONAL_CODE_RV!,
        stripeProductId: process.env.STRIPE_PRODUCT_REGIONAL_CODE_RV!,
        maxGpts: undefined,
        durationDays: undefined,
        priceAmount: 0,
        recurring: "monthly" as const,
        description: ""
      },
      {
        name: "Subculture Simulator RV",
        key: "standalone",
        tier: "free",
        stripePriceId: process.env.STRIPE_PRICE_SUBCULTURE_SIMULATOR_RV!,
        stripeProductId: process.env.STRIPE_PRODUCT_SUBCULTURE_SIMULATOR_RV!,
        maxGpts: undefined,
        durationDays: undefined,
        priceAmount: 0,
        recurring: "monthly" as const,
        description: ""
      },
      {
        name: "Speculative Futures Toolkit RV",
        key: "standalone",
        tier: "free",
        stripePriceId: process.env.STRIPE_PRICE_SPECULATIVE_FUTURES_RV!,
        stripeProductId: process.env.STRIPE_PRODUCT_SPECULATIVE_FUTURES_RV!,
        maxGpts: undefined,
        durationDays: undefined,
        priceAmount: 0,
        recurring: "monthly" as const,
        description: ""
      },
      {
        name: "Subculture Analysis Toolkit RV",
        key: "standalone",
        tier: "free",
        stripePriceId: process.env.STRIPE_PRICE_SUBCULTURE_RV!,
        stripeProductId: process.env.STRIPE_PRODUCT_SUBCULTURE_RV!,
        maxGpts: undefined,
        durationDays: undefined,
        priceAmount: 0,
        recurring: "monthly" as const,
        description: ""
      },
      {
        name: "Visualizing Unknowns Toolkit RV",
        key: "standalone",
        tier: "free",
        stripePriceId: process.env.STRIPE_PRICE_VISUALIZING_RV!,
        stripeProductId: process.env.STRIPE_PRODUCT_VISUALIZING_RV!,
        maxGpts: undefined,
        durationDays: undefined,
        priceAmount: 0,
        recurring: "monthly" as const,
        description: ""
      },
      {
        name: "Brand Decoder",
        key: "StoryEngine",
        tier: "free",
        stripePriceId: process.env.STRIPE_PRICE_BRAND_DECODER!,
        stripeProductId: process.env.STRIPE_PRODUCT_BRAND_DECODER!,
        maxGpts: undefined,
        durationDays: undefined,
        priceAmount: 0,
        recurring: "monthly" as const,
        description: ""
      },
      {
        name: "Contrarian Toolkit",
        key: "StoryEngine",
        tier: "free",
        stripePriceId: process.env.STRIPE_PRICE_CONTRARIAN_TOOLKIT!,
        stripeProductId: process.env.STRIPE_PRODUCT_CONTRARIAN_TOOLKIT!,
        maxGpts: undefined,
        durationDays: undefined,
        priceAmount: 0,
        recurring: "monthly" as const,
        description: ""
      },
      {
        name: "Crisis Simulator",
        key: "StoryEngine",
        tier: "free",
        stripePriceId: process.env.STRIPE_PRICE_CRISIS_SIMULATOR!,
        stripeProductId: process.env.STRIPE_PRODUCT_CRISIS_SIMULATOR!,
        maxGpts: undefined,
        durationDays: undefined,
        priceAmount: 0,
        recurring: "monthly" as const,
        description: ""
      },
      {
        name: "Culture Mapping Toolkit",
        key: "StoryEngine",
        tier: "free",
        stripePriceId: process.env.STRIPE_PRICE_CULTURE!,
        stripeProductId: process.env.STRIPE_PRODUCT_CULTURE!,
        maxGpts: undefined,
        durationDays: undefined,
        priceAmount: 0,
        recurring: "monthly" as const,
        description: ""
      },
      {
        name: "Diagnostic Toolkit",
        key: "StoryEngine",
        tier: "free",
        stripePriceId: process.env.STRIPE_PRICE_DIAGNOSTIC!,
        stripeProductId: process.env.STRIPE_PRODUCT_DIAGNOSTIC!,
        maxGpts: undefined,
        durationDays: undefined,
        priceAmount: 0,
        recurring: "monthly" as const,
        description: ""
      },
      {
        name: "Digital Flaneur Toolkit",
        key: "StoryEngine",
        tier: "free",
        stripePriceId: process.env.STRIPE_PRICE_DIGITAL!,
        stripeProductId: process.env.STRIPE_PRODUCT_DIGITAL!,
        maxGpts: undefined,
        durationDays: undefined,
        priceAmount: 0,
        recurring: "monthly" as const,
        description: ""
      },
      {
        name: "Packaging Analysis Toolkit",
        key: "StoryEngine",
        tier: "free",
        stripePriceId: process.env.STRIPE_PRICE_PACKAGING!,
        stripeProductId: process.env.STRIPE_PRODUCT_PACKAGING!,
        maxGpts: undefined,
        durationDays: undefined,
        priceAmount: 0,
        recurring: "monthly" as const,
        description: ""
      },
      {
        name: "Regional Code Toolkit",
        key: "StoryEngine",
        tier: "free",
        stripePriceId: process.env.STRIPE_PRICE_REGIONAL!,
        stripeProductId: process.env.STRIPE_PRODUCT_REGIONAL!,
        maxGpts: undefined,
        durationDays: undefined,
        priceAmount: 0,
        recurring: "monthly" as const,
        description: ""
      },
      {
        name: "Subculture Simulator",
        key: "StoryEngine",
        tier: "free",
        stripePriceId: process.env.STRIPE_PRICE_SUBCULTURE_SIM!,
        stripeProductId: process.env.STRIPE_PRODUCT_SUBCULTURE_SIM!,
        maxGpts: undefined,
        durationDays: undefined,
        priceAmount: 0,
        recurring: "monthly" as const,
        description: ""
      },
      {
        name: "Speculative Futures Toolkit",
        key: "StoryEngine",
        tier: "free",
        stripePriceId: process.env.STRIPE_PRICE_SPECULATIVE!,
        stripeProductId: process.env.STRIPE_PRODUCT_SPECULATIVE!,
        maxGpts: undefined,
        durationDays: undefined,
        priceAmount: 0,
        recurring: "monthly" as const,
        description: ""
      },
      {
        name: "Subculture Analysis Toolkit",
        key: "StoryEngine",
        tier: "free",
        stripePriceId: process.env.STRIPE_PRICE_SUBCULTURE!,
        stripeProductId: process.env.STRIPE_PRODUCT_SUBCULTURE!,
        maxGpts: undefined,
        durationDays: undefined,
        priceAmount: 0,
        recurring: "monthly" as const,
        description: ""
      },
      {
        name: "Visualizing Unknowns Toolkit",
        key: "StoryEngine",
        tier: "free",
        stripePriceId: process.env.STRIPE_PRICE_VISUALIZING!,
        stripeProductId: process.env.STRIPE_PRODUCT_VISUALIZING!,
        maxGpts: undefined,
        durationDays: undefined,
        priceAmount: 0,
        recurring: "monthly" as const,
        description: ""
      },
      {
        name: "sDNA Client Project/Cooke Insight",
        key: "standalone",
        tier: "free",
        stripePriceId: process.env.STRIPE_PRICE_CLIENT!,
        stripeProductId: process.env.STRIPE_PRODUCT_CLIENT!,
        maxGpts: undefined,
        durationDays: undefined,
        priceAmount: 0,
        recurring: "monthly" as const,
        description: ""
      },
      {
        name: "Book Project",
        key: "standalone",
        tier: "free",
        stripePriceId: process.env.STRIPE_PRICE_CLIENT!,
        stripeProductId: process.env.STRIPE_PRODUCT_CLIENT!,
        maxGpts: undefined,
        durationDays: undefined,
        priceAmount: 0,
        recurring: "monthly" as const,
        description: ""
      },
      {
        name: "sDNA StoryEngine",
        key: "storyengine",
        tier: "paid",
        stripePriceId: process.env.STRIPE_PRICE_STORYENGINE!,
        stripeProductId: process.env.STRIPE_PRODUCT_STORYENGINE!,
        maxGpts: undefined,
        durationDays: undefined,
        priceAmount: 50000,
        recurring: "monthly" as const,
        description:
          "StoryEngine is a modular intelligence platform for cultural sensemaking..."
      },
      {
        name: "Rikkyo GPT",
        key: "classroom-speaker-gpt",
        tier: "free",
        stripePriceId: process.env.STRIPE_PRICE_RIKKYO!,
        stripeProductId: process.env.STRIPE_PRODUCT_RIKKYO!,
        maxGpts: undefined,
        durationDays: undefined,
        priceAmount: 0,
        recurring: "monthly" as const,
        description: ""
      },
      {
        name: "Workshop Primer",
        key: "workshop-primer",
        tier: "free",
        stripePriceId: process.env.STRIPE_PRICE_WORKSHOP!,
        stripeProductId: process.env.STRIPE_PRODUCT_WORKSHOP!,
        maxGpts: undefined,
        durationDays: undefined,
        priceAmount: 0,
        recurring: "monthly" as const,
        description: ""
      },
      {
        name: "Space Analysis Toolkit",
        key: "space-analysis-toolkit",
        tier: "free",
        stripePriceId: process.env.STRIPE_PRICE_SPACE!,
        stripeProductId: process.env.STRIPE_PRODUCT_SPACE!,
        maxGpts: undefined,
        durationDays: undefined,
        priceAmount: 0,
        recurring: "monthly" as const,
        description: ""
      },
      {
        name: "2026 Trend Theme Toolkit",
        key: "trend-theme-2026-toolkit",
        tier: "free",
        stripePriceId: process.env.STRIPE_PRICE_2026_TREND!,
        stripeProductId: process.env.STRIPE_PRODUCT_2026_TREND!,
        maxGpts: undefined,
        durationDays: undefined,
        priceAmount: 0,
        recurring: "monthly" as const,
        description: ""
      }
    ];

    for (const pkg of initialPackages) {
      await ctx.db.insert("packages", {
        ...pkg,
        features: ["Access to assigned GPTs", "Chat history", "PDF uploads"]
      });
    }

    return "Successfully re-seeded " + initialPackages.length + " packages";
  }
});

export const listPackages = query({
  handler: async (ctx) => {
    const allPackages = await ctx.db.query("packages").collect();
    return allPackages.filter((pkg) => !pkg.hidden);
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
  const allPackages = await db.query("packages").collect();
  return allPackages.filter((pkg) => !pkg.hidden);
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
 * Get package by Stripe Product ID (for webhooks and subscription matching)
 */
export const getPackageByProductId = query({
  args: {
    stripeProductId: v.string()
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("packages")
      .withIndex("by_stripeProductId", (q) =>
        q.eq("stripeProductId", args.stripeProductId)
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

    // Step 3: Check for active subscription
    const subscription = user.subscription;
    if (!subscription) {
      console.log("❌ User has no subscription");
      return [];
    }

    // Only allow active subscriptions
    // if (subscription.status !== "active") {
    //   console.log(
    //     `⚠️ Subscription status is ${subscription.status}, not active`
    //   );
    //   return [];
    // }

    if (
      subscription.status !== "active" &&
      subscription.status !== "trialing"
    ) {
      throw new Error(
        `Subscription is ${subscription.status}, not active or trialing`
      );
    }
    // Step 4: Find the package matching productId or priceId
    let matchedPackage = null;

    // Try productId first (preferred)
    if (subscription.productId) {
      console.log(
        `✅ User has active subscription with productId: ${subscription.productId}`
      );
      matchedPackage = await ctx.db
        .query("packages")
        .withIndex("by_stripeProductId", (q) =>
          q.eq("stripeProductId", subscription.productId!)
        )
        .unique();
    }

    // Fall back to priceId for older subscriptions
    if (!matchedPackage && subscription.priceId) {
      console.log(
        `⚠️ No productId found, falling back to priceId: ${subscription.priceId}`
      );
      matchedPackage = await ctx.db
        .query("packages")
        .withIndex("by_stripePriceId", (q) =>
          q.eq("stripePriceId", subscription.priceId!)
        )
        .unique();
    }

    if (!matchedPackage) {
      console.log(
        `❌ No package found for productId: ${subscription.productId} or priceId: ${subscription.priceId}`
      );
      return [];
    }

    // Step 5: Get all GPTs that belong to this package
    const gpts = await ctx.db
      .query("gpts")
      .withIndex("by_packageId", (q) => q.eq("packageId", matchedPackage._id))
      .collect();

    console.log(`✅ Found ${gpts.length} GPTs for this package`);

    return gpts;
  }
});
