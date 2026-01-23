// // convex/stripe.ts - FIXED VERSION
// import { v } from "convex/values";
// import { action, query, mutation, internalMutation } from "./_generated/server";
// import { api, internal } from "./_generated/api";
// import Stripe from "stripe";

// type SubscriptionStatus =
//   | "active"
//   | "canceled"
//   | "past_due"
//   | "trialing"
//   | "incomplete"
//   | "incomplete_expired"
//   | "unpaid";

// // Update PlanType to match your packages
// type PlanType = "sandbox" | "clientProject";

// type CreateSubscriptionResult = {
//   success: true;
//   subscriptionId: string;
//   clientSecret: string | null;
//   requiresAction: boolean;
//   status: Stripe.Subscription.Status;
// };

// // Initialize Stripe with environment variable
// const getStripe = () => {
//   const secretKey = process.env.STRIPE_SECRET_KEY;
//   if (!secretKey) {
//     throw new Error("STRIPE_SECRET_KEY is not set in environment variables");
//   }
//   return new Stripe(secretKey, {
//     apiVersion: "2025-12-15.clover"
//   });
// };
// const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
//   apiVersion: "2025-12-15.clover"
// });

// // Define your subscription packages
// const SUBSCRIPTION_PACKAGES = {
//   sandbox: {
//     plan: "sandbox" as const,
//     maxGpts: 12,
//     gptIds: Array.from({ length: 12 }, (_, i) => `gpu-${i + 1}`),
//     aiCredits: 50000,
//     price: 500,
//     name: "SandBox Level"
//   },
//   clientProject: {
//     plan: "clientProject" as const,
//     maxGpts: 1,
//     gptIds: ["client-project"],
//     aiCredits: 1000,
//     price: 49,
//     name: "Client Project GPTs"
//   }
// };

// // Helper to get package from price ID
// const getPackageFromPriceId = (priceId: string) => {
//   // Map price IDs to package keys based on environment variables
//   const priceToKeyMap: Record<string, string> = {
//     [process.env.STRIPE_PRICE_SANDBOX_LEVEL_MONTHLY || ""]: "sandbox-level",
//     [process.env.STRIPE_PRICE_CLIENT_PROJECT_GPT_MONTHLY || ""]:
//       "client-project",
//     [process.env.STRIPE_PRICE_ANALYZING_TRENDS_FREE || ""]: "analyzing-trends",
//     [process.env.STRIPE_PRICE_SUMMER_SANDBOX_FREE || ""]: "sandbox-summer",
//     [process.env.STRIPE_PRICE_WORKSHOP_SANDBOX_FREE || ""]: "sandbox-workshop",
//     [process.env.STRIPE_PRICE_CLASSROOM_SPEAKER_FREE || ""]: "gpts-classroom",
//     [process.env.STRIPE_PRICE_SUBSTACK_GPT_FREE || ""]: "substack-gpt"
//   };

//   const packageKey = priceToKeyMap[priceId];
//   if (!packageKey) {
//     throw new Error(
//       `Unknown price ID: ${priceId}. Expected one of: ${Object.keys(
//         priceToKeyMap
//       )
//         .filter((k) => k)
//         .join(", ")}`
//     );
//   }

//   // Map package keys to plan types and their configurations
//   const packageConfigs: Record<
//     string,
//     { plan: PlanType; maxGpts: number; aiCredits: number }
//   > = {
//     "sandbox-level": {
//       plan: "sandbox",
//       maxGpts: 12,
//       aiCredits: 50000
//     },
//     "client-project": {
//       plan: "clientProject",
//       maxGpts: 1,
//       aiCredits: 1000
//     },
//     "analyzing-trends": {
//       plan: "sandbox",
//       maxGpts: 4,
//       aiCredits: 5000
//     },
//     "sandbox-summer": {
//       plan: "sandbox",
//       maxGpts: 3,
//       aiCredits: 3000
//     },
//     "sandbox-workshop": {
//       plan: "sandbox",
//       maxGpts: 4,
//       aiCredits: 4000
//     },
//     "gpts-classroom": {
//       plan: "sandbox",
//       maxGpts: 1,
//       aiCredits: 1000
//     },
//     "substack-gpt": {
//       plan: "sandbox",
//       maxGpts: 1,
//       aiCredits: 1000
//     }
//   };

//   const config = packageConfigs[packageKey];
//   if (!config) {
//     throw new Error(`No configuration found for package: ${packageKey}`);
//   }

