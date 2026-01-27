// app/api/process-convex-pdf/route.ts (NEW FILE)

import { NextRequest } from "next/server";
import OpenAI from "openai";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

export const runtime = "nodejs";
const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(req: NextRequest) {
  try {
    const { gptId, storageId, fileName, fileSize } = await req.json();

    if (!gptId || !storageId || !fileName) {
      return Response.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    console.log(`[Process PDF] Starting for ${fileName} (${fileSize} bytes)`);

    // ✅ Get GPT config and API key
    const gpt = await convex.query(api.gpts.getGpt, { gptId });
    if (!gpt) {
      return Response.json({ error: "GPT not found" }, { status: 404 });
    }

    const generalSettings = await convex.query(api.gpts.getGeneralSettings, {});
    const apiKey = gpt.apiKey || generalSettings?.defaultApiKey;

    if (!apiKey) {
      return Response.json({ error: "No API key configured" }, { status: 400 });
    }

    // ✅ Fetch file from Convex Storage
    const fileUrl = await convex.query(api.storage.getFileUrl, { storageId });
    if (!fileUrl) {
      return Response.json(
        { error: "Failed to get file from storage" },
        { status: 500 }
      );
    }

    console.log(`[Convex Storage] Fetching file from: ${fileUrl}`);

    // ✅ Download file from Convex
    const fileResponse = await fetch(fileUrl);
    if (!fileResponse.ok) {
      throw new Error("Failed to fetch file from Convex storage");
    }

    const fileBlob = await fileResponse.blob();
    const file = new File([fileBlob], fileName, { type: fileBlob.type });

    console.log(`[File Downloaded] Size: ${file.size} bytes`);

    // ✅ Upload to OpenAI
    const openai = new OpenAI({ apiKey });

    let vectorStoreId = gpt.vectorStoreId;
    if (!vectorStoreId) {
      console.log(`[Vector Store] Creating new vector store for GPT: ${gptId}`);
      const vectorStore = await openai.vectorStores.create({
        name: `GPT-${gptId}-Knowledge`
      });
      vectorStoreId = vectorStore.id;
      console.log(`[Vector Store] Created: ${vectorStoreId}`);
    }

    console.log(`[OpenAI] Uploading to vector store: ${vectorStoreId}`);

    const uploadedFile = await openai.files.create({
      file: file,
      purpose: "assistants"
    });

    await openai.vectorStores.files.create(vectorStoreId, {
      file_id: uploadedFile.id
    });

    console.log(`[OpenAI] File uploaded: ${uploadedFile.id}`);

    // ✅ Save metadata to Convex
    await convex.mutation(api.gpts.addPdfToGpt, {
      gptId,
      vectorStoreId,
      fileName,
      openaiFileId: uploadedFile.id,
      convexStorageId: storageId,
      fileSize
    });

    console.log(`[Success] PDF processed: ${fileName}`);

    return Response.json({
      success: true,
      openaiFileId: uploadedFile.id,
      vectorStoreId
    });
  } catch (error) {
    console.error("[Process PDF Error]", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Processing failed" },
      { status: 500 }
    );
  }
}
