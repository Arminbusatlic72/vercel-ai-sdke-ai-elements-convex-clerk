import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * GENERAL SETTINGS FUNCTIONS
 * These handle default API key and system prompt for all GPTs
 */

// Get general settings (single record with ID "default")
export const getGeneralSettings = query({
  args: {},
  handler: async ({ db }) => {
    return await db
      .query("generalSettings")
      .withIndex("by_settingsId", (q) => q.eq("settingsId", "default"))
      .first();
  }
});

// Create or update general settings
// export const upsertGeneralSettings = mutation({
//   args: {
//     defaultApiKey: v.optional(v.string()),
//     defaultSystemPrompt: v.optional(v.string()),
//     userId: v.string()
//   },
//   handler: async ({ db }, { defaultApiKey, defaultSystemPrompt, userId }) => {
//     const now = Date.now();

//     // Check if settings already exist
//     const existing = await db
//       .query("generalSettings")
//       .withIndex("by_settingsId", (q) => q.eq("settingsId", "default"))
//       .first();

//     const settingsData = {
//       settingsId: "default",
//       defaultApiKey,
//       defaultSystemPrompt,
//       updatedAt: now,
//       updatedBy: userId
//     };

//     if (existing) {
//       await db.patch(existing._id, settingsData);
//       return { status: "updated" };
//     } else {
//       await db.insert("generalSettings", settingsData);
//       return { status: "created" };
//     }
//   }
// });

export const upsertGeneralSettings = mutation({
  args: {
    defaultApiKey: v.optional(v.string()),
    defaultSystemPrompt: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user || user.role !== "admin") {
      throw new Error("Admin only");
    }

    // Save global settings
    const existing = await ctx.db.query("generalSettings").first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        defaultApiKey: args.defaultApiKey,
        defaultSystemPrompt: args.defaultSystemPrompt,
        updatedAt: Date.now()
      });
    } else {
      await ctx.db.insert("generalSettings", {
        settingsId: "default",
        defaultApiKey: args.defaultApiKey,
        defaultSystemPrompt: args.defaultSystemPrompt,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        updatedBy: user.clerkId
      });
    }
  }
});

/**
 * GPT CONFIGURATION FUNCTIONS
 * These handle individual GPT configurations
 */

/**
 * Create or update a GPT config by gptId
 * (Prevents duplicates)
 */
// convex/gpts.ts

