import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    clerkId: v.string(),
    email: v.string(),
    name: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    role: v.union(v.literal("admin"), v.literal("user")),

    // ✅ ADD THESE SUBSCRIPTION FIELDS:
    stripeCustomerId: v.optional(v.string()),

    subscription: v.optional(
      v.object({
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
        // UPDATE THIS LINE - Add your new plan types
        plan: v.union(
          v.literal("sandbox"),
          v.literal("clientProject"),
          v.literal("basic"),
          v.literal("pro")
        ),
        priceId: v.string(),
        currentPeriodEnd: v.optional(v.number()),
        cancelAtPeriodEnd: v.optional(v.boolean()),
        maxGpts: v.number(),
        gptIds: v.array(v.string())
      })
    ),

    // ✅ ADD AI CREDITS (for usage limits)
    aiCredits: v.optional(v.number()),
    aiCreditsResetAt: v.optional(v.number()), // When credits reset

    createdAt: v.number(),
    updatedAt: v.number()
  })
    .index("by_clerkId", ["clerkId"])
    .index("by_role", ["role"])
    .index("by_subscription_status", ["subscription.status"]), // ✅ New index

  // ✅ ADD SUBSCRIPTIONS TABLE for history/audit
  subscriptions: defineTable({
    clerkUserId: v.string(),
    userId: v.id("users"),
    stripeSubscriptionId: v.string(),
    stripeCustomerId: v.string(),
    status: v.string(),
    priceId: v.string(),
    planType: v.string(),
    currentPeriodStart: v.number(),
    currentPeriodEnd: v.number(),
    cancelAtPeriodEnd: v.optional(v.boolean()),
    created: v.number(),
    canceledAt: v.optional(v.number())
  })
    .index("by_user_id", ["userId"])
    .index("by_clerk_user_id", ["clerkUserId"])
    .index("by_status", ["status"]),

  projects: defineTable({
    name: v.string(),
    userId: v.string(), // owner
    projectId: v.optional(v.id("projects")),
    gptId: v.optional(v.string()) // good
  })
    .index("by_user", ["userId"])
    .index("by_user_gpt", ["userId", "gptId"]), // ✅ important

  chats: defineTable({
    title: v.string(),
    userId: v.string(),
    projectId: v.optional(v.id("projects")),
    gptId: v.optional(v.string()),

    // ✅ ADD THESE
    model: v.optional(v.string()),
    provider: v.optional(v.union(v.literal("openai"), v.literal("google"))),

    createdAt: v.number()
  })
    .index("by_user", ["userId"])
    .index("by_project", ["projectId"])
    .index("by_gpt", ["gptId"]),

  // In schema.ts - update the chats table

  messages: defineTable({
    // userId: v.string(),
    chatId: v.id("chats"),
    projectId: v.optional(v.id("projects")),
    content: v.string(),
    role: v.union(v.literal("user"), v.literal("assistant")),
    gptId: v.optional(v.string()),
    createdAt: v.number()
  })
    .index("by_chat", ["chatId"])
    // .index("by_user", ["userId"])
    .index("by_project", ["projectId"]),

  gpts: defineTable({
    gptId: v.string(), // "sales", "support", etc.
    model: v.string(),
    apiKey: v.optional(v.string()),
    packageId: v.optional(v.id("packages")),
    vectorStoreId: v.optional(v.string()),
    pdfFiles: v.optional(
      v.array(
        v.object({
          fileName: v.string(),
          openaiFileId: v.string(),
          uploadedAt: v.number()
        })
      )
    ),
    systemPrompt: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number()
  })
    .index("by_gptId", ["gptId"])
    .index("by_packageId", ["packageId"]),

  // ✅ NEW: General Settings Table (single record)
  generalSettings: defineTable({
    settingsId: v.string(), // Always "default"
    defaultApiKey: v.optional(v.string()),
    defaultSystemPrompt: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
    updatedBy: v.string() // userId of who updated it
  }).index("by_settingsId", ["settingsId"]), // For fast lookup

  packages: defineTable({
    key: v.string(), // e.g., "sandbox-summer"
    name: v.string(), // e.g., "SandBox Summer"
    stripePriceId: v.string(), // "free_" prefix for free packages
    description: v.optional(v.string()),
    maxGpts: v.optional(v.number()),
    tier: v.string(), // "free", "paid", "trial"
    durationDays: v.optional(v.number()), // For trial/limited packages
    priceAmount: v.optional(v.number()), // For paid packages (in cents)
    recurring: v.optional(v.union(v.literal("monthly"), v.literal("one-time"))),
    features: v.optional(v.array(v.string()))
  })
    .index("by_key", ["key"])
    .index("by_stripePriceId", ["stripePriceId"])
    .index("by_tier", ["tier"]) // Add tier index
});
