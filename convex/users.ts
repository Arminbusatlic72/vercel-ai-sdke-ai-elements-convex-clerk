import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const syncCurrentUser = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .first();

    const clerkRole =
      typeof identity.publicMetadata === "object" &&
      identity.publicMetadata !== null &&
      (identity.publicMetadata as { role?: string }).role === "admin"
        ? "admin"
        : "user";

    const role = existingUser?.role ?? clerkRole;

    if (existingUser) {
      await ctx.db.patch(existingUser._id, {
        email: identity.email ?? existingUser.email,
        name: identity.name ?? existingUser.name,
        imageUrl: identity.pictureUrl ?? existingUser.imageUrl,
        role,
        updatedAt: Date.now()
      });

      return await ctx.db.get(existingUser._id);
    }

    const userId = await ctx.db.insert("users", {
      clerkId: identity.subject,
      email: identity.email ?? "",
      name: identity.name,
      imageUrl: identity.pictureUrl,
      role,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });

    return await ctx.db.get(userId);
  }
});

export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    return ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .first();
  }
});
