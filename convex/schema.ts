// import { defineSchema, defineTable } from "convex/server";
// import { v } from "convex/values";
// export default defineSchema({
//   chats: defineTable({
//     title: v.string(),
//     userId: v.string(),
//     createdAt: v.number()
//   }).index("by_user", ["userId"]),
//   //   Optimize by user

//   messages: defineTable({
//     chatId: v.id("chats"),
//     content: v.string(),
//     role: v.union(v.literal("user"), v.literal("assistant")),
//     createdAt: v.number()
//   }).index("by_chat", ["chatId"])
// });

import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Original agent tables
  chats: defineTable({
    title: v.string(),
    userId: v.string(),
    createdAt: v.number()
  }).index("by_user", ["userId"]),

  messages: defineTable({
    chatId: v.id("chats"),
    content: v.string(),
    role: v.union(v.literal("user"), v.literal("assistant")),
    createdAt: v.number()
  }).index("by_chat", ["chatId"]),

  // New agent tables
  agent2Chats: defineTable({
    title: v.string(),
    userId: v.string(),
    createdAt: v.number()
  }).index("by_user", ["userId"]),

  agent2Messages: defineTable({
    chatId: v.id("agent2Chats"),
    content: v.string(),
    role: v.union(v.literal("user"), v.literal("assistant")),
    createdAt: v.number()
  }).index("by_chat", ["chatId"])
});
