import { headers } from "next/headers";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

export const runtime = "nodejs";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

// ✅ STEP 1: Verify Stripe Signature
async function verifyStripeSignature(
  body: string,
  signature: string
): Promise<Stripe.Event> {
  try {
    return stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    throw new Error(`Signature verification failed: ${err.message}`);
  }
}

// ✅ STEP 2: Route Handler
export async function POST(request: Request) {
  const body = await request.text();
  const headersList = await headers();
  const signature = headersList.get("stripe-signature")!;

  try {
    const event = await verifyStripeSignature(body, signature);
    console.log(`✅ Verified Stripe event: ${event.type}`);

    // Route to appropriate handler
    const result = await handleStripeEvent(event);
    return NextResponse.json({ received: result.success });
  } catch (error: any) {
    console.error(`❌ Webhook error: ${error.message}`);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

// ✅ STEP 3: Event Router
async function handleStripeEvent(event: Stripe.Event) {
  switch (event.type) {
    case "customer.subscription.created":
    case "customer.subscription.updated":
      return await handleSubscriptionUpdate(
        event.data.object as Stripe.Subscription
      );

    case "customer.subscription.deleted":
      return await handleSubscriptionDeleted(
        event.data.object as Stripe.Subscription
      );

    case "invoice.payment_succeeded":
      return await handleInvoicePaymentSucceeded(
        event.data.object as Stripe.Invoice
      );

    case "invoice.payment_failed":
      return await handleInvoicePaymentFailed(
        event.data.object as Stripe.Invoice
      );

    default:
      console.log(`Unhandled event: ${event.type}`);
      return { success: true };
  }
}

// In app/api/webhooks/stripe/route.ts

async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;
  const priceId = subscription.items.data[0]?.price.id;

  let clerkUserId = subscription.metadata?.clerkUserId;

  // Fallback 1: Look up by Stripe customer ID
  if (!clerkUserId) {
    try {
      const users = await convex.query(api.users.getByStripeCustomerId, {
        stripeCustomerId: customerId
      });
      clerkUserId = users?.clerkId;
    } catch (e) {
      // Fallback 2: Check Stripe customer metadata
      try {
        const customer = await stripe.customers.retrieve(customerId);
        if (!("deleted" in customer) || !customer.deleted) {
          clerkUserId = (customer as Stripe.Customer).metadata?.clerkUserId;
        }
      } catch (err) {
        console.warn("Could not retrieve Stripe customer metadata:", err);
      }
    }
  }

  if (!clerkUserId) {
    console.error(
      "❌ Critical: No clerkUserId found for subscription",
      subscription.id
    );
    return { success: false };
  }

  // ✨ NEW: Auto-create user if not found (fixes race condition)
  try {
    await convex.mutation(api.users.getOrCreateUserFromWebhook, {
      clerkId: clerkUserId,
      email: subscription.metadata?.email,
      name: subscription.metadata?.name
    });
  } catch (error) {
    console.error(`❌ Failed to ensure user exists for webhook: ${error}`);
    return { success: false };
  }

  const packageKey = getPricePackageMapping(priceId);

  // ✅ Add logging for cancellation events
  if (subscription.cancel_at_period_end) {
    console.log(
      `⚠️ Subscription ${subscription.id} scheduled for cancellation at period end`
    );
    console.log(
      `   Period ends: ${new Date(subscription.items.data[0].current_period_end * 1000).toISOString()}`
    );
  }

  // ✅ Add logging for reactivation
  if (!subscription.cancel_at_period_end && subscription.status === "active") {
    console.log(
      `✅ Subscription ${subscription.id} reactivated (cancel_at_period_end removed)`
    );
  }

  await convex.mutation(api.subscriptions.syncSubscriptionFromStripe, {
    clerkUserId,
    stripeSubscriptionId: subscription.id,
    stripeCustomerId: customerId,
    status: subscription.status,
    priceId,
    planType: packageKey,
    currentPeriodStart: subscription.items.data[0].current_period_start * 1000,
    currentPeriodEnd: subscription.items.data[0].current_period_end * 1000,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    maxGpts: packageKey === "sandbox" ? 12 : 1
  });

  console.log(
    `✅ Subscription ${subscription.id} synced with cancelAtPeriodEnd: ${subscription.cancel_at_period_end}`
  );

  return { success: true };
}

// Handle subscription deletion
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  console.log(`🗑️ Handling subscription deletion: ${subscription.id}`);

  try {
    const customerId = subscription.customer as string;
    let clerkUserId = subscription.metadata?.clerkUserId;

    // Fallback 1: Look up by stripeCustomerId in Convex
    if (!clerkUserId) {
      try {
        const users = await convex.query(api.users.getByStripeCustomerId, {
          stripeCustomerId: customerId
        });

        if (users) {
          clerkUserId = users.clerkId;
        } else {
          // Fallback 2: Check Stripe customer metadata
          const customer = await stripe.customers.retrieve(customerId);

          // Check if customer is deleted before accessing metadata
          if (!("deleted" in customer) || !customer.deleted) {
            clerkUserId = (customer as Stripe.Customer).metadata?.clerkUserId;
          }
        }
      } catch (err) {
        console.warn("Could not lookup user by Stripe customer:", err);
      }
    }

    if (!clerkUserId) {
      console.warn(
        `⚠️ Cannot find clerkUserId for deleted subscription ${subscription.id}. Skipping.`
      );
      return { success: true }; // Return success to prevent retry
    }

    // ✨ NEW: Ensure user exists (in case it was deleted from DB)
    try {
      await convex.mutation(api.users.getOrCreateUserFromWebhook, {
        clerkId: clerkUserId
      });
    } catch (error) {
      console.error(
        `⚠️ Could not auto-create user for subscription deletion: ${error}`
      );
    }

    const user = await convex.query(api.users.getUserByClerkId, {
      clerkId: clerkUserId
    });

    if (user) {
      // Clear subscription from user record
      await convex.mutation(api.subscriptions.syncSubscriptionFromStripe, {
        clerkUserId,
        stripeSubscriptionId: subscription.id,
        stripeCustomerId: customerId,
        status: "canceled",
        priceId: subscription.items.data[0]?.price.id || "",
        planType: "sandbox",
        currentPeriodStart:
          subscription.items.data[0]?.current_period_start * 1000,
        currentPeriodEnd: subscription.items.data[0]?.current_period_end * 1000,
        cancelAtPeriodEnd: false,
        maxGpts: 0
      });
    } else {
      console.warn(`User ${clerkUserId} not found after deletion attempt`);
    }

    console.log(`✅ Subscription ${subscription.id} marked as deleted`);
    return { success: true };
  } catch (error) {
    console.error(`❌ Subscription deletion failed:`, error);
    return { success: false };
  }
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  console.log(`💰 Invoice payment succeeded: ${invoice.id}`);

  // ✅ New Path for 2025 API versions
  let subscriptionId = (invoice as any).parent?.subscription_details
    ?.subscription as string | null;

  // ✅ Fallback for other versions
  if (!subscriptionId) {
    subscriptionId = (invoice as any).subscription as string | null;
  }

  // ✅ Deep Fallback to line items
  if (!subscriptionId) {
    subscriptionId =
      (invoice.lines?.data.find((l) => l.subscription)
        ?.subscription as string) || null;
  }

  if (!subscriptionId) {
    console.log("⏭️ Truly no subscription found, skipping...");
    return { success: true };
  }

  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    return await handleSubscriptionUpdate(subscription);
  } catch (error) {
    console.error(`❌ Webhook retrieval failed:`, error);
    return { success: false };
  }
}

