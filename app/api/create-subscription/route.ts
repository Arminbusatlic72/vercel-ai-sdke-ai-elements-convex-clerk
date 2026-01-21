// app/api/create-subscription/route.ts
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { stripePaymentMethodId, priceId, email } = await request.json();

    // 1️⃣ Create Stripe subscription
    const result = await convex.action(api.stripe.createSubscription, {
      clerkUserId: userId,
      stripePaymentMethodId: stripePaymentMethodId ?? null,
      priceId,
      email
    });

    // 2️⃣ Ensure user exists (identity ONLY)
    const user = await convex.query(api.users.getUserByClerkId, {
      clerkId: userId
    });

    if (!user) {
      await convex.mutation(api.users.createUser, {
        clerkId: userId,
        email,
        stripeCustomerId: result.customerId
      });
    }

    // ❗ STOP HERE
    // Subscription MUST be handled by Stripe webhook

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("API Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
