import { headers } from "next/headers";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

export const runtime = "nodejs";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

type WebhookHandlerResult = {
  success: boolean;
  errorCode?: string;
  message?: string;
  statusCode?: number;
  action?: string;
};

// ✅ STEP 1: Verify Stripe Signature
async function verifyStripeSignature(
  body: Buffer,
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

// ✅ STEP 2: Route Handler with Idempotency
export async function POST(request: Request) {
  const body = Buffer.from(await request.arrayBuffer());
  const headersList = await headers();
  const signature = headersList.get("stripe-signature")!;

  try {
    const event = await verifyStripeSignature(body, signature);
    console.log(`✅ Verified Stripe event: ${event.type} (${event.id})`);

    // 🔴 IDEMPOTENCY CHECK: Skip if already processed
    try {
      const existing = await convex.query(api.webhooks.getWebhookEvent, {
        stripeEventId: event.id
      });

      if (existing && existing.status === "success") {
        console.log(`⚠️ Event ${event.id} already processed, skipping...`);
        return NextResponse.json({ received: true });
      }
    } catch (e) {
      // Query may not exist yet, continue processing
    }

    // Route to appropriate handler
    const result = await handleStripeEvent(event);

    // 🔴 RECORD WEBHOOK PROCESSING
    try {
      await convex.mutation(api.webhooks.recordWebhookEvent, {
        stripeEventId: event.id,
        eventType: event.type,
        status: result.success ? "success" : "failed"
      });
    } catch (e) {
      console.warn("Failed to record webhook event:", e);
    }

    if (!result.success) {
      return NextResponse.json(
        {
          received: false,
          error: result.errorCode ?? "WEBHOOK_FAILED",
          message: result.message ?? "Webhook handling failed",
          ...(result.action ? { action: result.action } : {})
        },
        { status: result.statusCode ?? 400 }
      );
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error(`❌ Webhook error: ${error.message}`);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

// ✅ STEP 3: Event Router
async function handleStripeEvent(
  event: Stripe.Event
): Promise<WebhookHandlerResult> {
  switch (event.type) {
    case "checkout.session.completed":
      return await handleCheckoutSessionCompleted(
        event.data.object as Stripe.Checkout.Session
      );

    case "customer.subscription.created":
      return await handleSubscriptionCreated(
        event.data.object as Stripe.Subscription
      );

    case "customer.subscription.updated":
      return await handleSubscriptionUpdated(
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
      console.log(`ℹ️ Unhandled event: ${event.type}`);
      return { success: true };
  }
}

function isMaxSubscriptionsReachedError(error: unknown): boolean {
  const maybeError = error as any;
  if (maybeError?.data?.code === "MAX_SUBSCRIPTIONS_REACHED") return true;
  if (maybeError?.code === "MAX_SUBSCRIPTIONS_REACHED") return true;

  const raw = JSON.stringify(error);
  return typeof raw === "string" && raw.includes("MAX_SUBSCRIPTIONS_REACHED");
}

async function handleMaxSubscriptionReachedError({
  error,
  eventType,
  subscription,
  clerkUserId,
  triggeredBy
}: {
  error: unknown;
  eventType:
    | "customer.subscription.created"
    | "customer.subscription.updated"
    | "checkout.session.completed"
    | "invoice.payment_succeeded"
    | "invoice.payment_failed";
  subscription: Stripe.Subscription;
  clerkUserId: string;
  triggeredBy: string;
}): Promise<WebhookHandlerResult | null> {
  if (!isMaxSubscriptionsReachedError(error)) {
    return null;
  }

  const shouldAutoCancel = eventType !== "customer.subscription.updated";
  if (shouldAutoCancel) {
    try {
      await stripe.subscriptions.cancel(subscription.id);

      const invoices = await stripe.invoices.list({
        subscription: subscription.id,
        limit: 1
      });

      const latestInvoice = invoices.data[0];
      const latestInvoiceAny = latestInvoice as any;
      const latestPaymentIntentId =
        typeof latestInvoiceAny?.payment_intent === "string"
          ? latestInvoiceAny.payment_intent
          : latestInvoiceAny?.payment_intent?.id;

      if (latestPaymentIntentId && (latestInvoice?.amount_paid ?? 0) > 0) {
        await stripe.refunds.create({
          payment_intent: latestPaymentIntentId,
          reason: "duplicate"
        });
        console.log(
          `[webhook] Auto-refunded over-limit subscription ${subscription.id} for customer ${subscription.customer}`
        );
      } else {
        console.log(
          `[webhook] Auto-canceled over-limit subscription ${subscription.id} (no charge to refund)`
        );
      }

      console.warn("[SUBSCRIPTION_CAP_EXCEEDED]", {
        stripeSubscriptionId: subscription.id,
        stripeCustomerId: subscription.customer,
        clerkUserId,
        timestamp: new Date().toISOString(),
        action: "auto_canceled_and_refunded",
        triggeredBy
      });
    } catch (stripeErr) {
      console.error(
        `[webhook] Failed to auto-cancel/refund over-limit subscription ${subscription.id}:`,
        stripeErr
      );
    }
  }

  return {
    success: false,
    statusCode: 409,
    errorCode: "MAX_SUBSCRIPTIONS_REACHED",
    action: shouldAutoCancel ? "subscription_auto_canceled" : undefined,
    message: shouldAutoCancel
      ? "Maximum of 6 active subscriptions reached; over-limit subscription auto-canceled"
      : "Maximum of 6 active subscriptions reached"
  };
}

// ============================================================================
// SHARED HELPERS
// ============================================================================

/**
 * Backfill Stripe customer metadata if missing.
 * Helps with Squarespace purchases that don't include metadata at creation.
 */
async function backfillStripeCustomerMetadata(
  customerId: string,
  email?: string,
  name?: string
): Promise<void> {
  try {
    const customer = await stripe.customers.retrieve(customerId);
    if ("deleted" in customer && customer.deleted) {
      return; // Customer is deleted, skip
    }

    const stripeCustomer = customer as Stripe.Customer;
    const existingMetadata = stripeCustomer.metadata || {};

    // Only update if email or name is missing and we have values to add
    if (
      (!existingMetadata.email && email) ||
      (!existingMetadata.name && name)
    ) {
      const updatedMetadata = {
        ...existingMetadata,
        ...(email && !existingMetadata.email && { email }),
        ...(name && !existingMetadata.name && { name }),
        ...(email && !existingMetadata.source && { source: "squarespace" })
      };

      await stripe.customers.update(customerId, { metadata: updatedMetadata });
      console.log(
        `  → Backfilled Stripe customer metadata: email=${email || "N/A"}, name=${name || "N/A"}`
      );
    }
  } catch (err) {
    console.warn(`  ⚠️ Failed to backfill customer metadata:`, err);
    // Don't throw — this is best-effort
  }
}

/**
 * Resolve clerkUserId using fallback chain:
 * 1. subscription.metadata.clerkUserId
 * 2. Convex lookup by stripeCustomerId
 * 3. Stripe customer metadata
 * 4. Save as pendingSubscription by email (external purchase)
 *
 * Returns clerkUserId if found, or null if saved as pending.
 */
async function resolveClerkUserId(
  subscription: Stripe.Subscription,
  customerId: string
): Promise<string | null> {
  let clerkUserId = subscription.metadata?.clerkUserId;

  // Fallback 1: Query Convex by stripeCustomerId
  if (!clerkUserId) {
    try {
      const users = await convex.query(api.users.getByStripeCustomerId, {
        stripeCustomerId: customerId
      });
      clerkUserId = users?.[0]?.clerkId;
      if (clerkUserId) {
        console.log(
          `  → Resolved clerkUserId via Convex lookup: ${clerkUserId}`
        );
      }
    } catch (e) {
      console.warn(`  ⚠️ Convex lookup failed:`, e);
    }
  }

  // Fallback 2: Check Stripe customer metadata
  if (!clerkUserId) {
    try {
      const customer = await stripe.customers.retrieve(customerId);
      if (!("deleted" in customer) || !customer.deleted) {
        clerkUserId = (customer as Stripe.Customer).metadata?.clerkUserId;
        if (clerkUserId) {
          console.log(
            `  → Resolved clerkUserId via Stripe metadata: ${clerkUserId}`
          );
        }
      }
    } catch (err) {
      console.warn(`  ⚠️ Stripe customer lookup failed:`, err);
    }
  }

  // Fallback 3: External purchase — save as pending
  if (!clerkUserId) {
    const priceId = subscription.items.data[0]?.price.id;
    const productId = subscription.items.data[0]?.price.product as string;
    const email =
      subscription.metadata?.email || (await getCustomerEmail(customerId));
    const name = subscription.metadata?.name;

    console.log(
      `  → No clerkUserId found — treating as external purchase (email: ${email || "N/A"})`
    );

    // Attempt to backfill Stripe customer metadata for future events
    if (email || name) {
      await backfillStripeCustomerMetadata(
        customerId,
        email || undefined,
        name || undefined
      );
    }

    try {
      await convex.mutation(api.webhooks.savePendingSubscriptionByEmail, {
        email: email ?? "",
        stripeSubscriptionId: subscription.id,
        stripeCustomerId: customerId,
        productId,
        priceId,
        status: subscription.status,
        currentPeriodEnd: subscription.items.data[0].current_period_end
          ? subscription.items.data[0].current_period_end * 1000
          : undefined
      });
      console.log(
        `  ✅ Saved as pending subscription for later claim (email: ${email || "unknown"})`
      );
    } catch (error) {
      console.error(`  ❌ Failed to save pending subscription:`, error);
      throw error;
    }
    return null; // External purchase saved; stop processing
  }

  // Auto-create user if not found
  try {
    await convex.mutation(api.users.getOrCreateUserFromWebhook, {
      clerkId: clerkUserId,
      email: subscription.metadata?.email,
      name: subscription.metadata?.name
    });
    console.log(`  ✅ User ensured/created: ${clerkUserId}`);
  } catch (error) {
    console.error(`  ❌ Failed to ensure user exists:`, error);
    throw error;
  }

  return clerkUserId;
}

/**
 * Core subscription sync called by all handlers.
 * Passes productId + priceId; server computes planType + maxGpts.
 */
async function syncAllSubscriptionUpdates(
  clerkUserId: string,
  subscription: Stripe.Subscription,
  overrides?: {
    status?: string;
    trialEndDate?: number;
    lastPaymentFailedAt?: number;
    paymentFailureGracePeriodEnd?: number;
    maxGpts?: number;
    canceledAt?: number;
  }
): Promise<void> {
  const customerId = subscription.customer as string;
  const priceId = subscription.items.data[0]?.price.id;
  const productId = subscription.items.data[0]?.price.product as string;

  const statusValue = overrides?.status || subscription.status;
  const status = statusValue as
    | "active"
    | "canceled"
    | "past_due"
    | "trialing"
    | "incomplete"
    | "incomplete_expired"
    | "unpaid"
    | "paused";

  console.log(`  → Syncing subscription: status=${status}`);

  if (subscription.cancel_at_period_end && status === "active") {
    console.log(
      `    ⚠️ cancel_at_period_end=true (user retains access until period end)`
    );
  }

  if (subscription.trial_end && subscription.status === "trialing") {
    const trialEndDate = subscription.trial_end * 1000;
    console.log(`    📅 Trial ends: ${new Date(trialEndDate).toISOString()}`);
  }

  let packageData: any = undefined;

  if (productId) {
    const pkg = await convex.query(api.packages.getPackageByProductId, {
      stripeProductId: productId
    });

    if (pkg) {
      const allGpts = await convex.query(api.gpts.listGpts, {});
      const gptIds = allGpts
        .filter((gpt: any) => gpt.packageId === pkg._id)
        .map((gpt: any) => gpt.gptId);

      packageData = {
        packageId: pkg._id,
        packageName: pkg.name,
        planType: pkg.key,
        maxGpts: overrides?.maxGpts ?? pkg.maxGpts,
        gptIds,
        productName: pkg.name
      };
    }
  }

  console.log(
    "[webhook] upsertSubscription called for clerkUserId:",
    clerkUserId
  );

  await convex.mutation(api.subscriptions.upsertSubscription, {
    clerkUserId,
    stripeData: {
      stripeSubscriptionId: subscription.id,
      stripeCustomerId: customerId,
      status,
      productId,
      priceId,
      currentPeriodStart:
        subscription.items.data[0].current_period_start * 1000,
      currentPeriodEnd: subscription.items.data[0].current_period_end * 1000,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      trialEndDate: overrides?.trialEndDate,
      lastPaymentFailedAt: overrides?.lastPaymentFailedAt,
      paymentFailureGracePeriodEnd: overrides?.paymentFailureGracePeriodEnd,
      canceledAt: overrides?.canceledAt
    },
    packageData
  });

  console.log(`  ✅ Subscription synced`);
}

// ============================================================================
// EVENT HANDLERS
// ============================================================================

async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  console.log(`📝 handleSubscriptionCreated: ${subscription.id}`);

  const customerId = subscription.customer as string;
  const clerkUserId = await resolveClerkUserId(subscription, customerId);

  if (clerkUserId === null) {
    // External purchase saved as pending; stop here
    return { success: true };
  }

  try {
    await syncAllSubscriptionUpdates(clerkUserId, subscription);
  } catch (error: any) {
    const handled = await handleMaxSubscriptionReachedError({
      error,
      eventType: "customer.subscription.created",
      subscription,
      clerkUserId,
      triggeredBy: "upsertSubscription"
    });

    if (handled) {
      return handled;
    }

    throw error;
  }

  return { success: true };
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  console.log(`📝 handleSubscriptionUpdated: ${subscription.id}`);

  const customerId = subscription.customer as string;
  const clerkUserId = await resolveClerkUserId(subscription, customerId);

  if (clerkUserId === null) {
    return { success: true };
  }

  try {
    await syncAllSubscriptionUpdates(clerkUserId, subscription);
  } catch (error: any) {
    const handled = await handleMaxSubscriptionReachedError({
      error,
      eventType: "customer.subscription.updated",
      subscription,
      clerkUserId,
      triggeredBy: "upsertSubscription"
    });

    if (handled) {
      return handled;
    }

    throw error;
  }

  return { success: true };
}

// Handle subscription deletion
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  console.log(`🗑️ handleSubscriptionDeleted: ${subscription.id}`);

  const customerId = subscription.customer as string;
  const clerkUserId = await resolveClerkUserId(subscription, customerId);

  if (clerkUserId === null) {
    // External purchase pending; no user to downgrade
    console.log(`  ℹ️ External purchase (pending) — no user to downgrade`);
    return { success: true };
  }

  await convex.mutation(api.subscriptions.cancelSubscription, {
    stripeSubscriptionId: subscription.id,
    status: "canceled",
    canceledAt: Date.now()
  });

  console.log(`  ✅ Subscription marked canceled`);
  return { success: true };
}

// Handle invoice payment succeeded
async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  console.log(`✅ handleInvoicePaymentSucceeded: ${invoice.id}`);

  const subscriptionId = invoice.lines.data[0]?.subscription as string | null;

  if (!subscriptionId) {
    console.log(`  ℹ️ No subscription found on invoice — skipping`);
    return { success: true };
  }

  console.log(`  → Fetching subscription: ${subscriptionId}`);

  let subscription: Stripe.Subscription | null = null;
  let clerkUserId: string | null = null;

  try {
    subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const customerId = subscription.customer as string;
    clerkUserId = await resolveClerkUserId(subscription, customerId);

    if (clerkUserId === null) {
      return { success: true }; // External purchase saved as pending
    }

    await syncAllSubscriptionUpdates(clerkUserId, subscription);
    return { success: true };
  } catch (error) {
    if (subscription) {
      const handled = await handleMaxSubscriptionReachedError({
        error,
        eventType: "invoice.payment_succeeded",
        subscription,
        clerkUserId: clerkUserId ?? "unknown",
        triggeredBy: "upsertSubscription"
      });

      if (handled) {
        return handled;
      }
    }

    console.error(`  ❌ Failed to process payment_succeeded:`, error);
    return { success: false };
  }
}

// Handle invoice payment failed
async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  console.log(`❌ handleInvoicePaymentFailed: ${invoice.id}`);

  const subscriptionId = invoice.lines.data[0]?.subscription as string | null;
  const customerId = invoice.customer as string;

  if (!subscriptionId || !customerId) {
    console.log(`  ℹ️ Missing subscription/customer — skipping`);
    return { success: true };
  }

  console.log(`  → Fetching subscription: ${subscriptionId}`);

  let subscription: Stripe.Subscription | null = null;
  let clerkUserId: string | null = null;

  try {
    subscription = await stripe.subscriptions.retrieve(subscriptionId);
    clerkUserId = await resolveClerkUserId(subscription, customerId);

    if (clerkUserId === null) {
      return { success: true }; // External purchase saved as pending
    }

    // Set 7-day grace period for past_due
    const gracePeriodDays = 7;
    const gracePeriodEnd = Date.now() + gracePeriodDays * 24 * 60 * 60 * 1000;

    console.log(
      `  ⏳ Setting 7-day grace period. Access retained until: ${new Date(gracePeriodEnd).toISOString()}`
    );

    await syncAllSubscriptionUpdates(clerkUserId, subscription, {
      status: "past_due",
      lastPaymentFailedAt: Date.now(),
      paymentFailureGracePeriodEnd: gracePeriodEnd
    });

    return { success: true };
  } catch (error) {
    if (subscription) {
      const handled = await handleMaxSubscriptionReachedError({
        error,
        eventType: "invoice.payment_failed",
        subscription,
        clerkUserId: clerkUserId ?? "unknown",
        triggeredBy: "upsertSubscription"
      });

      if (handled) {
        return handled;
      }
    }

    console.error(`  ❌ Failed to process payment_failed:`, error);
    return { success: false };
  }
}

// ✅ Checkout completion (new subscription from checkout)
async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session
) {
  console.log(`✅ handleCheckoutSessionCompleted: ${session.id}`);

  const subscriptionId = session.subscription as string | null;
  if (!subscriptionId) {
    console.log(`  ℹ️ Not a subscription checkout — skipping`);
    return { success: true };
  }

  console.log(`  → Fetching subscription: ${subscriptionId}`);

  let subscription: Stripe.Subscription | null = null;
  let clerkUserId: string | null = null;

  try {
    subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const customerId = subscription.customer as string;
    clerkUserId = await resolveClerkUserId(subscription, customerId);

    if (clerkUserId === null) {
      return { success: true }; // External purchase saved as pending
    }

    await syncAllSubscriptionUpdates(clerkUserId, subscription);
    return { success: true };
  } catch (error) {
    if (subscription) {
      const handled = await handleMaxSubscriptionReachedError({
        error,
        eventType: "checkout.session.completed",
        subscription,
        clerkUserId: clerkUserId ?? "unknown",
        triggeredBy: "upsertSubscription"
      });

      if (handled) {
        return handled;
      }
    }

    console.error(`  ❌ Failed to process checkout:`, error);
    return { success: false };
  }
}
// Helper: Get customer email from Stripe
async function getCustomerEmail(
  customerId?: string | null
): Promise<string | null> {
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
