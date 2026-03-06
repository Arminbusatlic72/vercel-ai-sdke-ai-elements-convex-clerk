// // convex/stripe.ts - FIXED VERSION
import { v } from "convex/values";
import { action, query, mutation, internalMutation } from "./_generated/server";
import { api } from "./_generated/api";
import Stripe from "stripe";

type SubscriptionStatus =
  | "active"
  | "canceled"
  | "past_due"
  | "trialing"
  | "incomplete"
  | "incomplete_expired"
  | "unpaid"
  | "paused";

type CreateSubscriptionResult = {
  success: true;
  subscriptionId: string;
  clientSecret: string | null;
  requiresAction: boolean;
  status: Stripe.Subscription.Status;
};

// Initialize Stripe with environment variable
const getStripe = () => {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY is not set in environment variables");
  }
  return new Stripe(secretKey, {
    apiVersion: "2025-12-15.clover"
  });
};

// Define your subscription packages
const SUBSCRIPTION_PACKAGES = {
  sandbox: {
    plan: "sandbox" as const,
    maxGpts: 12,
    gptIds: Array.from({ length: 12 }, (_, i) => `gpu-${i + 1}`),
    aiCredits: 50000,
    price: 500,
    name: "SandBox Level"
  },
  clientProject: {
    plan: "clientProject" as const,
    maxGpts: 1,
    gptIds: ["client-project"],
    aiCredits: 1000,
    price: 49,
    name: "Client Project GPTs"
  }
};

/**
 * Resolves package config from database using stripeProductId (preferred)
 * and stripePriceId (fallback).
 */
async function resolvePackageFromStripe(
  ctx: any,
  {
    priceId,
    productId
  }: {
    priceId?: string;
    productId?: string;
  }
): Promise<{
  packageId: any;
  packageKey: string;
  packageName: string;
  plan: string;
  maxGpts: number;
  gptIds: string[];
} | null> {
  let pkg = null;

  if (productId) {
    pkg = await ctx.runQuery(api.packages.getPackageByProductId, {
      stripeProductId: productId
    });
  }

  if (!pkg && priceId) {
    pkg = await ctx.runQuery(api.packages.getPackageByPriceId, {
      stripePriceId: priceId
    });
  }

  if (!pkg) return null;

  const gpts = await ctx.runQuery(api.gpts.getGptsByPackageId, {
    packageId: pkg._id
  });

  const gptIds = gpts.map((g: any) => g.gptId);

  return {
    packageId: pkg._id,
    packageKey: pkg.key,
    packageName: pkg.name,
    plan: pkg.tier,
    maxGpts: pkg.maxGpts ?? gptIds.length,
    gptIds
  };
}

export const createSubscription = action({
  args: {
    clerkUserId: v.string(),
    priceId: v.string(),
    email: v.string(),
    stripePaymentMethodId: v.union(v.string(), v.null())
  },
  handler: async (ctx, args) => {
    const stripe = getStripe();
    // Ensure the user exists in Convex before creating a Stripe subscription.
    // If missing, auto-create a minimal user from provided data to avoid webhook race conditions.
    // Prefer using the public query to avoid direct `ctx.db` access issues in some runtimes.
    let existingUser = await ctx.runQuery(api.users.getUserByClerkId, {
      clerkId: args.clerkUserId
    });

    if (!existingUser) {
      // Auto-create a minimal user when missing to avoid webhook race conditions.
      existingUser = await ctx.runMutation(
        api.users.getOrCreateUserFromWebhook,
        {
          clerkId: args.clerkUserId,
          email: args.email,
          name: undefined,
          imageUrl: undefined
        }
      );
    }
    // 1. Find or Create Customer
    let customerId: string;
    const customers = await stripe.customers.list({
      email: args.email,
      limit: 1
    });

    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    } else {
      const customer = await stripe.customers.create({
        email: args.email,
        metadata: { clerkUserId: args.clerkUserId }
      });
      customerId = customer.id;
    }

    // 2. IMPORTANT: Save Customer ID to DB immediately before creating subscription
    await ctx.runMutation(api.users.saveStripeCustomerId, {
      clerkId: args.clerkUserId,
      stripeCustomerId: customerId
    });

    // 3. Create Subscription with METADATA
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: args.priceId }],
      payment_behavior: "default_incomplete",
      payment_settings: { save_default_payment_method: "on_subscription" },
      expand: ["latest_invoice.payment_intent"],
      metadata: {
        clerkUserId: args.clerkUserId // <--- THIS IS THE KEY FIX
      }
    });

    return {
      subscriptionId: subscription.id,
      customerId: customerId,
      clientSecret: (subscription.latest_invoice as any).payment_intent
        ?.client_secret
    };
  }
});
/**
 * Create a portal session for subscription management
 */