// Handle invoice payment failed
async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  console.log(`❌ Invoice payment failed: ${invoice.id}`);

  try {
    const subscriptionId = invoice.lines.data[0]?.subscription as string | null;
    const customerId = invoice.customer as string;

    if (!subscriptionId || !customerId) {
      console.log(`⏭️ Missing subscription/customer, skipping...`);
      return { success: true };
    }

    // Get subscription
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);

    // Update to past_due status
    let clerkUserId = subscription.metadata?.clerkUserId;

    if (!clerkUserId) {
      // Fallback 1: Look up by stripeCustomerId in Convex
      try {
        const users = await convex.query(api.users.getByStripeCustomerId, {
          stripeCustomerId: customerId
        });

        if (users) {
          clerkUserId = users.clerkId;
        } else {
          // Fallback 2: Check Stripe customer metadata
          const customer = await stripe.customers.retrieve(customerId);

          // Check if customer is deleted before accessing metadata
          if (!("deleted" in customer) || !customer.deleted) {
            clerkUserId = (customer as Stripe.Customer).metadata?.clerkUserId;
          }
        }
      } catch (err) {
        console.warn("Could not lookup user for payment failure:", err);
      }
    }

    if (!clerkUserId) {
      console.warn(
        `⚠️ Cannot find clerkUserId for payment failure on invoice ${invoice.id}. Skipping.`
      );
      return { success: true };
    }

    // ✨ NEW: Ensure user exists before updating subscription
    try {
      await convex.mutation(api.users.getOrCreateUserFromWebhook, {
        clerkId: clerkUserId,
        email:
          subscription.metadata?.email || (invoice.customer_email ?? undefined)
      });
    } catch (error) {
      console.error(
        `⚠️ Could not auto-create user for payment failure: ${error}`
      );
    }

    const priceId = subscription.items.data[0]?.price.id || "";
    const packageKey = getPricePackageMapping(priceId);

    await convex.mutation(api.subscriptions.syncSubscriptionFromStripe, {
      clerkUserId,
      stripeSubscriptionId: subscription.id,
      stripeCustomerId: customerId,
      status: "past_due",
      priceId,
      planType: packageKey,
      currentPeriodStart: subscription.items.data[0].current_period_start
        ? subscription.items.data[0].current_period_start * 1000
        : Date.now(),
      currentPeriodEnd: subscription.items.data[0].current_period_end
        ? subscription.items.data[0].current_period_end * 1000
        : Date.now() + 30 * 24 * 60 * 60 * 1000,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      maxGpts: packageKey === "pro" ? 6 : 3
    });

    console.log(`✅ Subscription status updated to past_due`);
    return { success: true };
  } catch (error) {
    console.error(`❌ Payment failure handling failed:`, error);
    return { success: false };
  }
}

