// app/api/create-subscription/route.ts - FIXED
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";

// ✅ Correct import path - assuming convex is at root level
import { api } from "@/convex/_generated/api";

// ✅ Initialize with environment variable
const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(request: Request) {
  try {
    const authResult = await auth();
    const { userId } = authResult;

    if (!userId) {
      console.log("❌ No user ID found in auth");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("✅ Authenticated user ID:", userId);

    const body = await request.json();
    const { stripePaymentMethodId, priceId, email } = body;

    console.log("Creating subscription for:", email);

    // ✅ Use the correct API endpoint
    const result = await convex.action(api.stripe.createSubscription, {
      clerkUserId: userId,
      stripePaymentMethodId,
      priceId,
      email
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("API Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