//   return {
//     plan: config.plan,
//     maxGpts: config.maxGpts,
//     gptIds: Array.from({ length: config.maxGpts }, (_, i) => `gpt-${i + 1}`),
//     aiCredits: config.aiCredits,
//     packageKey
//   };
// };

// /**
//  * Main Action to create a subscription.
//  * Handles Customer creation, Payment Method attachment, and Subscription initialization.
//  */

// export const createSubscription = action({
//   args: {
//     clerkUserId: v.string(),
//     stripePaymentMethodId: v.union(v.string(), v.null()),
//     priceId: v.string(),
//     email: v.string()
//   },
//   handler: async (_ctx, args) => {
//     // ─────────────────────────────────────────────
//     // 1️⃣ Validate price ID
//     // ─────────────────────────────────────────────
//     if (!args.priceId.startsWith("price_")) {
//       throw new Error(`Invalid priceId: ${args.priceId}`);
//     }

//     // ─────────────────────────────────────────────
//     // 2️⃣ Load price + package mapping
//     // ─────────────────────────────────────────────
//     const price = await stripe.prices.retrieve(args.priceId);
//     const isFree = price.unit_amount === 0;

//     const packageDetails = getPackageFromPriceId(args.priceId);

//     // ─────────────────────────────────────────────
//     // 3️⃣ Find or create Stripe customer (CRITICAL)
//     // ─────────────────────────────────────────────
//     const existingCustomers = await stripe.customers.search({
//       query: `metadata['clerkUserId']:'${args.clerkUserId}'`,
//       limit: 1
//     });

//     let customer: Stripe.Customer;

//     if (existingCustomers.data.length > 0) {
//       customer = existingCustomers.data[0];

//       // Ensure metadata stays correct
//       await stripe.customers.update(customer.id, {
//         metadata: {
//           clerkUserId: args.clerkUserId,
//           packageKey: packageDetails.packageKey,
//           plan: packageDetails.plan
//         }
//       });
//     } else {
//       customer = await stripe.customers.create({
//         email: args.email,
//         metadata: {
//           clerkUserId: args.clerkUserId,
//           packageKey: packageDetails.packageKey,
//           plan: packageDetails.plan
//         }
//       });
//     }

//     // ─────────────────────────────────────────────
//     // 4️⃣ Prepare subscription params
//     // ─────────────────────────────────────────────
//     const subscriptionParams: Stripe.SubscriptionCreateParams = {
//       customer: customer.id,
//       items: [{ price: args.priceId }],
//       metadata: {
//         clerkUserId: args.clerkUserId,
//         packageKey: packageDetails.packageKey,
//         plan: packageDetails.plan
//       }
//     };

//     // ─────────────────────────────────────────────
//     // 5️⃣ Paid vs Free logic (IMPORTANT)
//     // ─────────────────────────────────────────────
//     if (isFree) {
//       // ✅ Free plans become ACTIVE immediately
//       subscriptionParams.payment_behavior = "allow_incomplete";
//     } else {
//       if (!args.stripePaymentMethodId) {
//         throw new Error("Payment method required for paid subscription");
//       }

//       await stripe.paymentMethods.attach(args.stripePaymentMethodId, {
//         customer: customer.id
//       });

//       await stripe.customers.update(customer.id, {
//         invoice_settings: {
//           default_payment_method: args.stripePaymentMethodId
//         }
//       });

//       subscriptionParams.payment_behavior = "default_incomplete";
//       subscriptionParams.expand = ["latest_invoice.payment_intent"];
//     }

//     // ─────────────────────────────────────────────
//     // 6️⃣ Create subscription
//     // ─────────────────────────────────────────────
//     type ExpandedInvoice = Stripe.Invoice & {
//       payment_intent?: Stripe.PaymentIntent | null;
//     };

//     const subscription = await stripe.subscriptions.create({
//       ...subscriptionParams,
//       expand: ["latest_invoice.payment_intent"]
//     });

//     let paymentIntent: Stripe.PaymentIntent | null = null;

//     const latestInvoice = subscription.latest_invoice;

//     if (latestInvoice && typeof latestInvoice !== "string") {
//       const invoice = latestInvoice as ExpandedInvoice;
//       paymentIntent = invoice.payment_intent ?? null;
//     }

