import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const createChat = mutation({
  args: {
    title: v.string()
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const chat = await ctx.db.insert("agent2Chats", {
      title: args.title,
      userId: identity.subject,
      createdAt: Date.now()
    });

    return chat;
  }
});

export const listChats = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const chats = await ctx.db
      .query("agent2Chats")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .order("desc")
      .collect();

    return chats;
  }
});

export const deleteChat = mutation({
  args: { id: v.id("agent2Chats") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const chat = await ctx.db.get(args.id);
    if (!chat || chat.userId !== identity.subject) {
      throw new Error("Unauthorized");
    }

    // Delete all messages in the chat
    const messages = await ctx.db
      .query("agent2Messages")
      .withIndex("by_chat", (q) => q.eq("chatId", args.id))
      .collect();

    for (const message of messages) {
      await ctx.db.delete(message._id);
    }

    // Delete the chat
    await ctx.db.delete(args.id);
  }
});

export const getChat = query({
  args: { id: v.id("agent2Chats"), userId: v.string() },
  handler: async (ctx, args) => {
    try {
      const chat = await ctx.db.get(args.id);

      if (!chat || chat.userId !== args.userId) {
        return null;
      }

      return chat;
    } catch (error) {
      console.error("Error in getChat:", error);
      return null;
    }
  }
});
export const updateChatTitle = mutation({
  args: {
    id: v.id("agent2Chats"),
    title: v.string()
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const chat = await ctx.db.get(args.id);
    if (!chat || chat.userId !== identity.subject) {
      throw new Error("Unauthorized");
    }

    await ctx.db.patch(args.id, {
      title: args.title
    });

    return null;
  }
});
