import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

export const runtime = "nodejs";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

// ✅ STEP 1: Verify Clerk Signature
async function verifyClerkSignature(
  body: string,
  headersList: Awaited<ReturnType<typeof headers>>
): Promise<void> {
  const { Webhook } = await import("svix");
  const secret = process.env.CLERK_WEBHOOK_SECRET;
  if (!secret) throw new Error("CLERK_WEBHOOK_SECRET not configured");

  const wh = new Webhook(secret);
  wh.verify(body, {
    "svix-id": headersList.get("svix-id")!,
    "svix-timestamp": headersList.get("svix-timestamp")!,
    "svix-signature": headersList.get("svix-signature")!
  });
  return;
}

// ✅ STEP 2: Route Handler
export async function POST(request: Request) {
  const body = await request.text();
  const headersList = await headers();

  try {
    // Verify Clerk signature
    await verifyClerkSignature(body, headersList);
    console.log(`✅ Verified Clerk webhook signature`);

    // Parse webhook event
    const event = JSON.parse(body);
    console.log(`✅ Clerk webhook event: ${event.type}`);

    // Handle events
    const result = await handleClerkEvent(event);

    return NextResponse.json({ received: result.success });
  } catch (error: any) {
    console.error(`❌ Clerk webhook error: ${error.message}`);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

// ✅ STEP 3: Event Router
async function handleClerkEvent(event: any) {
  switch (event.type) {
    case "user.created":
    case "user.updated":
      return await handleUserSignUp(event.data);

    default:
      console.log(`ℹ️ Unhandled Clerk event: ${event.type}`);
      return { success: true };
  }
}

// ✅ STEP 4: Claim Pending Subscriptions
async function handleUserSignUp(userData: any) {
  console.log(`👤 handleUserSignUp: clerkId=${userData.id}`);

  const clerkId = userData.id;
  if (!clerkId) {
    console.warn(`⚠️ No clerkId in user data`);
    return { success: false };
  }

  // Extract all email addresses from the user
  const emails = (userData.email_addresses || [])
    .map((e: any) => e.email)
    .filter((e: any) => e);

  if (emails.length === 0) {
    console.log(`  ℹ️ No email addresses found for user`);
    return { success: true };
  }

  console.log(`  → Checking for pending subscriptions for emails:`, emails);

  // Try to claim pending subscriptions for each email
  let claimed = 0;
  for (const email of emails) {
    try {
      console.log(
        `  [DEBUG] Querying pending subscription for email: ${email}`
      );
      const pending = await convex.query(
        api.webhooks.getPendingSubscriptionByEmail,
        { email }
      );
      console.log(
        `  [DEBUG] Pending subscription result for ${email}:`,
        pending
      );

      if (pending) {
        console.log(
          `  → Found pending subscription for ${email} (stripeId: ${pending.stripeSubscriptionId})`
        );

        // Claim the pending subscription
        console.log(
          `  [DEBUG] Attempting to claim pending subscription for ${email}`
        );
        const result = await convex.mutation(
          api.webhooks.claimPendingSubscriptionByEmail,
          {
            email,
            clerkUserId: clerkId
          }
        );
        console.log(`  [DEBUG] Claim result for ${email}:`, result);

        if (result.success) {
          console.log(`  ✅ Claimed pending subscription for ${email}`);
          claimed++;
        } else {
          console.warn(`  ⚠️ Claim mutation failed for ${email}`);
        }
      } else {
        console.log(`  [DEBUG] No pending subscription found for ${email}`);
      }
    } catch (error) {
      console.warn(
        `  ⚠️ Failed to process pending subscription for ${email}:`,
        error
      );
    }
  }

  if (claimed > 0) {
    console.log(`  ✅ Successfully claimed ${claimed} pending subscription(s)`);
  } else {
    console.log(`  ℹ️ No pending subscriptions found`);
  }

  return { success: true };
}