//     // ─────────────────────────────────────────────
//     // 7️⃣ Return ONLY what frontend needs
//     // ─────────────────────────────────────────────
//     return {
//       subscriptionId: subscription.id,
//       customerId: customer.id,
//       status: subscription.status,
//       clientSecret: paymentIntent?.client_secret ?? null,
//       requiresAction: paymentIntent?.status === "requires_action",
//       packageKey: packageDetails.packageKey,
//       plan: packageDetails.plan,
//       maxGpts: packageDetails.maxGpts
//     };
//   }
// });

// /**
//  * Create a portal session for subscription management
//  */

// /**
//  * Create a checkout session for subscription
//  */
// // In createCheckoutSession action - FIXED

// export const updateStripeCustomerId = mutation({
//   args: {
//     userId: v.id("users"),
//     stripeCustomerId: v.string()
//   },
//   handler: async (ctx, { userId, stripeCustomerId }) => {
//     await ctx.db.patch(userId, {
//       stripeCustomerId,
//       updatedAt: Date.now()
//     });
//   }
// });

// export const createCheckoutSession = action({
//   args: {
//     priceId: v.string(),
//     successUrl: v.string(),
//     cancelUrl: v.string()
//   },
//   handler: async (ctx, args) => {
//     const stripe = getStripe();

//     const identity = await ctx.auth.getUserIdentity();
//     if (!identity) throw new Error("Not authenticated");

//     let customerId: string;

//     const user = await ctx.runQuery(api.users.getUserByClerkId, {
//       clerkId: identity.subject
//     });

//     if (user?.stripeCustomerId) {
//       customerId = user.stripeCustomerId;
//     } else {
//       const customer = await stripe.customers.create({
//         email: identity.email!,
//         name: identity.name,
//         metadata: { clerkId: identity.subject }
//       });
//       customerId = customer.id;

//       if (user) {
//         await ctx.runMutation(api.users.updateStripeCustomerId, {
//           clerkId: user._id,
//           stripeCustomerId: customerId
//         });
//       }
//     }

//     // Create checkout session...
//     const session = await stripe.checkout.sessions.create({
//       customer: customerId,
//       line_items: [{ price: args.priceId, quantity: 1 }],
//       mode: "subscription",
//       success_url: args.successUrl,
//       cancel_url: args.cancelUrl,
//       metadata: { clerkId: identity.subject }
//     });

//     return { url: session.url };
//   }
// });

// /**
//  * Webhook Handler to keep DB in sync when payments succeed or fail
//  */
// export const handleStripeWebhook = action({
//   args: {
//     signature: v.string(),
//     rawBody: v.string()
//   },
//   handler: async (ctx, args) => {
//     const stripe = getStripe();
//     const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

//     let event: Stripe.Event;

//     try {
//       event = stripe.webhooks.constructEvent(
//         args.rawBody,
//         args.signature,
//         webhookSecret
//       );
//     } catch (err: any) {
//       console.error("❌ Webhook signature verification failed:", err.message);
//       throw new Error(`Webhook Error: ${err.message}`);
//     }

//     console.log(`✅ Received Stripe event: ${event.type}`);

//     // Handle different event types
//     switch (event.type) {
//       case "customer.subscription.created":
//       case "customer.subscription.updated": {
//         const subscription = event.data.object as Stripe.Subscription;
//         await handleSubscriptionUpdate(ctx, subscription);
//         break;
//       }

//       case "customer.subscription.deleted": {
//         const subscription = event.data.object as Stripe.Subscription;
//         await handleSubscriptionDeleted(ctx, subscription);
//         break;
//       }

//       case "invoice.payment_succeeded": {
//         const invoice = event.data.object as Stripe.Invoice;
//         await handlePaymentSucceeded(ctx, invoice);
//         break;
//       }

//       case "invoice.payment_failed": {
//         const invoice = event.data.object as Stripe.Invoice;
//         await handlePaymentFailed(ctx, invoice);
//         break;
//       }

//       case "checkout.session.completed": {
//         const session = event.data.object as Stripe.Checkout.Session;
//         await handleCheckoutSessionCompleted(ctx, session);
//         break;
//       }

//       default:
//         console.log(`Unhandled event type: ${event.type}`);
//     }

//     return { success: true, eventType: event.type };
//   }
// });

// /**
//  * Handle subscription creation/update
//  */
// async function handleSubscriptionUpdate(
//   ctx: any,
//   subscription: Stripe.Subscription
// ) {
//   try {
//     const customerId = subscription.customer as string;

//     // Try to get clerkUserId from metadata (highest priority)
//     let clerkUserId = subscription.metadata?.clerkUserId;

