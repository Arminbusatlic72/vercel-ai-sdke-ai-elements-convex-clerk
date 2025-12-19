import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Create or update a GPT config by gptId
 * (Prevents duplicates)
 */
export const upsertGpt = mutation({
  args: {
    gptId: v.string(),
    model: v.string(),
    apiKey: v.optional(v.string()),
    systemPrompt: v.string()
  },
  handler: async ({ db }, { gptId, model, apiKey, systemPrompt }) => {
    const now = Date.now();

    const existing = await db
      .query("gpts")
      .withIndex("by_gptId", (q) => q.eq("gptId", gptId))
      .first();

    if (existing) {
      await db.patch(existing._id, {
        model,
        apiKey,
        systemPrompt,
        updatedAt: now
      });

      return { status: "updated", gptId };
    }

    await db.insert("gpts", {
      gptId,
      model,
      apiKey,
      systemPrompt,
      createdAt: now,
      updatedAt: now
    });

    return { status: "created", gptId };
  }
});

/**
 * Get a single GPT config (used by API gateway)
 */
export const getGpt = query({
  args: {
    gptId: v.string()
  },
  handler: async ({ db }, { gptId }) => {
    return await db
      .query("gpts")
      .withIndex("by_gptId", (q) => q.eq("gptId", gptId))
      .first();
  }
});

/**
 * List all GPTs (admin dashboard)
 */
export const listGpts = query({
  handler: async ({ db }) => {
    return await db.query("gpts").collect();
  }
});

/**
 * Delete GPT by gptId
 */
export const deleteGpt = mutation({
  args: {
    gptId: v.string()
  },
  handler: async ({ db }, { gptId }) => {
    const existing = await db
      .query("gpts")
      .withIndex("by_gptId", (q) => q.eq("gptId", gptId))
      .first();

    if (!existing) {
      throw new Error(`GPT '${gptId}' not found`);
    }

    await db.delete(existing._id);
    return { status: "deleted", gptId };
  }
});