/**
 * Create a checkout session for subscription
 */
// In createCheckoutSession action - FIXED

export const updateStripeCustomerId = mutation({
  args: {
    userId: v.id("users"),
    stripeCustomerId: v.string()
  },
  handler: async (ctx, { userId, stripeCustomerId }) => {
    await ctx.db.patch(userId, {
      stripeCustomerId,
      updatedAt: Date.now()
    });
  }
});

export const createCheckoutSession = action({
  args: {
    priceId: v.string(),
    successUrl: v.string(),
    cancelUrl: v.string()
  },
  handler: async (ctx, args) => {
    const stripe = getStripe();

    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    let customerId: string;

    const user = await ctx.runQuery(api.users.getUserByClerkId, {
      clerkId: identity.subject
    });

    if (user?.stripeCustomerId) {
      customerId = user.stripeCustomerId;
    } else {
      const customer = await stripe.customers.create({
        email: identity.email!,
        name: identity.name,
        metadata: { clerkId: identity.subject }
      });
      customerId = customer.id;

      if (user) {
        await ctx.runMutation(api.users.updateStripeCustomerId, {
          clerkId: user._id,
          stripeCustomerId: customerId
        });
      }
    }

    // Create checkout session...
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [{ price: args.priceId, quantity: 1 }],
      mode: "subscription",
      success_url: args.successUrl,
      cancel_url: args.cancelUrl,
      metadata: { clerkId: identity.subject }
    });

    return { url: session.url };
  }
});

/**
 * Webhook Handler to keep DB in sync when payments succeed or fail
 */
export const handleStripeWebhook = action({
  args: {
    signature: v.string(),
    rawBody: v.string()
  },
  handler: async (ctx, args) => {
    const stripe = getStripe();
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(
        args.rawBody,
        args.signature,
        webhookSecret
      );
    } catch (err: any) {
      console.error("❌ Webhook signature verification failed:", err.message);
      throw new Error(`Webhook Error: ${err.message}`);
    }

    console.log(`✅ Received Stripe event: ${event.type}`);

    // Handle different event types
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdate(ctx, subscription);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(ctx, subscription);
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentSucceeded(ctx, invoice);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentFailed(ctx, invoice);
        break;
      }

      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutSessionCompleted(ctx, session);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return { success: true, eventType: event.type };
  }
});

/**
 * Handle subscription creation/update
 */
