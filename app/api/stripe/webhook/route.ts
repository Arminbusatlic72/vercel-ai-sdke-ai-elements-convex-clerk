import { headers } from "next/headers";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

export const runtime = "nodejs";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

async function verifyStripeSignature(body: string, signature: string) {
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

export async function POST(request: Request) {
  const body = await request.text();
  const headersList = await headers();
  const signature = headersList.get("stripe-signature")!;

  try {
    const event = await verifyStripeSignature(body, signature);

    // Only handle the minimal set required for Squarespace purchases
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(
          event.data.object as Stripe.Checkout.Session,
          event.id
        );
        break;

      case "customer.subscription.created":
      case "customer.subscription.updated":
        await handleSubscriptionEvent(
          event.data.object as Stripe.Subscription,
          event.id
        );
        break;

      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(
          event.data.object as Stripe.Subscription,
          event.id
        );
        break;

      default:
        // Ignore other events
        return NextResponse.json({ received: true });
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error("Stripe webhook error:", err);
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session,
  stripeEventId: string
) {
  // Extract subscription id if present
  const subscriptionId = session.subscription as string | null;
  const email = session.customer_email || session.metadata?.email || null;

  if (!subscriptionId) {
    console.log("Checkout is not a subscription, skipping");
    await convex.mutation(api.webhooks.recordWebhookEvent, {
      stripeEventId,
      eventType: "checkout.session.completed",
      status: "success"
    });
    return;
  }

  // Retrieve subscription to get canonical fields
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);

  const customerId = subscription.customer as string;
  const priceId = subscription.items.data[0]?.price.id || "";
  const status = subscription.status;
  const currentPeriodEnd = subscription.current_period_end
    ? subscription.current_period_end * 1000
    : undefined;

  const resolvedEmail = email || (await getCustomerEmail(customerId));

  await processByEmailOrPending(
    resolvedEmail,
    {
      stripeCustomerId: customerId,
      subscriptionId,
      priceId,
      status,
      currentPeriodEnd
    },
    stripeEventId,
    "checkout.session.completed"
  );
}

async function handleSubscriptionEvent(
  subscription: Stripe.Subscription,
  stripeEventId: string
) {
  const subscriptionId = subscription.id;
  const customerId = subscription.customer as string;
  const priceId = subscription.items.data[0]?.price.id || "";
  const status = subscription.status;
  const currentPeriodEnd = subscription.current_period_end
    ? subscription.current_period_end * 1000
    : undefined;

  // Try to extract email from subscription metadata or customer record
  const emailFromMeta = subscription.metadata?.email;
  const email = emailFromMeta || (await getCustomerEmail(customerId));

  await processByEmailOrPending(
    email,
    {
      stripeCustomerId: customerId,
      subscriptionId,
      priceId,
      status,
      currentPeriodEnd
    },
    stripeEventId,
    "customer.subscription.updated"
  );
}

async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription,
  stripeEventId: string
) {
  const subscriptionId = subscription.id;
  const customerId = subscription.customer as string;
  const priceId = subscription.items.data[0]?.price.id || "";
  const status = "canceled";
  const currentPeriodEnd = subscription.current_period_end
    ? subscription.current_period_end * 1000
    : undefined;

  const email =
    subscription.metadata?.email || (await getCustomerEmail(customerId));

  await processByEmailOrPending(
    email,
    {
      stripeCustomerId: customerId,
      subscriptionId,
      priceId,
      status,
      currentPeriodEnd
    },
    stripeEventId,
    "customer.subscription.deleted"
  );
}

async function getCustomerEmail(customerId?: string | null) {
  if (!customerId) return null;
  try {
    const customer = await stripe.customers.retrieve(customerId);
    if (typeof customer === "object" && !("deleted" in customer)) {
      return (
        (customer as Stripe.Customer).email ||
        (customer as Stripe.Customer).metadata?.email ||
        null
      );
    }
  } catch (e) {
    console.warn("Could not retrieve customer email:", e);
  }
  return null;
}

type SubPayload = {
  stripeCustomerId?: string | null;
  subscriptionId: string;
  priceId?: string;
  status?: string;
  currentPeriodEnd?: number | undefined;
};

async function processByEmailOrPending(
  email: string | null,
  payload: SubPayload,
  stripeEventId: string,
  eventType: string
) {
  if (!email) {
    console.log(
      "No email available for subscription; saving as pending without email"
    );
    // Save pending with empty email so ops can reconcile later
    await convex.mutation(api.webhooks.savePendingSubscriptionByEmail, {
      email: "unknown@example.com",
      stripeSubscriptionId: payload.subscriptionId,
      stripeCustomerId: payload.stripeCustomerId,
      priceId: payload.priceId,
      status: payload.status,
      currentPeriodEnd: payload.currentPeriodEnd
    });
    await convex.mutation(api.webhooks.recordWebhookEvent, {
      stripeEventId,
      eventType,
      status: "pending"
    });
    return;
  }

  // Try to find a Convex user by email
  const user = await convex.query(api.users.getUserByEmail, { email });

  if (user && user.clerkId) {
    // Attach immediately to the existing user
    try {
      const planType = mapPriceToPlanType(payload.priceId || "");
      const maxGpts = mapPlanToMaxGpts(planType);

      await convex.mutation(api.subscriptions.syncSubscriptionFromStripe, {
        clerkUserId: user.clerkId,
        stripeSubscriptionId: payload.subscriptionId,
        stripeCustomerId: payload.stripeCustomerId || "",
        status: (payload.status as any) || "active",
        priceId: payload.priceId || "",
        planType,
        currentPeriodStart: Date.now(),
        currentPeriodEnd: payload.currentPeriodEnd || Date.now(),
        cancelAtPeriodEnd: false,
        maxGpts
      });

      await convex.mutation(api.webhooks.recordWebhookEvent, {
        stripeEventId,
        eventType,
        status: "success"
      });
      return;
    } catch (e) {
      console.error("Failed to sync subscription to Convex:", e);
      await convex.mutation(api.webhooks.recordWebhookEvent, {
        stripeEventId,
        eventType,
        status: "failed"
      });
      return;
    }
  }

  // No user found — save pending subscription keyed by email
  await convex.mutation(api.webhooks.savePendingSubscriptionByEmail, {
    email,
    stripeSubscriptionId: payload.subscriptionId,
    stripeCustomerId: payload.stripeCustomerId,
    priceId: payload.priceId,
    status: payload.status,
    currentPeriodEnd: payload.currentPeriodEnd
  });

  await convex.mutation(api.webhooks.recordWebhookEvent, {
    stripeEventId,
    eventType,
    status: "pending"
  });
}

function mapPriceToPlanType(
  priceId: string
): "sandbox" | "clientProject" | "basic" | "pro" {
  // Minimal mapping: rely on environment variables like other code
  if (!priceId) return "sandbox";
  if (priceId === process.env.STRIPE_PRICE_CLIENT_PROJECT_GPT_MONTHLY)
    return "clientProject";
  if (priceId === process.env.STRIPE_PRICE_BASIC_ID) return "basic";
  if (priceId === process.env.STRIPE_PRICE_PRO_ID) return "pro";
  return "sandbox";
}

function mapPlanToMaxGpts(plan: string) {
  const map: Record<string, number> = {
    sandbox: 12,
    clientProject: 1,
    basic: 3,
    pro: 6
  };
  return map[plan] || 1;
}
