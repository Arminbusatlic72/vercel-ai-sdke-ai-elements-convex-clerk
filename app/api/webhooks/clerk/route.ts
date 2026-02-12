import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

export const runtime = "nodejs";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

// ✅ STEP 1: Verify Clerk Signature
async function verifyClerkSignature(
  body: string,
  signature: string
): Promise<void> {
  // Clerk webhook signing key from environment
  const signingSecret = process.env.CLERK_WEBHOOK_SECRET;
  if (!signingSecret) {
    throw new Error("CLERK_WEBHOOK_SECRET not configured");
  }

  // Clerk uses a simple HMAC-SHA256 signature verification
  // Format: timestamp.signature where signature is hex(hmac-sha256(body, secret))
  const [timestamp, providedSignature] = signature.split(".");

  if (!timestamp || !providedSignature) {
    throw new Error("Invalid Clerk webhook signature format");
  }

  // Verify timestamp is within 5 minutes (prevent replay attacks)
  const messageTimestamp = parseInt(timestamp, 10);
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - messageTimestamp) > 300) {
    throw new Error("Webhook timestamp too old (replay attack)");
  }

  // Create HMAC signature
  const crypto = await import("crypto");
  const signed = `${timestamp}.${body}`;
  const expectedSignature = crypto
    .createHmac("sha256", signingSecret)
    .update(signed)
    .digest("hex");

  if (providedSignature !== expectedSignature) {
    throw new Error("Clerk webhook signature verification failed");
  }
}

// ✅ STEP 2: Route Handler
export async function POST(request: Request) {
  const body = await request.text();
  const headersList = await headers();
  const signature = headersList.get("svix-signature")!;

  try {
    // Verify Clerk signature
    await verifyClerkSignature(body, signature);
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
      const pending = await convex.query(
        api.webhooks.getPendingSubscriptionByEmail,
        { email }
      );

      if (pending) {
        console.log(
          `  → Found pending subscription for ${email} (stripeId: ${pending.stripeSubscriptionId})`
        );

        // Claim the pending subscription
        const result = await convex.mutation(
          api.webhooks.claimPendingSubscriptionByEmail,
          {
            email,
            clerkUserId: clerkId
          }
        );

        if (result.success) {
          console.log(`  ✅ Claimed pending subscription for ${email}`);
          claimed++;
        }
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
