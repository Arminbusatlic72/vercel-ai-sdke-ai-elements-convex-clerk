import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const list = query({
  args: { chatId: v.id("agent2Chats") },
  handler: async (ctx, { chatId }) => {
    return await ctx.db
      .query("agent2Messages")
      .withIndex("by_chat", (q) => q.eq("chatId", chatId))
      .order("asc")
      .collect();
  }
});

// export const storeMessage = mutation({
//   args: {
//     chatId: v.id("agent2Chats"),
//     content: v.string(),
//     role: v.union(v.literal("user"), v.literal("assistant"))
//   },
//   handler: async (ctx, { chatId, content, role }) => {
//     return await ctx.db.insert("agent2Messages", {
//       chatId,
//       content,
//       role,
//       createdAt: Date.now()
//     });
//   }
// });

export const storeMessage = mutation({
  args: {
    chatId: v.id("agent2Chats"),
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),
    createdAt: v.number()
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("agent2Messages", {
      chatId: args.chatId,
      role: args.role,
      content: args.content,
      createdAt: args.createdAt
    });
  }
});

export const getLastMessage = query({
  args: { chatId: v.id("agent2Chats") },
  handler: async (ctx, { chatId }) => {
    return await ctx.db
      .query("agent2Messages")
      .withIndex("by_chat", (q) => q.eq("chatId", chatId))
      .order("desc")
      .first();
  }
});