async function handleSubscriptionUpdate(
  ctx: any,
  stripeSub: Stripe.Subscription
) {
  const stripe = getStripe(); // ✅ Initialize Stripe here

  try {
    const customerId = stripeSub.customer as string;

    // Try to get clerkUserId from metadata (highest priority)
    let clerkUserId = stripeSub.metadata?.clerkUserId;

    // Fallback: Look up user by Stripe customer ID
    if (!clerkUserId) {
      const user = await ctx.runQuery(api.users.getByStripeCustomerId, {
        stripeCustomerId: customerId
      });
      clerkUserId = user?.clerkId;
    }

    if (!clerkUserId) {
      console.error(
        `Could not find clerkUserId for Stripe customer ${customerId}`
      );
      return;
    }

    const price = stripeSub.items.data[0]?.price;
    const priceId = price?.id;

    if (!priceId) {
      console.error("No price ID found in subscription");
      return;
    }

    const productId = (price.product as string) || undefined;

    console.log(
      `🔍 Resolving package for price ID: ${priceId}, product ID: ${productId}`
    );
    const packageData = await resolvePackageFromStripe(ctx, {
      priceId,
      productId
    });
    if (!packageData) {
      console.warn(
        `[resolvePackage] No package found for priceId=${priceId} productId=${productId}`
      );
      return;
    }
    console.log(`✅ Found package:`, packageData);

    // Fetch product name directly from price object
    let productName: string | null = null;
    try {
      if (productId) {
        const product = await stripe.products.retrieve(productId);
        productName = product.name;
        console.log(`📦 Product name: ${productName}`);
      }
    } catch (error) {
      console.warn(`Could not fetch product name:`, error);
    }

    const user = await ctx.runQuery(api.users.getUserByClerkId, {
      clerkId: clerkUserId
    });

    if (user) {
      console.log(
        `✅ Found user, syncing subscription via upsertSubscription...`
      );

      await ctx.runMutation(api.subscriptions.upsertSubscription, {
        userId: user._id,
        clerkUserId,
        stripeData: {
          stripeSubscriptionId: stripeSub.id,
          stripeCustomerId: customerId,
          status: stripeSub.status as SubscriptionStatus,
          productId: price.product as string,
          priceId,
          currentPeriodStart: (stripeSub as any).current_period_start
            ? (stripeSub as any).current_period_start * 1000
            : Date.now(),
          currentPeriodEnd: (stripeSub as any).current_period_end
            ? (stripeSub as any).current_period_end * 1000
            : Date.now(),
          cancelAtPeriodEnd: (stripeSub as any).cancel_at_period_end || false,
          trialEndDate: (stripeSub as any).trial_end
            ? (stripeSub as any).trial_end * 1000
            : undefined
        },
        packageData: {
          packageId: packageData.packageId,
          packageName: packageData.packageName,
          planType: packageData.packageKey || packageData.plan,
          maxGpts: packageData.maxGpts,
          gptIds: packageData.gptIds,
          productName: productName || packageData.packageName || undefined
        }
      });

      console.log(`✅ Subscription updated successfully`);
    } else {
      console.error(`❌ User not found with clerkId: ${clerkUserId}`);
    }
  } catch (error: any) {
    console.error(`❌ Error in handleSubscriptionUpdate:`, error.message);
    console.error(`Stack:`, error.stack);
    throw error;
  }
}

/**
 * Handle subscription deletion
 */
async function handleSubscriptionDeleted(
  ctx: any,
  stripeSub: Stripe.Subscription
) {
  await ctx.runMutation(api.subscriptions.cancelSubscription, {
    stripeSubscriptionId: stripeSub.id,
    status: "canceled",
    canceledAt: Date.now()
  });
}

/**
 * Handle successful payment
 */
async function handlePaymentSucceeded(ctx: any, invoice: Stripe.Invoice) {
  const subscriptionId = invoice.lines.data[0]?.subscription as string | null;

  if (!subscriptionId) return;

  const stripe = getStripe();
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);

  await handleSubscriptionUpdate(ctx, subscription);
}

/**
 * Handle failed payment
 */
async function handlePaymentFailed(ctx: any, invoice: Stripe.Invoice) {
  const subscriptionId = invoice.lines.data[0]?.subscription as string | null;

  if (!subscriptionId) return;

  const stripe = getStripe();
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);

  await handleSubscriptionUpdate(ctx, subscription);
}

/**
 * Handle checkout session completion
 */
async function handleCheckoutSessionCompleted(
  ctx: any,
  session: Stripe.Checkout.Session
) {
  const clerkId = session.metadata?.clerkId;
  if (!clerkId) {
    console.error("No clerkId in session metadata");
    return;
  }

  const subscriptionId = session.subscription as string;
  const stripe = getStripe();

  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    await handleSubscriptionUpdate(ctx, subscription);
  } catch (error) {
    console.error("Failed to retrieve subscription:", error);
  }
}

// --- HELPER QUERIES/MUTATIONS ---

export const getSubscription = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (!user) return null;

    const activeSubscriptions = (
      await ctx.db
        .query("subscriptions")
        .withIndex("by_user_id", (q: any) => q.eq("userId", user._id))
        .collect()
    )
      .filter((sub: any) =>
        ["active", "trialing", "past_due"].includes(sub.status)
      )
      .sort(
        (a: any, b: any) =>
          (b.created ?? b._creationTime) - (a.created ?? a._creationTime)
      );

    const primary = activeSubscriptions[0] ?? null;

    return {
      ["subscription"]: primary
        ? {
            status: primary.status,
            stripeSubscriptionId: primary.stripeSubscriptionId,
            plan: primary.planType,
            productId: primary.productId,
            priceId: primary.priceId,
            productName: primary.productName,
            currentPeriodStart: primary.currentPeriodStart,
            currentPeriodEnd: primary.currentPeriodEnd,
            cancelAtPeriodEnd: primary.cancelAtPeriodEnd,
            maxGpts: primary.maxGpts,
            gptIds: primary.gptIds
          }
        : null,
      aiCredits: user.aiCredits || 0,
      aiCreditsResetAt: user.aiCreditsResetAt,
      canCreateProject:
        user.role === "admin" || (activeSubscriptions?.length ?? 0) > 0,
      plan: primary?.planType || "clientProject",
      role: user.role || "user"
    };
  }
});

