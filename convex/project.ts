import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// Create a new project
// export const createProject = mutation({
//   args: { name: v.string() },
//   handler: async (ctx, args) => {
//     const identity = await ctx.auth.getUserIdentity();
//     if (!identity) throw new Error("Not authenticated");

//     return await ctx.db.insert("projects", {
//       name: args.name,
//       userId: identity.subject
//     });
//   }
// });

export const createProject = mutation({
  args: {
    name: v.string(),
    gptId: v.optional(v.string())
  },
  handler: async (ctx, { name, gptId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    return await ctx.db.insert("projects", {
      name,
      gptId,
      userId: identity.subject
    });
  }
});

// List all projects for the logged-in user
export const listProjects = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    return await ctx.db
      .query("projects")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .collect();
  }
});

export const getProject = query({
  args: { id: v.id("projects") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  }
});

// Delete a project and all its chats/messages
export const deleteProject = mutation({
  args: { id: v.id("projects") },
  handler: async (ctx, { id }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const project = await ctx.db.get(id);
    if (!project || project.userId !== identity.subject) {
      throw new Error("Unauthorized");
    }

    // Delete all chats in this project
    const chats = await ctx.db
      .query("chats")
      .withIndex("by_project", (q) => q.eq("projectId", id))
      .collect();

    for (const chat of chats) {
      // Delete all messages in each chat
      const messages = await ctx.db
        .query("messages")
        .withIndex("by_chat", (q) => q.eq("chatId", chat._id))
        .collect();

      for (const msg of messages) {
        await ctx.db.delete(msg._id);
      }

      await ctx.db.delete(chat._id);
    }

    // Delete the project itself
    await ctx.db.delete(id);
    return null;
  }
  // Add this to your convex/project.ts file
});