//     // Fallback: Look up user by Stripe customer ID
//     if (!clerkUserId) {
//       const user = await ctx.runQuery(api.users.getByStripeCustomerId, {
//         stripeCustomerId: customerId
//       });
//       clerkUserId = user?.clerkId;
//     }

//     if (!clerkUserId) {
//       console.error(
//         `Could not find clerkUserId for Stripe customer ${customerId}`
//       );
//       return;
//     }

//     const price = subscription.items.data[0]?.price;
//     const priceId = price?.id;

//     if (!priceId) {
//       console.error("No price ID found in subscription");
//       return;
//     }

//     // Get package details from price ID
//     console.log(`🔍 Looking up package for price ID: ${priceId}`);
//     const packageDetails = getPackageFromPriceId(priceId);
//     console.log(`✅ Found package:`, packageDetails);

//     // Fetch product name directly from price object
//     let productName: string | null = null;
//     try {
//       const productId = price.product as string;
//       if (productId) {
//         const product = await stripe.products.retrieve(productId);
//         productName = product.name;
//         console.log(`📦 Product name: ${productName}`);
//       }
//     } catch (error) {
//       console.warn(`Could not fetch product name:`, error);
//     }

//     const subscriptionData = {
//       status: subscription.status as SubscriptionStatus,
//       stripeSubscriptionId: subscription.id,
//       plan: packageDetails.plan,
//       priceId: priceId,
//       productName: productName || undefined,
//       currentPeriodEnd: (subscription as any).current_period_end
//         ? (subscription as any).current_period_end * 1000
//         : Date.now(),
//       maxGpts: packageDetails.maxGpts,
//       gptIds: packageDetails.gptIds,
//       cancelAtPeriodEnd: (subscription as any).cancel_at_period_end || false
//     };

//     console.log(`📝 Subscription data to save:`, subscriptionData);

//     // Update user subscription in database
//     const user = await ctx.runQuery(api.users.getUserByClerkId, {
//       clerkId: clerkUserId
//     });

//     if (user) {
//       console.log(`✅ Found user, updating subscription...`);
//       await ctx.runMutation(api.users.updateSubscription, {
//         clerkId: clerkUserId,
//         userId: user._id,
//         stripeCustomerId: customerId,
//         subscription: subscriptionData,
//         aiCredits: packageDetails.aiCredits
//       });
//       console.log(`✅ Subscription updated successfully`);
//     } else {
//       console.error(`❌ User not found with clerkId: ${clerkUserId}`);
//     }
//   } catch (error: any) {
//     console.error(`❌ Error in handleSubscriptionUpdate:`, error.message);
//     console.error(`Stack:`, error.stack);
//     throw error;
//   }
// }

// /**
//  * Handle subscription deletion
//  */
// async function handleSubscriptionDeleted(
//   ctx: any,
//   subscription: Stripe.Subscription
// ) {
//   const customerId = subscription.customer as string;

//   const user = await ctx.runQuery(api.users.getByStripeCustomerId, {
//     stripeCustomerId: customerId
//   });

//   if (!user) {
//     console.error(`User with Stripe customer ID ${customerId} not found`);
//     return;
//   }

//   const canceledSubscriptionData = {
//     status: "canceled" as SubscriptionStatus,
//     stripeSubscriptionId: subscription.id,
//     plan: user.subscription?.plan || "clientProject",
//     priceId: user.subscription?.priceId || "",
//     currentPeriodEnd: (subscription as any).current_period_end
//       ? (subscription as any).current_period_end * 1000
//       : Date.now(),
//     maxGpts: user.subscription?.maxGpts || 0,
//     gptIds: user.subscription?.gptIds || [],
//     cancelAtPeriodEnd: true
//   };

//   await ctx.runMutation(internal.users.updateSubscriptionInternal, {
//     clerkId: user.clerkId,
//     stripeCustomerId: customerId,
//     subscription: canceledSubscriptionData,
//     aiCredits: 0 // Reset credits on cancellation
//   });
// }

// /**
//  * Handle successful payment
//  */
// async function handlePaymentSucceeded(ctx: any, invoice: Stripe.Invoice) {
//   // const subscriptionId = invoice.subscription as string;
//   const subscriptionId = invoice.lines.data[0]?.subscription as string | null;

//   // Update subscription to active if it was incomplete
//   await ctx.runMutation(internal.users.updateSubscriptionByStripeId, {
//     stripeSubscriptionId: subscriptionId,
//     status: "active"
//   });
// }

