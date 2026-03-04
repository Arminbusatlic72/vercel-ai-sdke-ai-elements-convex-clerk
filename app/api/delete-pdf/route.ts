import { NextRequest } from "next/server";
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

    const { gptId, projectId, openaiFileId } = await req.json();

    if ((!gptId && !projectId) || !openaiFileId) {
      return Response.json(
        { error: "Missing gptId/projectId or openaiFileId" },
        { status: 400 }
      );
    }

    if (projectId && !convexToken) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }

    if (projectId) {
      await convex.mutation(api.project.removePdfFromProject, {
        projectId,
        openaiFileId
      });
    } else {
      await convex.mutation(api.gpts.removePdfFromGpt, {
        gptId,
        openaiFileId
      });
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error("[DELETE PDF ERROR]", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Delete failed" },
      { status: 500 }
    );
  }
}
