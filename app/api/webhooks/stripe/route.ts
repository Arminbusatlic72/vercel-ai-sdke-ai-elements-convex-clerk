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
  console.log(`🔄 Processing subscription: ${subscription.id}`);

  try {
    // Extract Stripe data
    const customerId = subscription.customer as string;
    const priceId = subscription.items.data[0]?.price.id;

    if (!priceId) throw new Error("No price found in subscription");

    // Determine package from price ID
    const packageKey = getPricePackageMapping(priceId);

    // Get clerkUserId from Stripe metadata
    let clerkUserId = subscription.metadata?.clerkUserId;

    // Fallback 1: If clerkUserId not in metadata, look up user by stripeCustomerId in Convex
    if (!clerkUserId) {
      console.log(
        `⚠️  clerkUserId not in subscription metadata, looking up by stripeCustomerId in Convex...`
      );
      const users = await convex.query(api.users.getByStripeCustomerId, {
        stripeCustomerId: customerId
      });

      if (users && users.length > 0) {
        clerkUserId = users[0].clerkId;
        console.log(`✅ Found clerkUserId from Convex lookup: ${clerkUserId}`);
      } else {
        // Fallback 2: Check Stripe customer object metadata
        console.log(
          `⚠️  No user found in Convex, checking Stripe customer metadata...`
        );
        const customer = await stripe.customers.retrieve(customerId);

        // Check if customer is deleted before accessing metadata
        if ("deleted" in customer && customer.deleted) {
          throw new Error(
            `Customer ${customerId} has been deleted. Cannot retrieve clerkUserId.`
          );
        }

        clerkUserId = (customer as Stripe.Customer).metadata?.clerkUserId;

        if (!clerkUserId) {
          throw new Error(
            `Cannot find clerkUserId for subscription ${subscription.id}. ` +
              `Not in subscription metadata, Convex DB, or Stripe customer metadata. ` +
              `Customer ID: ${customerId}`
          );
        }
        console.log(
          `✅ Found clerkUserId from Stripe customer metadata: ${clerkUserId}`
        );
      }
    }

    // ✅ Call Convex mutation to update database
    await convex.mutation(api.subscriptions.syncSubscriptionFromStripe, {
      clerkUserId,
      stripeSubscriptionId: subscription.id,
      stripeCustomerId: customerId,
      status: subscription.status,
      priceId,
      planType: packageKey, // Pass plan type directly (not packageKey)
      currentPeriodStart: subscription.items.data[0].current_period_start
        ? subscription.items.data[0].current_period_start * 1000
        : Date.now(),
      currentPeriodEnd: subscription.items.data[0].current_period_end
        ? subscription.items.data[0].current_period_end * 1000
        : Date.now() + 30 * 24 * 60 * 60 * 1000,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      maxGpts: packageKey === "pro" ? 6 : 3
    });

    console.log(`✅ User subscription updated in Convex`);
    return { success: true };
  } catch (error) {
    console.error(`❌ Subscription update failed:`, error);
    return { success: false };
  }
}

// Handle subscription deletion
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  console.log(`🗑️ Handling subscription deletion: ${subscription.id}`);

  try {
    const customerId = subscription.customer as string;
    let clerkUserId = subscription.metadata?.clerkUserId;

    // Fallback 1: Look up by stripeCustomerId in Convex
    if (!clerkUserId) {
      const users = await convex.query(api.users.getByStripeCustomerId, {
        stripeCustomerId: customerId
      });

      if (users && users.length > 0) {
        clerkUserId = users[0].clerkId;
      } else {
        // Fallback 2: Check Stripe customer metadata
        const customer = await stripe.customers.retrieve(customerId);

        // Check if customer is deleted before accessing metadata
        if ("deleted" in customer && customer.deleted) {
          throw new Error(
            `Cannot find clerkUserId for deleted subscription ${subscription.id}. Customer is deleted.`
          );
        }

        clerkUserId = (customer as Stripe.Customer).metadata?.clerkUserId;

        if (!clerkUserId) {
          throw new Error(
            `Cannot find clerkUserId for deleted subscription ${subscription.id}`
          );
        }
      }
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
        planType: "sandbox", // ✅ CHANGED from packageKey: "free" to planType: "sandbox"
        currentPeriodStart:
          subscription.items.data[0]?.current_period_start * 1000,
        currentPeriodEnd: subscription.items.data[0]?.current_period_end * 1000,
        cancelAtPeriodEnd: false,
        maxGpts: 0
      });
    }

    console.log(`✅ Subscription ${subscription.id} marked as deleted`);
    return { success: true };
  } catch (error) {
    console.error(`❌ Subscription deletion failed:`, error);
    return { success: false };
  }
}

// Handle invoice payment succeeded
async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  console.log(`💰 Invoice payment succeeded: ${invoice.id}`);

  try {
    // const subscriptionId = invoice.lines.data[0]?.subscription as string | null;
    const subscriptionId =
      (invoice.lines.data.find((l) => l.subscription)?.subscription as
        | string
        | null) ?? null;

    if (!subscriptionId) {
      console.log("⏭️ No subscription for invoice, skipping...");
      return { success: true };
    }

    if (!subscriptionId) {
      console.log(`⏭️ No subscription for invoice, skipping...`);
      return { success: true };
    }

    // Get the subscription
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);

    // Trigger subscription update to sync latest status
    return await handleSubscriptionUpdate(subscription);
  } catch (error) {
    console.error(`❌ Invoice payment processing failed:`, error);
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
      const users = await convex.query(api.users.getByStripeCustomerId, {
        stripeCustomerId: customerId
      });

      if (users && users.length > 0) {
        clerkUserId = users[0].clerkId;
      } else {
        // Fallback 2: Check Stripe customer metadata
        const customer = await stripe.customers.retrieve(customerId);

        // Check if customer is deleted before accessing metadata
        if ("deleted" in customer && customer.deleted) {
          throw new Error(
            `Cannot find clerkUserId for failed invoice ${invoice.id}. Customer is deleted.`
          );
        }

        clerkUserId = (customer as Stripe.Customer).metadata?.clerkUserId;

        if (!clerkUserId) {
          throw new Error(
            `Cannot find clerkUserId for failed invoice ${invoice.id}`
          );
        }
      }
    }

    const priceId = subscription.items.data[0]?.price.id || "";
    const packageKey = getPricePackageMapping(priceId);

    await convex.mutation(api.subscriptions.syncSubscriptionFromStripe, {
      clerkUserId,
      stripeSubscriptionId: subscription.id,
      stripeCustomerId: customerId,
      status: "past_due",
      priceId,
      planType: packageKey, // Pass plan type directly
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
