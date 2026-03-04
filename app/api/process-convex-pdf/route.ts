// app/api/process-convex-pdf/route.ts (NEW FILE)

import { NextRequest } from "next/server";
import OpenAI from "openai";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { auth } from "@clerk/nextjs/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { getToken } = await auth();
    const convexToken =
      (await getToken({ template: "convex" })) ??
      (await getToken()) ??
      undefined;

    const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!, {
      auth: convexToken
    });

    const { gptId, projectId, storageId, fileName, fileSize } =
      await req.json();

    if ((!gptId && !projectId) || !storageId || !fileName) {
      return Response.json(
        { error: "Missing required fields (gptId or projectId required)" },
        { status: 400 }
      );
    }

    if (projectId && !convexToken) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }

    console.log(`[Process PDF] Starting for ${fileName} (${fileSize} bytes)`);

    let vectorStoreId: string | undefined;
    let resolvedGptId: string | undefined = gptId;

    // ✅ Resolve API key + vector store from GPT or Project
    let gpt: any = null;
    let project: any = null;

    if (gptId) {
      gpt = await convex.query(api.gpts.getGpt, { gptId });
      if (!gpt) {
        return Response.json({ error: "GPT not found" }, { status: 404 });
      }
      vectorStoreId = gpt.vectorStoreId;
    }

    if (projectId) {
      project = await convex.query(api.project.getProject, { id: projectId });
      if (!project) {
        return Response.json({ error: "Project not found" }, { status: 404 });
      }
      vectorStoreId = project.vectorStoreId;
      resolvedGptId = resolvedGptId ?? project.gptId;
      if (!gpt && resolvedGptId) {
        gpt = await convex.query(api.gpts.getGpt, { gptId: resolvedGptId });
      }
    }

    const generalSettings = await convex.query(api.gpts.getGeneralSettings, {});
    const apiKey = gpt?.apiKey || generalSettings?.defaultApiKey;

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

    if (!vectorStoreId) {
      console.log(
        `[Vector Store] Creating new vector store for ${projectId ? `project:${projectId}` : `gpt:${gptId}`}`
      );
      const vectorStore = await openai.vectorStores.create({
        name: projectId
          ? `Project-${projectId}-Knowledge`
          : `GPT-${gptId}-Knowledge`
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
    if (projectId) {
      await convex.mutation(api.project.addPdfToProject, {
        projectId,
        vectorStoreId,
        fileName,
        openaiFileId: uploadedFile.id,
        convexStorageId: storageId,
        fileSize
      });
    } else {
      await convex.mutation(api.gpts.addPdfToGpt, {
        gptId,
        vectorStoreId,
        fileName,
        openaiFileId: uploadedFile.id,
        convexStorageId: storageId,
        fileSize
      });
    }

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