// /**
//  * Handle failed payment
//  */
// async function handlePaymentFailed(ctx: any, invoice: Stripe.Invoice) {
//   // const subscriptionId = invoice.subscription as string;
//   const subscriptionId = invoice.lines.data[0]?.subscription as string | null;

//   // Update subscription to past_due
//   await ctx.runMutation(internal.users.updateSubscriptionByStripeId, {
//     stripeSubscriptionId: subscriptionId,
//     status: "past_due"
//   });
// }

// /**
//  * Handle checkout session completion
//  */
// async function handleCheckoutSessionCompleted(
//   ctx: any,
//   session: Stripe.Checkout.Session
// ) {
//   const clerkId = session.metadata?.clerkId;
//   if (!clerkId) {
//     console.error("No clerkId in session metadata");
//     return;
//   }

//   const subscriptionId = session.subscription as string;
//   const stripe = getStripe();

//   try {
//     const subscription = await stripe.subscriptions.retrieve(subscriptionId);
//     await handleSubscriptionUpdate(ctx, subscription);
//   } catch (error) {
//     console.error("Failed to retrieve subscription:", error);
//   }
// }

// // --- HELPER QUERIES/MUTATIONS ---

// export const getSubscription = query({
//   args: { clerkId: v.string() },
//   handler: async (ctx, args) => {
//     const user = await ctx.db
//       .query("users")
//       .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
//       .first();

//     if (!user) return null;

//     return {
//       subscription: user.subscription,
//       aiCredits: user.aiCredits || 0,
//       aiCreditsResetAt: user.aiCreditsResetAt,
//       canCreateProject:
//         user.role === "admin" || user.subscription?.status === "active",
//       plan: user.subscription?.plan || "clientProject",
//       role: user.role || "user"
//     };
//   }
// });

// export const getByStripeCustomerId = query({
//   args: { stripeCustomerId: v.string() },
//   handler: async (ctx, args) => {
//     const users = await ctx.db
//       .query("users")
//       .filter((q) => q.eq(q.field("stripeCustomerId"), args.stripeCustomerId))
//       .collect();
//     return users.length > 0 ? users[0] : null;
//   }
// });

// /**
//  * Cancel subscription
//  */
// export const cancelSubscription = action({
//   args: {},
//   handler: async (ctx) => {
//     const stripe = getStripe();

//     const identity = await ctx.auth.getUserIdentity();
//     if (!identity) {
//       throw new Error("Not authenticated");
//     }

//     const user = await ctx.runQuery(api.users.getUserByClerkId, {
//       clerkId: identity.subject
//     });

//     if (!user?.subscription?.stripeSubscriptionId) {
//       throw new Error("No active subscription found");
//     }

//     // Cancel at period end
//     const subscription = await stripe.subscriptions.update(
//       user.subscription.stripeSubscriptionId,
//       { cancel_at_period_end: true }
//     );

//     // Update local subscription status
//     await ctx.runMutation(internal.users.updateSubscriptionByStripeId, {
//       stripeSubscriptionId: subscription.id,
//       cancelAtPeriodEnd: (subscription as any).cancel_at_period_end || false,
//       status: subscription.status as SubscriptionStatus
//     });

//     return { success: true, canceledAtPeriodEnd: true };
//   }
// });

// /**
//  * Reactivate subscription
//  */
// export const reactivateSubscription = action({
//   args: {},
//   handler: async (ctx) => {
//     const stripe = getStripe();

//     const identity = await ctx.auth.getUserIdentity();
//     if (!identity) {
//       throw new Error("Not authenticated");
//     }

//     const user = await ctx.runQuery(api.users.getUserByClerkId, {
//       clerkId: identity.subject
//     });

//     if (!user?.subscription?.stripeSubscriptionId) {
//       throw new Error("No subscription found");
//     }

//     // Remove cancel at period end
//     const subscription = await stripe.subscriptions.update(
//       user.subscription.stripeSubscriptionId,
//       { cancel_at_period_end: false }
//     );

//     // Update local subscription status
//     await ctx.runMutation(internal.users.updateSubscriptionByStripeId, {
//       stripeSubscriptionId: subscription.id,
//       cancelAtPeriodEnd: (subscription as any).cancel_at_period_end || false,
//       status: subscription.status as SubscriptionStatus
//     });

//     return { success: true };
//   }
// });

