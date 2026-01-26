import { NextRequest } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

export const runtime = "nodejs";
const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(req: NextRequest) {
  try {
    const { gptId, openaiFileId } = await req.json(); // ✅ Changed from fileName to openaiFileId

    if (!gptId || !openaiFileId) {
      return Response.json(
        { error: "Missing gptId or openaiFileId" },
        { status: 400 }
      );
    }

    // ✅ Call Convex mutation to remove PDF from GPT
    await convex.mutation(api.gpts.removePdfFromGpt, {
      gptId,
      openaiFileId // ✅ Now matches what's being sent
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error("[DELETE PDF ERROR]", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Delete failed" },
      { status: 500 }
    );
  }
}
