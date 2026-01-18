// convex/seedGpts.ts
import { mutation } from "./_generated/server";

export const seedGPTs = mutation({
  args: {},
  handler: async (ctx) => {
    const gpts = [
      // SandBox Level GPUs
      {
        gptId: "gpu-1",
        model: "gpt-4",
        systemPrompt: "High-performance GPU 1",
        createdAt: Date.now(),
        updatedAt: Date.now()
      },
      {
        gptId: "gpu-2",
        model: "gpt-4",
        systemPrompt: "High-performance GPU 2",
        createdAt: Date.now(),
        updatedAt: Date.now()
      },
      {
        gptId: "gpu-3",
        model: "gpt-4",
        systemPrompt: "High-performance GPU 3",
        createdAt: Date.now(),
        updatedAt: Date.now()
      },
      {
        gptId: "gpu-4",
        model: "gpt-4",
        systemPrompt: "High-performance GPU 4",
        createdAt: Date.now(),
        updatedAt: Date.now()
      },
      {
        gptId: "gpu-5",
        model: "gpt-4",
        systemPrompt: "High-performance GPU 5",
        createdAt: Date.now(),
        updatedAt: Date.now()
      },
      {
        gptId: "gpu-6",
        model: "gpt-4",
        systemPrompt: "High-performance GPU 6",
        createdAt: Date.now(),
        updatedAt: Date.now()
      },
      {
        gptId: "gpu-7",
        model: "gpt-4",
        systemPrompt: "High-performance GPU 7",
        createdAt: Date.now(),
        updatedAt: Date.now()
      },
      {
        gptId: "gpu-8",
        model: "gpt-4",
        systemPrompt: "High-performance GPU 8",
        createdAt: Date.now(),
        updatedAt: Date.now()
      },
      {
        gptId: "gpu-9",
        model: "gpt-4",
        systemPrompt: "High-performance GPU 9",
        createdAt: Date.now(),
        updatedAt: Date.now()
      },
      {
        gptId: "gpu-10",
        model: "gpt-4",
        systemPrompt: "High-performance GPU 10",
        createdAt: Date.now(),
        updatedAt: Date.now()
      },
      {
        gptId: "gpu-11",
        model: "gpt-4",
        systemPrompt: "High-performance GPU 11",
        createdAt: Date.now(),
        updatedAt: Date.now()
      },
      {
        gptId: "gpu-12",
        model: "gpt-4",
        systemPrompt: "High-performance GPU 12",
        createdAt: Date.now(),
        updatedAt: Date.now()
      },

      // Client Project GPT
      {
        gptId: "client-project",
        model: "gpt-4",
        systemPrompt: "Client project specialist",
        createdAt: Date.now(),
        updatedAt: Date.now()
      },

      // Basic & Pro GPTs
      {
        gptId: "sales",
        model: "gpt-4",
        systemPrompt: "Sales specialist",
        createdAt: Date.now(),
        updatedAt: Date.now()
      },
      {
        gptId: "support",
        model: "gpt-4",
        systemPrompt: "Customer support specialist",
        createdAt: Date.now(),
        updatedAt: Date.now()
      },
      {
        gptId: "content",
        model: "gpt-4",
        systemPrompt: "Content creator",
        createdAt: Date.now(),
        updatedAt: Date.now()
      },
      {
        gptId: "analysis",
        model: "gpt-4",
        systemPrompt: "Data analyst",
        createdAt: Date.now(),
        updatedAt: Date.now()
      },
      {
        gptId: "creative",
        model: "gpt-4",
        systemPrompt: "Creative writer",
        createdAt: Date.now(),
        updatedAt: Date.now()
      },
      {
        gptId: "technical",
        model: "gpt-4",
        systemPrompt: "Technical specialist",
        createdAt: Date.now(),
        updatedAt: Date.now()
      }
    ];

    // Clear existing GPTs
    const existing = await ctx.db.query("gpts").collect();
    for (const gpt of existing) {
      await ctx.db.delete(gpt._id);
    }

    // Insert new GPTs
    for (const gpt of gpts) {
      await ctx.db.insert("gpts", gpt);
    }

    return { success: true, count: gpts.length };
  }
});
