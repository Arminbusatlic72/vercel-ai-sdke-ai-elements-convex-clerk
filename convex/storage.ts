// convex/storage.ts (NEW FILE)

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Generate a secure URL for uploading files to Convex Storage
 */
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  }
});

/**
 * Get the URL to access a file from Convex Storage
 */
export const getFileUrl = query({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, { storageId }) => {
    return await ctx.storage.getUrl(storageId);
  }
});

/**
 * Delete a file from Convex Storage
 */
export const deleteFile = mutation({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, { storageId }) => {
    await ctx.storage.delete(storageId);
  }
});
