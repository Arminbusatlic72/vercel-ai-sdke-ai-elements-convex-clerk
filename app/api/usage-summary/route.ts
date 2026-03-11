import { auth } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { NextResponse } from "next/server";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

const DEFAULT_SUMMARY = {
  minuteWindowStart: 0,
  hourWindowStart: 0,
  monthlyWindowStart: 0,
  minuteRequests: 0,
  hourRequests: 0,
  monthlyRequests: 0,
  monthlyMessages: 0,
  monthlyImages: 0
};

export async function GET() {
  try {
    const { userId, getToken } = await auth();
    if (!userId) {
      return new NextResponse(
        JSON.stringify({ error: "Authentication required" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const convexToken =
      (await getToken({ template: "convex" })) ??
      (await getToken()) ??
      undefined;
    const authedConvex = new ConvexHttpClient(
      process.env.NEXT_PUBLIC_CONVEX_URL!,
      {
        auth: convexToken
      }
    );

    const usageSummary = await authedConvex.query(
      api.aiUsage.getUsageSummary,
      {}
    );
    return NextResponse.json(usageSummary ?? DEFAULT_SUMMARY);
  } catch (error) {
    console.error("[USAGE SUMMARY]", error);
    return new NextResponse(
      JSON.stringify({ error: "Unable to load usage summary" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