// // convex/stripe.ts - FIXED VERSION
import { v } from "convex/values";
import { action, query, mutation, internalMutation } from "./_generated/server";
import { api, internal } from "./_generated/api";
import Stripe from "stripe";

type SubscriptionStatus =
  | "active"
  | "canceled"
  | "past_due"
  | "trialing"
  | "incomplete"
  | "incomplete_expired"
  | "unpaid";

// Update PlanType to match your packages
type PlanType = "sandbox" | "clientProject";

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

// Helper to get package from price ID
const getPackageFromPriceId = (priceId: string) => {
  // Map price IDs to package keys based on environment variables
  const priceToKeyMap: Record<string, string> = {
    [process.env.STRIPE_PRICE_SANDBOX_LEVEL_MONTHLY || ""]: "sandbox-level",
    [process.env.STRIPE_PRICE_CLIENT_PROJECT_GPT_MONTHLY || ""]:
      "client-project",
    [process.env.STRIPE_PRICE_ANALYZING_TRENDS_FREE || ""]: "analyzing-trends",
    [process.env.STRIPE_PRICE_SUMMER_SANDBOX_FREE || ""]: "sandbox-summer",
    [process.env.STRIPE_PRICE_WORKSHOP_SANDBOX_FREE || ""]: "sandbox-workshop",
    [process.env.STRIPE_PRICE_CLASSROOM_SPEAKER_FREE || ""]: "gpts-classroom",
    [process.env.STRIPE_PRICE_SUBSTACK_GPT_FREE || ""]: "substack-gpt"
  };

  const packageKey = priceToKeyMap[priceId];
  if (!packageKey) {
    throw new Error(
      `Unknown price ID: ${priceId}. Expected one of: ${Object.keys(
        priceToKeyMap
      )
        .filter((k) => k)
        .join(", ")}`
    );
  }

  // Map package keys to plan types and their configurations
  const packageConfigs: Record<
    string,
    { plan: PlanType; maxGpts: number; aiCredits: number }
  > = {
    "sandbox-level": {
      plan: "sandbox",
      maxGpts: 12,
      aiCredits: 50000
    },
    "client-project": {
      plan: "clientProject",
      maxGpts: 1,
      aiCredits: 1000
    },
    "analyzing-trends": {
      plan: "sandbox",
      maxGpts: 4,
      aiCredits: 5000
    },
    "sandbox-summer": {
      plan: "sandbox",
      maxGpts: 3,
      aiCredits: 3000
    },
    "sandbox-workshop": {
      plan: "sandbox",
      maxGpts: 4,
      aiCredits: 4000
    },
    "gpts-classroom": {
      plan: "sandbox",
      maxGpts: 1,
      aiCredits: 1000
    },
    "substack-gpt": {
      plan: "sandbox",
      maxGpts: 1,
      aiCredits: 1000
    }
  };

  const config = packageConfigs[packageKey];
  if (!config) {
    throw new Error(`No configuration found for package: ${packageKey}`);
  }

  return {
    plan: config.plan,
    maxGpts: config.maxGpts,
    gptIds: Array.from({ length: config.maxGpts }, (_, i) => `gpt-${i + 1}`),
    aiCredits: config.aiCredits,
    packageKey
  };
};

/**
 * Main Action to create a subscription.
 * Handles Customer creation, Payment Method attachment, and Subscription initialization.
 */