export const upsertGpt = mutation({
  args: {
    gptId: v.string(),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    model: v.string(),
    systemPrompt: v.string(),
    apiKey: v.optional(v.string()),
    // ADD THIS LINE BELOW:
    packageId: v.optional(v.id("packages"))
  },
  handler: async (ctx, args) => {
    const { gptId, ...fields } = args;

    const existing = await ctx.db
      .query("gpts")
      .withIndex("by_gptId", (q) => q.eq("gptId", gptId))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        ...fields,
        updatedAt: Date.now()
      });
      return existing._id;
    }

    return await ctx.db.insert("gpts", {
      gptId,
      ...fields,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
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
// export const listGpts = query({
//   handler: async ({ db }) => {
//     return await db.query("gpts").collect();
//   }
// });

export const listGpts = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("gpts").collect();
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

/**
 * PDF MANAGEMENT FUNCTIONS
 * These handle PDF file associations with GPTs
 */

// export const addPdfToGpt = mutation({
//   args: {
//     gptId: v.string(),
//     vectorStoreId: v.string(),
//     fileName: v.string(),
//     openaiFileId: v.string()
//   },
//   handler: async ({ db }, args) => {
//     const gpt = await db
//       .query("gpts")
//       .withIndex("by_gptId", (q) => q.eq("gptId", args.gptId))
//       .first();

//     if (!gpt) throw new Error("GPT not found");

//     const pdfFiles = gpt.pdfFiles ?? [];

//     await db.patch(gpt._id, {
//       vectorStoreId: args.vectorStoreId,
//       pdfFiles: [
//         ...pdfFiles,
//         {
//           fileName: args.fileName,
//           openaiFileId: args.openaiFileId,
//           uploadedAt: Date.now()
//         }
//       ],
//       updatedAt: Date.now()
//     });
//   }
// });

// export const removePdfFromGpt = mutation({
//   args: {
//     gptId: v.string(),
//     openaiFileId: v.string()
//   },
//   handler: async ({ db }, { gptId, openaiFileId }) => {
//     const gpt = await db
//       .query("gpts")
//       .withIndex("by_gptId", (q) => q.eq("gptId", gptId))
//       .first();

//     if (!gpt) throw new Error("GPT not found");

//     const updatedFiles = (gpt.pdfFiles || []).filter(
//       (pdf: any) => pdf.openaiFileId !== openaiFileId
//     );

//     await db.patch(gpt._id, {
//       pdfFiles: updatedFiles
//     });
//   }
// });

/**
 * HELPER FUNCTIONS
 * These combine general settings with GPT-specific settings
 */
// convex/gpts.ts

// ✅ UPDATE this mutation (add new fields)
export const addPdfToGpt = mutation({
  args: {
    gptId: v.string(),
    vectorStoreId: v.string(),
    fileName: v.string(),
    openaiFileId: v.string(),
    convexStorageId: v.id("_storage"), // ✅ ADD THIS
    fileSize: v.number() // ✅ ADD THIS
  },
  handler: async ({ db }, args) => {
    const gpt = await db
      .query("gpts")
      .withIndex("by_gptId", (q) => q.eq("gptId", args.gptId))
      .first();

    if (!gpt) throw new Error("GPT not found");

    const pdfFiles = gpt.pdfFiles ?? [];

    await db.patch(gpt._id, {
      vectorStoreId: args.vectorStoreId,
      pdfFiles: [
        ...pdfFiles,
        {
          fileName: args.fileName,
          openaiFileId: args.openaiFileId,
          convexStorageId: args.convexStorageId, // ✅ ADD THIS
          fileSize: args.fileSize, // ✅ ADD THIS
          uploadedAt: Date.now()
        }
      ],
      updatedAt: Date.now()
    });
  }
});

// ✅ UPDATE this mutation (delete from Convex Storage too)
export const removePdfFromGpt = mutation({
  args: {
    gptId: v.string(),
    openaiFileId: v.string()
  },
  handler: async ({ db, storage }, { gptId, openaiFileId }) => {
    const gpt = await db
      .query("gpts")
      .withIndex("by_gptId", (q) => q.eq("gptId", gptId))
      .first();

    if (!gpt) throw new Error("GPT not found");

    // ✅ Find the file to delete
    const fileToDelete = (gpt.pdfFiles || []).find(
      (pdf: any) => pdf.openaiFileId === openaiFileId
    );

    // ✅ Delete from Convex storage
    if (fileToDelete?.convexStorageId) {
      try {
        await storage.delete(fileToDelete.convexStorageId);
        console.log(`[Convex Storage] Deleted file: ${fileToDelete.fileName}`);
      } catch (error) {
        console.error("[Convex Storage] Delete error:", error);
        // Continue even if storage delete fails
      }
    }

    // Remove from metadata
    const updatedFiles = (gpt.pdfFiles || []).filter(
      (pdf: any) => pdf.openaiFileId !== openaiFileId
    );

    await db.patch(gpt._id, {
      pdfFiles: updatedFiles
    });
  }
});
// Get combined settings for a specific GPT (used in chat API)
export const getGptWithDefaults = query({
  args: {
    gptId: v.string()
  },
  handler: async ({ db }, { gptId }) => {
    // Get general settings
    const generalSettings = await db
      .query("generalSettings")
      .withIndex("by_settingsId", (q) => q.eq("settingsId", "default"))
      .first();

    // Get specific GPT config
    const gpt = await db
      .query("gpts")
      .withIndex("by_gptId", (q) => q.eq("gptId", gptId))
      .first();

    if (!gpt) {
      return null;
    }

    // Combine general settings with GPT-specific settings
    return {
      ...gpt,
      // Use GPT-specific API key if provided, otherwise use default
      effectiveApiKey: gpt.apiKey || generalSettings?.defaultApiKey,
      // Combine system prompts
      combinedSystemPrompt: generalSettings?.defaultSystemPrompt
        ? `${generalSettings.defaultSystemPrompt}\n\n${gpt.systemPrompt}`
        : gpt.systemPrompt,
      // Include general settings for reference
      generalSettings
    };
  }
});
// export const getGPTsForUserPackage = query({
//   handler: async (ctx) => {
//     const identity = await ctx.auth.getUserIdentity();
//     if (!identity) return [];

//     const user = await ctx.db
//       .query("users")
//       .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
//       .first();

//     if (!user || !user.subscription?.plan) return [];

//     // Get user's package
//     const userPackage = await ctx.db
//       .query("packages")
//       .withIndex("by_key", (q) => q.eq("key", user.subscription.plan))
//       .first();

//     if (!userPackage) return [];

//     // Get all GPTs assigned to this package
//     return await ctx.db
//       .query("gpts")
//       .filter((q) => q.eq(q.field("packageId"), userPackage._id))
//       .collect();
//   }
// });

export const getGPTsForUserPackage = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user || !user.subscription) return [];

    const plan = user.subscription.plan;

    const userPackage = await ctx.db
      .query("packages")
      .withIndex("by_key", (q) => q.eq("key", plan))
      .first();

    if (!userPackage) return [];

    return await ctx.db
      .query("gpts")
      .filter((q) => q.eq(q.field("packageId"), userPackage._id))
      .collect();
  }
});

export const getUserGpts = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user || !user.subscription) return [];

    const { status, currentPeriodEnd, gptIds } = user.subscription;
    const now = Date.now();

    if (
      !["active", "trialing"].includes(status) ||
      (currentPeriodEnd && currentPeriodEnd < now)
    ) {
      return [];
    }

    const gpts = await Promise.all(
      gptIds.map((gptId) =>
        ctx.db
          .query("gpts")
          .withIndex("by_gptId", (q) => q.eq("gptId", gptId))
          .unique()
      )
    );

    return gpts.filter(Boolean);
  }
});
