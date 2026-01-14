import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

//
// LIST MESSAGES
//
export const list = query({
  args: { chatId: v.id("chats") },
  handler: async (ctx, { chatId }) => {
    return await ctx.db
      .query("messages")
      .withIndex("by_chat", (q) => q.eq("chatId", chatId))
      .order("asc")
      .collect();
  }
});

export const storeMessage = mutation({
  args: {
    chatId: v.id("chats"),
    content: v.string(),
    role: v.union(v.literal("user"), v.literal("assistant")),
    gptId: v.optional(v.string())
  },
  handler: async (ctx, { chatId, content, role, gptId }) => {
    if (role === "assistant") {
      // Check if the exact same assistant message already exists
      const existing = await ctx.db
        .query("messages")
        .withIndex("by_chat", (q) => q.eq("chatId", chatId))
        .collect();

      const duplicate = existing.find(
        (m) => m.role === "assistant" && m.content === content
      );

      if (duplicate) {
        return duplicate._id; // skip inserting duplicate
      }
    }

    // Insert message
    return await ctx.db.insert("messages", {
      chatId,
      content,
      role,
      gptId: role === "assistant" ? gptId : undefined,
      createdAt: Date.now()
    });
  }
});

//
// LAST MESSAGE FOR SIDEBAR
//
export const getLastMessage = query({
  args: { chatId: v.id("chats") },
  handler: async (ctx, { chatId }) => {
    return await ctx.db
      .query("messages")
      .withIndex("by_chat", (q) => q.eq("chatId", chatId))
      .order("desc")
      .first();
  }
});