export const createSubscription = action({
  args: {
    clerkUserId: v.string(),
    stripePaymentMethodId: v.union(v.string(), v.null()),
    priceId: v.string(),
    email: v.string()
  },
  handler: async (_ctx, args) => {
    const stripe = getStripe(); // ✅ Initialize Stripe here

    // ─────────────────────────────────────────────
    // 1️⃣ Validate price ID
    // ─────────────────────────────────────────────
    if (!args.priceId.startsWith("price_")) {
      throw new Error(`Invalid priceId: ${args.priceId}`);
    }

    // ─────────────────────────────────────────────
    // 2️⃣ Load price + package mapping
    // ─────────────────────────────────────────────
    const price = await stripe.prices.retrieve(args.priceId);
    const isFree = price.unit_amount === 0;

    const packageDetails = getPackageFromPriceId(args.priceId);

    // ─────────────────────────────────────────────
    // 3️⃣ Find or create Stripe customer (CRITICAL)
    // ─────────────────────────────────────────────
    const existingCustomers = await stripe.customers.search({
      query: `metadata['clerkUserId']:'${args.clerkUserId}'`,
      limit: 1
    });

    let customer: Stripe.Customer;

    if (existingCustomers.data.length > 0) {
      customer = existingCustomers.data[0];

      // Ensure metadata stays correct
      await stripe.customers.update(customer.id, {
        metadata: {
          clerkUserId: args.clerkUserId,
          packageKey: packageDetails.packageKey,
          plan: packageDetails.plan
        }
      });
    } else {
      customer = await stripe.customers.create({
        email: args.email,
        metadata: {
          clerkUserId: args.clerkUserId,
          packageKey: packageDetails.packageKey,
          plan: packageDetails.plan
        }
      });
    }

    // ─────────────────────────────────────────────
    // 4️⃣ Prepare subscription params
    // ─────────────────────────────────────────────
    const subscriptionParams: Stripe.SubscriptionCreateParams = {
      customer: customer.id,
      items: [{ price: args.priceId }],
      metadata: {
        clerkUserId: args.clerkUserId,
        packageKey: packageDetails.packageKey,
        plan: packageDetails.plan
      }
    };

    // ─────────────────────────────────────────────
    // 5️⃣ Paid vs Free logic (IMPORTANT)
    // ─────────────────────────────────────────────
    if (isFree) {
      // ✅ Free plans become ACTIVE immediately
      subscriptionParams.payment_behavior = "allow_incomplete";
    } else {
      if (!args.stripePaymentMethodId) {
        throw new Error("Payment method required for paid subscription");
      }

      await stripe.paymentMethods.attach(args.stripePaymentMethodId, {
        customer: customer.id
      });

      await stripe.customers.update(customer.id, {
        invoice_settings: {
          default_payment_method: args.stripePaymentMethodId
        }
      });

      subscriptionParams.payment_behavior = "default_incomplete";
      subscriptionParams.expand = ["latest_invoice.payment_intent"];
    }

    // ─────────────────────────────────────────────
    // 6️⃣ Create subscription
    // ─────────────────────────────────────────────
    type ExpandedInvoice = Stripe.Invoice & {
      payment_intent?: Stripe.PaymentIntent | null;
    };

    const subscription = await stripe.subscriptions.create({
      ...subscriptionParams,
      expand: ["latest_invoice.payment_intent"]
    });

    let paymentIntent: Stripe.PaymentIntent | null = null;

    const latestInvoice = subscription.latest_invoice;

    if (latestInvoice && typeof latestInvoice !== "string") {
      const invoice = latestInvoice as ExpandedInvoice;
      paymentIntent = invoice.payment_intent ?? null;
    }

    // ─────────────────────────────────────────────
    // 7️⃣ Return ONLY what frontend needs
    // ─────────────────────────────────────────────
    return {
      subscriptionId: subscription.id,
      customerId: customer.id,
      status: subscription.status,
      clientSecret: paymentIntent?.client_secret ?? null,
      requiresAction: paymentIntent?.status === "requires_action",
      packageKey: packageDetails.packageKey,
      plan: packageDetails.plan,
      maxGpts: packageDetails.maxGpts
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
  subscription: Stripe.Subscription
) {
  const stripe = getStripe(); // ✅ Initialize Stripe here

  try {
    const customerId = subscription.customer as string;

    // Try to get clerkUserId from metadata (highest priority)
    let clerkUserId = subscription.metadata?.clerkUserId;

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

    const price = subscription.items.data[0]?.price;
    const priceId = price?.id;

    if (!priceId) {
      console.error("No price ID found in subscription");
      return;
    }

    // Get package details from price ID
    console.log(`🔍 Looking up package for price ID: ${priceId}`);
    const packageDetails = getPackageFromPriceId(priceId);
    console.log(`✅ Found package:`, packageDetails);

    // Fetch product name directly from price object
    let productName: string | null = null;
    try {
      const productId = price.product as string;
      if (productId) {
        const product = await stripe.products.retrieve(productId);
        productName = product.name;
        console.log(`📦 Product name: ${productName}`);
      }
    } catch (error) {
      console.warn(`Could not fetch product name:`, error);
    }

    const subscriptionData = {
      status: subscription.status as SubscriptionStatus,
      stripeSubscriptionId: subscription.id,
      plan: packageDetails.plan,
      priceId: priceId,
      productName: productName || undefined,
      currentPeriodEnd: (subscription as any).current_period_end
        ? (subscription as any).current_period_end * 1000
        : Date.now(),
      maxGpts: packageDetails.maxGpts,
      gptIds: packageDetails.gptIds,
      cancelAtPeriodEnd: (subscription as any).cancel_at_period_end || false
    };

    console.log(`📝 Subscription data to save:`, subscriptionData);

    // Update user subscription in database
    const user = await ctx.runQuery(api.users.getUserByClerkId, {
      clerkId: clerkUserId
    });

    if (user) {
      console.log(`✅ Found user, updating subscription...`);
      await ctx.runMutation(api.users.updateSubscription, {
        clerkId: clerkUserId,
        userId: user._id,
        stripeCustomerId: customerId,
        subscription: subscriptionData,
        aiCredits: packageDetails.aiCredits
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
  subscription: Stripe.Subscription
) {
  const customerId = subscription.customer as string;

  const user = await ctx.runQuery(api.users.getByStripeCustomerId, {
    stripeCustomerId: customerId
  });

  if (!user) {
    console.error(`User with Stripe customer ID ${customerId} not found`);
    return;
  }

  const canceledSubscriptionData = {
    status: "canceled" as SubscriptionStatus,
    stripeSubscriptionId: subscription.id,
    plan: user.subscription?.plan || "clientProject",
    priceId: user.subscription?.priceId || "",
    currentPeriodEnd: (subscription as any).current_period_end
      ? (subscription as any).current_period_end * 1000
      : Date.now(),
    maxGpts: user.subscription?.maxGpts || 0,
    gptIds: user.subscription?.gptIds || [],
    cancelAtPeriodEnd: true
  };

  await ctx.runMutation(internal.users.updateSubscriptionInternal, {
    clerkId: user.clerkId,
    stripeCustomerId: customerId,
    subscription: canceledSubscriptionData,
    aiCredits: 0 // Reset credits on cancellation
  });
}

/**
 * Handle successful payment
 */
async function handlePaymentSucceeded(ctx: any, invoice: Stripe.Invoice) {
  // const subscriptionId = invoice.subscription as string;
  const subscriptionId = invoice.lines.data[0]?.subscription as string | null;

  // Update subscription to active if it was incomplete
  await ctx.runMutation(internal.users.updateSubscriptionByStripeId, {
    stripeSubscriptionId: subscriptionId,
    status: "active"
  });
}

/**
 * Handle failed payment
 */
async function handlePaymentFailed(ctx: any, invoice: Stripe.Invoice) {
  // const subscriptionId = invoice.subscription as string;
  const subscriptionId = invoice.lines.data[0]?.subscription as string | null;

  // Update subscription to past_due
  await ctx.runMutation(internal.users.updateSubscriptionByStripeId, {
    stripeSubscriptionId: subscriptionId,
    status: "past_due"
  });
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

    return {
      subscription: user.subscription,
      aiCredits: user.aiCredits || 0,
      aiCreditsResetAt: user.aiCreditsResetAt,
      canCreateProject:
        user.role === "admin" || user.subscription?.status === "active",
      plan: user.subscription?.plan || "clientProject",
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

    const user = await ctx.runQuery(api.users.getUserByClerkId, {
      clerkId: identity.subject
    });

    if (!user?.subscription?.stripeSubscriptionId) {
      throw new Error("No active subscription found");
    }

    // Cancel at period end
    const subscription = await stripe.subscriptions.update(
      user.subscription.stripeSubscriptionId,
      { cancel_at_period_end: true }
    );

    // Update local subscription status
    await ctx.runMutation(internal.users.updateSubscriptionByStripeId, {
      stripeSubscriptionId: subscription.id,
      cancelAtPeriodEnd: (subscription as any).cancel_at_period_end || false,
      status: subscription.status as SubscriptionStatus
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

    const user = await ctx.runQuery(api.users.getUserByClerkId, {
      clerkId: identity.subject
    });

    if (!user?.subscription?.stripeSubscriptionId) {
      throw new Error("No subscription found");
    }

    // Remove cancel at period end
    const subscription = await stripe.subscriptions.update(
      user.subscription.stripeSubscriptionId,
      { cancel_at_period_end: false }
    );

    // Update local subscription status
    await ctx.runMutation(internal.users.updateSubscriptionByStripeId, {
      stripeSubscriptionId: subscription.id,
      cancelAtPeriodEnd: (subscription as any).cancel_at_period_end || false,
      status: subscription.status as SubscriptionStatus
    });

    return { success: true };
  }
});