export const getByStripeCustomerId = query({
  args: { stripeCustomerId: v.string() },
  handler: async (ctx, args) => {
    const users = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("stripeCustomerId"), args.stripeCustomerId))
      .collect();
    return users.length > 0 ? users[0] : null;
  }
});

/**
 * Cancel subscription
 */
export const cancelSubscription = action({
  args: {},
  handler: async (ctx) => {
    const stripe = getStripe();

    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const activeSubscriptions = await ctx.runQuery(
      api.subscriptions.getUserSubscriptions,
      {
        clerkUserId: identity.subject
      }
    );

    const primary = activeSubscriptions?.[0];
    if (!primary?.stripeSubscriptionId) {
      throw new Error("No active subscription found");
    }

    // Cancel at period end
    const subscription = await stripe.subscriptions.update(
      primary.stripeSubscriptionId,
      { cancel_at_period_end: true }
    );

    await ctx.runMutation(api.subscriptions.upsertSubscription, {
      userId: primary.userId as any,
      clerkUserId: identity.subject,
      stripeData: {
        stripeSubscriptionId: subscription.id,
        stripeCustomerId: primary.stripeCustomerId,
        status: subscription.status as SubscriptionStatus,
        productId: primary.productId,
        priceId: primary.priceId,
        currentPeriodStart: (subscription as any).current_period_start
          ? (subscription as any).current_period_start * 1000
          : primary.currentPeriodStart,
        currentPeriodEnd: (subscription as any).current_period_end
          ? (subscription as any).current_period_end * 1000
          : primary.currentPeriodEnd,
        cancelAtPeriodEnd: (subscription as any).cancel_at_period_end || false
      },
      packageData: {
        planType: primary.planType,
        maxGpts: primary.maxGpts,
        gptIds: primary.gptIds,
        productName: primary.productName
      }
    });

    await ctx.runMutation(api.subscriptions.cancelSubscriptionAtPeriodEnd, {
      stripeSubscriptionId: subscription.id
    });

    return { success: true, canceledAtPeriodEnd: true };
  }
});

/**
 * Reactivate subscription
 */
export const reactivateSubscription = action({
  args: {},
  handler: async (ctx) => {
    const stripe = getStripe();

    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const activeSubscriptions = await ctx.runQuery(
      api.subscriptions.getUserSubscriptions,
      {
        clerkUserId: identity.subject
      }
    );

    const primary = activeSubscriptions?.[0];
    if (!primary?.stripeSubscriptionId) {
      throw new Error("No subscription found");
    }

    // Remove cancel at period end
    const subscription = await stripe.subscriptions.update(
      primary.stripeSubscriptionId,
      { cancel_at_period_end: false }
    );

    await ctx.runMutation(api.subscriptions.upsertSubscription, {
      userId: primary.userId as any,
      clerkUserId: identity.subject,
      stripeData: {
        stripeSubscriptionId: subscription.id,
        stripeCustomerId: primary.stripeCustomerId,
        status: subscription.status as SubscriptionStatus,
        productId: primary.productId,
        priceId: primary.priceId,
        currentPeriodStart: (subscription as any).current_period_start
          ? (subscription as any).current_period_start * 1000
          : primary.currentPeriodStart,
        currentPeriodEnd: (subscription as any).current_period_end
          ? (subscription as any).current_period_end * 1000
          : primary.currentPeriodEnd,
        cancelAtPeriodEnd: (subscription as any).cancel_at_period_end || false
      },
      packageData: {
        planType: primary.planType,
        maxGpts: primary.maxGpts,
        gptIds: primary.gptIds,
        productName: primary.productName
      }
    });

    await ctx.runMutation(api.subscriptions.reactivateSubscription, {
      stripeSubscriptionId: subscription.id
    });

    return { success: true };
  }
});
