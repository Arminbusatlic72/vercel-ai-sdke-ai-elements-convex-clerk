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

    // ✅ VALIDATE PRICE ID
    if (!priceId) {
      return NextResponse.json({ error: "Missing priceId" }, { status: 400 });
    }

    if (!priceId.startsWith("price_")) {
      console.error(
        `❌ Invalid price ID detected: ${priceId}. Expected format: price_xxxx`
      );
      
      // Check if it looks like a typo
      if (priceId.includes("rice_")) {
        console.error(`   This looks like a typo in environment variables or database (rice_ instead of price_).`);
        console.error(`   Please check .env.local and reseed the packages table.`);
      }
      
      return NextResponse.json(
        {
          error: `Invalid price ID: "${priceId}". Expected format: price_xxxx (must start with "price_")`
        },
        { status: 400 }
      );
    }

    // 1️⃣ Create Stripe subscription
    const result = await convex.action(api.stripe.createSubscription, {
      clerkUserId: userId,
      stripePaymentMethodId: stripePaymentMethodId ?? null,
      priceId,
      email
    });

    // 2️⃣ Save stripeCustomerId immediately (enables webhook lookups)
    await convex.mutation(api.users.saveStripeCustomerId, {
      clerkId: userId,
      stripeCustomerId: result.customerId
    });

    // 3️⃣ Ensure user exists (identity ONLY)
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
