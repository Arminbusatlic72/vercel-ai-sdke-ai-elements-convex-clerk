import { NextRequest } from "next/server";
import OpenAI from "openai";
import { toFile } from "openai/uploads";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

export const runtime = "nodejs";
const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const files = formData.getAll("files") as File[];
    const gptId = formData.get("gptId") as string;

    if (!files.length || !gptId) {
      return Response.json(
        { error: "Missing files or gptId" },
        { status: 400 }
      );
    }

    // ✅ Fetch GPT config with general settings
    const gpt = await convex.query(api.gpts.getGpt, { gptId });
    if (!gpt) {
      return Response.json({ error: "GPT not found" }, { status: 404 });
    }

    // ✅ Fetch general settings
    const generalSettings = await convex.query(api.gpts.getGeneralSettings, {});

    // Priority: GPT-specific API key -> General default API key
    const apiKey = gpt.apiKey || generalSettings?.defaultApiKey;

    if (!apiKey) {
      return Response.json(
        {
          error:
            "No API key configured. Please set a default API key in admin settings or add a GPT-specific API key."
        },
        { status: 400 }
      );
    }

    const openai = new OpenAI({ apiKey });

    // ✅ Create vector store ONLY if it doesn't exist
    let vectorStoreId = gpt.vectorStoreId;

    if (!vectorStoreId) {
      const vectorStore = await openai.vectorStores.create({
        name: `GPT-${gptId}-Knowledge`
      });
      vectorStoreId = vectorStore.id;
    }

    // ✅ Upload & attach each file
    const uploadedFileIds = [];

    for (const file of files) {
      const uploadedFile = await openai.files.create({
        file: await toFile(file, file.name),
        purpose: "assistants"
      });

      await openai.vectorStores.files.create(vectorStoreId, {
        file_id: uploadedFile.id
      });

      uploadedFileIds.push(uploadedFile.id);

      // ✅ Save metadata in Convex
      await convex.mutation(api.gpts.addPdfToGpt, {
        gptId,
        vectorStoreId,
        fileName: file.name,
        openaiFileId: uploadedFile.id
      });
    }

    // Log for debugging
    console.log("[PDF Upload Success]", {
      gptId,
      apiKeySource: gpt.apiKey ? "GPT-specific" : "General default",
      vectorStoreId,
      fileCount: files.length,
      uploadedFiles: files.map((f) => f.name)
    });

    return Response.json({
      success: true,
      vectorStoreId,
      uploadedFiles: files.map((f) => f.name),
      apiKeySource: gpt.apiKey ? "gpt_specific" : "general_default"
    });
  } catch (error) {
    console.error("[PDF Upload] Error:", error);

    // Provide more specific error messages
    let errorMessage = "Upload failed";
    if (error instanceof Error) {
      errorMessage = error.message;

      // Check for specific OpenAI errors
      if (errorMessage.includes("invalid_api_key")) {
        errorMessage =
          "Invalid API key. Please check your API key configuration.";
      } else if (errorMessage.includes("insufficient_quota")) {
        errorMessage = "API key has insufficient quota.";
      } else if (errorMessage.includes("rate_limit")) {
        errorMessage = "Rate limit exceeded. Please try again later.";
      }
    }

    return Response.json({ error: errorMessage }, { status: 500 });
  }
}
