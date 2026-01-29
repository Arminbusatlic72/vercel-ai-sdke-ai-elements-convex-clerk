import { headers } from "next/headers";
import { NextResponse } from "next/server";
import Stripe from "stripe";

export const runtime = "nodejs";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-12-15.clover"
});

export async function POST(request: Request) {
  const body = await request.text();
  const signature = (await headers()).get("stripe-signature")!;

  if (!signature) {
    return NextResponse.json(
      { error: "Missing stripe-signature" },
      { status: 400 }
    );
  }

  try {
    // ✅ Step 1: Verify the Stripe webhook signature
    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );

    console.log(`✅ Verified Stripe event: ${event.type}`);

    // ✅ Step 2: Forward the event to Convex HTTP action
    await fetch(`${process.env.NEXT_PUBLIC_CONVEX_URL}/stripe/webhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(event)
    });

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error(`❌ Webhook error:`, error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