// Helper: Map Stripe price ID to package (valid schema values)
function getPricePackageMapping(
  priceId: string
): "sandbox" | "clientProject" | "basic" | "pro" {
  // Map environment variable price IDs to valid plan types
  // Valid types: "sandbox", "clientProject", "basic", "pro"
  const mapping: Record<string, "sandbox" | "clientProject" | "basic" | "pro"> =
    {
      // Paid plans
      [process.env.STRIPE_PRICE_SANDBOX_LEVEL_MONTHLY || ""]: "sandbox",
      [process.env.STRIPE_PRICE_CLIENT_PROJECT_GPT_MONTHLY || ""]:
        "clientProject",
      [process.env.STRIPE_PRICE_BASIC_ID || ""]: "basic",
      [process.env.STRIPE_PRICE_PRO_ID || ""]: "pro",

      // Free plans - map to "sandbox" plan type
      [process.env.STRIPE_PRICE_ANALYZING_TRENDS_FREE || ""]: "sandbox",
      [process.env.STRIPE_PRICE_SUMMER_SANDBOX_FREE || ""]: "sandbox",
      [process.env.STRIPE_PRICE_WORKSHOP_SANDBOX_FREE || ""]: "sandbox",
      [process.env.STRIPE_PRICE_CLASSROOM_SPEAKER_FREE || ""]: "sandbox",
      [process.env.STRIPE_PRICE_SUBSTACK_GPT_FREE || ""]: "sandbox"
    };

  const planType = mapping[priceId];

  if (!planType) {
    throw new Error(
      `Cannot map price ID "${priceId}" to a valid plan type. ` +
        `Valid types are: "sandbox", "clientProject", "basic", "pro". ` +
        `Please check that the price ID exists in your Stripe account and is configured in environment variables.`
    );
  }

  return planType;
}
