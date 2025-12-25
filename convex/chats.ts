import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const createChat = mutation({
  args: {
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
      gptId, // ✅ STORE IT
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
// Add this to your convex/chats.ts file

// export const updateChatProject = mutation({
//   args: {
//     chatId: v.id("chats"),
//     projectId: v.id("projects")
//   },
//   handler: async (ctx, { chatId, projectId }) => {
//     const identity = await ctx.auth.getUserIdentity();
//     if (!identity) throw new Error("Not authenticated");

//     // Get the chat and verify ownership
//     const chat = await ctx.db.get(chatId);
//     if (!chat || chat.userId !== identity.subject) {
//       throw new Error("Unauthorized");
//     }

//     // Verify project ownership
//     const project = await ctx.db.get(projectId);
//     if (!project || project.userId !== identity.subject) {
//       throw new Error("Unauthorized project access");
//     }

//     // Update the chat's projectId
//     await ctx.db.patch(chatId, { projectId });
//     return null;
//   }
// });

// Add this to your convex/chats.ts file

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
// Add this to your convex/chats.ts file
