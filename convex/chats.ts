import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

import { Id } from "./_generated/dataModel";
// export const createChat = mutation({
//   args: {
//     userId: v.string(),
//     title: v.string(),
//     projectId: v.optional(v.id("projects")),
//     createdAt: v.number(),
//     gptId: v.optional(v.string())
//   },
//   handler: async (ctx, { title, projectId, createdAt, gptId }) => {
//     const identity = await ctx.auth.getUserIdentity();
//     if (!identity) throw new Error("Not authenticated");

//     return ctx.db.insert("chats", {
//       title,
//       projectId,
//       gptId, // ✅ STORE IT
//       userId: identity.subject,
//       createdAt
//     });
//   }
// });

// convex/chats.ts
export const createChat = mutation({
  args: {
    // Remove userId from here since you get it from auth
    title: v.string(),
    projectId: v.optional(v.id("projects")),
    createdAt: v.number(),
    gptId: v.optional(v.string())
  },
  handler: async (ctx, { title, projectId, createdAt, gptId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    return ctx.db.insert("chats", {
      title,
      projectId,
      gptId,
      userId: identity.subject,
      createdAt
    });
  }
});
export const listChats = query({
  args: {
    projectId: v.optional(v.id("projects"))
  },
  handler: async (ctx, { projectId }) => {
    if (projectId) {
      // Chats inside a project
      return await ctx.db
        .query("chats")
        .withIndex("by_project", (q) => q.eq("projectId", projectId))
        .order("desc")
        .collect();
    }

    // 🌍 Chats NOT in any project (global chats)
    return await ctx.db
      .query("chats")
      .withIndex("by_project", (q) => q.eq("projectId", undefined))
      .order("desc")
      .collect();
  }
});

// Delete a chat
export const deleteChat = mutation({
  args: { id: v.id("chats") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const chat = await ctx.db.get(args.id);
    if (!chat || chat.userId !== identity.subject) {
      throw new Error("Unauthorized");
    }

    // Delete all messages linked to the chat
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_chat", (q) => q.eq("chatId", args.id))
      .collect();

    for (const m of messages) {
      await ctx.db.delete(m._id);
    }

    await ctx.db.delete(args.id);
    return null;
  }
});

// Get a single chat (still valid)
export const getChat = query({
  args: { id: v.id("chats"), userId: v.string() },
  handler: async (ctx, args) => {
    const chat = await ctx.db.get(args.id);
    if (!chat || chat.userId !== args.userId) return null;
    return chat;
  }
});

// Update chat title (unchanged)
export const updateChatTitle = mutation({
  args: {
    id: v.id("chats"),
    title: v.string()
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const chat = await ctx.db.get(args.id);
    if (!chat || chat.userId !== identity.subject) {
      throw new Error("Unauthorized");
    }

    await ctx.db.patch(args.id, { title: args.title });
    return null;
  }
});

export const updateChatProject = mutation({
  args: {
    chatId: v.id("chats"),
    projectId: v.id("projects")
  },
  handler: async (ctx, { chatId, projectId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // Get the chat and verify ownership
    const chat = await ctx.db.get(chatId);
    if (!chat || chat.userId !== identity.subject) {
      throw new Error("Unauthorized");
    }

    // Verify project ownership
    const project = await ctx.db.get(projectId);
    if (!project || project.userId !== identity.subject) {
      throw new Error("Unauthorized project access");
    }

    // Update the chat's projectId
    await ctx.db.patch(chatId, { projectId });
    return null;
  }
});

export const renameChat = mutation({
  args: {
    id: v.id("chats"),
    title: v.string()
  },
  handler: async (ctx, { id, title }) => {
    await ctx.db.patch(id, { title });
  }
});

export const searchChats = query(
  async (
    { db },
    {
      projectId,
      search
    }: {
      projectId?: Id<"projects">;
      search: string;
    }
  ) => {
    let chatQuery = db.query("chats");

    if (projectId) {
      chatQuery = chatQuery.filter((c) =>
        c.eq(c.field("projectId"), projectId)
      );
    }

    const chats = await chatQuery.collect();

    if (!search) return chats;

    const lowerSearch = search.toLowerCase();
    return chats.filter((chat) =>
      chat.title.toLowerCase().includes(lowerSearch)
    );
  }
);
export const updateChatModel = mutation({
  args: {
    chatId: v.id("chats"),
    model: v.string()
  },
  handler: async (ctx, { chatId, model }) => {
    await ctx.db.patch(chatId, {
      model
    });
  }
});
