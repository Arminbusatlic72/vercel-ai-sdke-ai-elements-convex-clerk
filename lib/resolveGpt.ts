// import { ConvexHttpClient } from "convex/browser";
// import { api } from "@/convex/_generated/api";

// const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

// export type ResolvedGpt = {
//   model: string;
//   systemPrompt: string;
//   apiKey?: string;
// };

// export async function resolveGptFromDb(
//   gptId?: string
// ): Promise<ResolvedGpt | null> {
//   if (!gptId) return null;

//   const gpt = await convex.query(api.gpts.getGpt, { gptId });

//   if (!gpt) return null;

//   return {
//     model: gpt.model,
//     systemPrompt: gpt.systemPrompt,
//     apiKey: gpt.apiKey
//   };
// }

// lib/resolveGpt.ts
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export interface ResolvedGpt {
  gptId: string;
  model: string;
  systemPrompt: string;
  apiKey?: string;
  vectorStoreId?: string;
  pdfFiles?: Array<{
    fileName: string;
    openaiFileId: string;
    uploadedAt: number;
  }>;
}

export async function resolveGptFromDb(
  gptId: string
): Promise<ResolvedGpt | null> {
  try {
    const gpt = await convex.query(api.gpts.getGpt, { gptId });

    if (!gpt) return null;

    return {
      gptId: gpt.gptId,
      model: gpt.model,
      systemPrompt: gpt.systemPrompt ?? "You are a helpful AI assistant.",
      apiKey: gpt.apiKey,
      vectorStoreId: gpt.vectorStoreId,
      pdfFiles: gpt.pdfFiles
    };
  } catch (error) {
    console.error("Error resolving GPT:", error);
    return null;
  }
}

// Optional: Helper to get first PDF file name
export function getFirstPdfFileName(gpt: ResolvedGpt): string | undefined {
  return gpt.pdfFiles?.[0]?.fileName;
}

// Optional: Helper to get all PDF file names
export function getAllPdfFileNames(gpt: ResolvedGpt): string[] {
  return gpt.pdfFiles?.map((f) => f.fileName) ?? [];
}
