import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  projects: defineTable({
    name: v.string(),
    userId: v.string() // owner
  }).index("by_user", ["userId"]),

  chats: defineTable({
    title: v.string(),
    userId: v.string(),
    projectId: v.optional(v.id("projects")), // optional for existing chats
    createdAt: v.number()
  })
    .index("by_user", ["userId"])
    .index("by_project", ["projectId"]),

  messages: defineTable({
    chatId: v.id("chats"),
    projectId: v.optional(v.id("projects")), // optional for existing messages
    content: v.string(),
    role: v.union(v.literal("user"), v.literal("assistant")),
    createdAt: v.number()
  })
    .index("by_chat", ["chatId"])
    .index("by_project", ["projectId"])
});
