// import { defineSchema, defineTable } from "convex/server";
// import { v } from "convex/values";

// export default defineSchema({
//   projects: defineTable({
//     name: v.string(),
//     userId: v.string() // owner
//   }).index("by_user", ["userId"]),

//   chats: defineTable({
//     title: v.string(),
//     userId: v.string(),
//     projectId: v.optional(v.id("projects")),
//     gptId: v.optional(v.string()), // ✅ ADD THIS
//     createdAt: v.number()
//   })
//     .index("by_user", ["userId"])
//     .index("by_project", ["projectId"])
//     .index("by_gpt", ["gptId"]), // ✅ recommended

//   messages: defineTable({
//     chatId: v.id("chats"),
//     projectId: v.optional(v.id("projects")), // optional for existing messages
//     content: v.string(),
//     role: v.union(v.literal("user"), v.literal("assistant")),
//     gptId: v.optional(v.string()),
//     createdAt: v.number()
//   })
//     .index("by_chat", ["chatId"])
//     .index("by_project", ["projectId"]),

//   gpts: defineTable({
//     gptId: v.string(), // Unique GPT ID like "sales" or "support"
//     model: v.string(), // Model name e.g., "gpt-4o-mini"
//     apiKey: v.optional(v.string()), // Optional API key
//     systemPrompt: v.string(), // Full GPT instructions
//     createdAt: v.number(),
//     updatedAt: v.number()
//   }).index("by_gptId", ["gptId"])
// });

import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
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
    gptId: v.optional(v.string()), // good
    createdAt: v.number()
  })
    .index("by_user", ["userId"])
    .index("by_project", ["projectId"])
    .index("by_gpt", ["gptId"]),

  messages: defineTable({
    chatId: v.id("chats"),
    projectId: v.optional(v.id("projects")),
    content: v.string(),
    role: v.union(v.literal("user"), v.literal("assistant")),
    gptId: v.optional(v.string()),
    createdAt: v.number()
  })
    .index("by_chat", ["chatId"])
    .index("by_project", ["projectId"]),

  gpts: defineTable({
    gptId: v.string(), // "sales", "support", etc.
    model: v.string(),
    apiKey: v.optional(v.string()),
    systemPrompt: v.string(),
    createdAt: v.number(),
    updatedAt: v.number()
  }).index("by_gptId", ["gptId"])
});
