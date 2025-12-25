import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export type ResolvedGpt = {
  model: string;
  systemPrompt: string;
  apiKey?: string;
};

export async function resolveGptFromDb(
  gptId?: string
): Promise<ResolvedGpt | null> {
  if (!gptId) return null;

  const gpt = await convex.query(api.gpts.getGpt, { gptId });

  if (!gpt) return null;

  return {
    model: gpt.model,
    systemPrompt: gpt.systemPrompt,
    apiKey: gpt.apiKey
  };
}
