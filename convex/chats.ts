import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { findPackageBySubscription } from "./gptAccess";

import { Id } from "./_generated/dataModel";

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

    // 1️⃣ Load user
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) throw new Error("User not found");

    // 2️⃣ If user is admin, allow everything
    if (user.role === "admin") {
      return ctx.db.insert("chats", {
        title,
        projectId,
        gptId,
        userId: identity.subject,
        createdAt
      });
    }

    // 3️⃣ Only require a subscription when a GPT is requested
    if (gptId) {
      const subscription = user.subscription;
      if (!subscription) {
        throw new Error(
          "No subscription found. Please subscribe to access GPTs."
        );
      }

      // Only allow active subscriptions for GPT access
      // if (subscription.status !== "active") {
      //   throw new Error(`Subscription is ${subscription.status}, not active`);
      // }
      if (
        subscription.status !== "active" &&
        subscription.status !== "trialing"
      ) {
        throw new Error(
          `Subscription is ${subscription.status}, not active or trialing`
        );
      }

      // 4️⃣ Use helper to find package (tries productId, falls back to priceId)
      const matchedPackage = await findPackageBySubscription(
        ctx,
        subscription.productId,
        subscription.priceId
      );

      if (!matchedPackage) {
        throw new Error("Your subscription package was not found.");
      }

      const gpt = await ctx.db
        .query("gpts")
        .withIndex("by_packageId", (q) => q.eq("packageId", matchedPackage._id))
        .collect()
        .then((gpts) => gpts.find((g) => g.gptId === gptId));

      if (!gpt) {
        throw new Error("You do not have access to this GPT.");
      }
    }

    // 5️⃣ Create chat
    return ctx.db.insert("chats", {
      title,
      projectId,
      gptId,
      userId: identity.subject,
      createdAt
    });
  }
});

// export const createChat = mutation({
//   args: {
//     // Remove userId from here since you get it from auth
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
//       gptId,
//       userId: identity.subject,
//       createdAt
//     });
//   }
// });

// export const listChats = query({
//   args: { projectId: v.optional(v.id("projects")) },
//   handler: async (ctx, { projectId }) => {
//     const identity = await ctx.auth.getUserIdentity();
//     if (!identity) return [];

//     let q = ctx.db
//       .query("chats")
//       .withIndex("by_user", (q) => q.eq("userId", identity.subject));

//     if (projectId !== undefined) {
//       q = q.filter((c) => c.eq(c.field("projectId"), projectId));
//     }

//     return await q.order("desc").collect();
//   }
// });

// export const listChats = query({
//   args: {
//     projectId: v.optional(v.id("projects"))
//   },
//   handler: async (ctx, { projectId }) => {
//     if (projectId) {
//       // Chats inside a project
//       return await ctx.db
//         .query("chats")
//         .withIndex("by_project", (q) => q.eq("projectId", projectId))
//         .order("desc")
//         .collect();
//     }

//     // 🌍 Chats NOT in any project (global chats)
//     return await ctx.db
//       .query("chats")
//       .withIndex("by_project", (q) => q.eq("projectId", undefined))
//       .order("desc")
//       .collect();
//   }
// });

export const listChats = query({
  args: {
    projectId: v.optional(v.id("projects"))
  },
  handler: async (ctx, { projectId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    if (projectId) {
      // Chats inside a project - filtered by user
      return await ctx.db
        .query("chats")
        .withIndex("by_project", (q) => q.eq("projectId", projectId))
        .filter((q) => q.eq(q.field("userId"), identity.subject))
        .order("desc")
        .collect();
    }

    // 🌍 Global chats (NOT in any project) - filtered by user
    return await ctx.db
      .query("chats")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .filter((q) => q.eq(q.field("projectId"), undefined))
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

// });

export const renameChat = mutation({
  args: {
    id: v.id("chats"),
    title: v.string()
  },
  handler: async (ctx, { id, title }) => {
    await ctx.db.patch(id, { title });
  }
});

// });

// export const searchChats = query(
//   async (
//     { db },
//     {
//       projectId,
//       search
//     }: {
//       projectId?: Id<"projects">;
//       search: string;
//     }
//   ) => {
//     let chatQuery = db.query("chats");

//     if (projectId) {
//       chatQuery = chatQuery.filter((c) =>
//         c.eq(c.field("projectId"), projectId)
//       );
//     }

//     const chats = await chatQuery.collect();

//     if (!search) return chats;

//     const lowerSearch = search.toLowerCase();
//     return chats.filter((chat) =>
//       chat.title.toLowerCase().includes(lowerSearch)
//     );
//   }
// );

export const searchChats = query(
  async (
    ctx,
    {
      projectId,
      search
    }: {
      projectId?: Id<"projects">;
      search: string;
    }
  ) => {
    // ✅ Get the currently logged-in user
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return []; // Not authenticated, return empty

    // ✅ Start query scoped to userId
    let chatQuery = ctx.db
      .query("chats")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject));

    // ✅ Optionally filter by project
    if (projectId) {
      chatQuery = chatQuery.filter((c) =>
        c.eq(c.field("projectId"), projectId)
      );
    }

    const chats = await chatQuery.collect();

    // ✅ Filter by search term if provided
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
