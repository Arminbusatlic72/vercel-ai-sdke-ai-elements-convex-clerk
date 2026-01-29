// // // app/api/webhooks/stripe/route.ts - FIXED VERSION
// // import { headers } from "next/headers";
// // import { NextResponse } from "next/server";
// // import Stripe from "stripe";
// // import { ConvexHttpClient } from "convex/browser";
// // import { api } from "@/convex/_generated/api";
// // import { createClerkClient } from "@clerk/backend";

// // const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
// // const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
// //   apiVersion: "2025-12-15.clover"
// // });

// // // Create Clerk client for backend
// // const clerkClient = createClerkClient({
// //   secretKey: process.env.CLERK_SECRET_KEY!
// // });
// // async function verifySubscriptionInConvex(subscription: Stripe.Subscription) {
// //   try {
// //     const customerId = subscription.customer as string;

// //     // Use your existing query to find user by Stripe customer ID
// //     const users = await convex.query(api.users.getByStripeCustomerId, {
// //       stripeCustomerId: customerId
// //     });

// //     if (users && users.length > 0) {
// //       const user = users[0];
// //       console.log(`✅ Verified user in Convex:`, {
// //         userId: user._id,
// //         subscription: user.subscription,
// //         stripeCustomerId: user.stripeCustomerId
// //       });
// //       return true;
// //     } else {
// //       console.error(`❌ No user found with Stripe customer ID: ${customerId}`);
// //       return false;
// //     }
// //   } catch (error) {
// //     console.error(`❌ Error verifying in Convex:`, error);
// //     return false;
// //   }
// // }
// // export async function POST(request: Request) {
// //   const body = await request.text();
// //   const headersList = await headers();
// //   const signature = headersList.get("stripe-signature")!;

// //   let event: Stripe.Event;

// //   try {
// //     event = stripe.webhooks.constructEvent(
// //       body,
// //       signature,
// //       process.env.STRIPE_WEBHOOK_SECRET!
// //     );
// //   } catch (err: any) {
// //     console.error(`❌ Webhook signature verification failed: ${err.message}`);
// //     return NextResponse.json({ error: err.message }, { status: 400 });
// //   }

// //   console.log(`✅ Received Stripe event: ${event.type}`);

// //   try {
// //     // Handle the event
// //     const result = await handleStripeEvent(event);

// //     if (result.success) {
// //       return NextResponse.json({ received: true });
// //     } else {
// //       return NextResponse.json(
// //         { error: "Webhook handling failed" },
// //         { status: 500 }
// //       );
// //     }
// //   } catch (error: any) {
// //     console.error("❌ Webhook processing error:", error);
// //     return NextResponse.json(
// //       { error: "Webhook handler failed" },
// //       { status: 500 }
// //     );
// //   }
// // }

// // async function handleStripeEvent(event: Stripe.Event) {
// //   switch (event.type) {
// //     case "customer.subscription.updated":
// //     case "customer.subscription.created":
// //       return await handleSubscriptionUpdate(
// //         event.data.object as Stripe.Subscription
// //       );

// //     case "customer.subscription.deleted":
// //       return await handleSubscriptionDeleted(
// //         event.data.object as Stripe.Subscription
// //       );

// //     case "invoice.payment_succeeded":
// //       return await handleInvoicePaymentSucceeded(
// //         event.data.object as Stripe.Invoice
// //       );

// //     case "invoice.payment_failed":
// //       return await handleInvoicePaymentFailed(
// //         event.data.object as Stripe.Invoice
// //       );

// //     case "payment_intent.succeeded":
// //       return await handlePaymentIntentSucceeded(
// //         event.data.object as Stripe.PaymentIntent
// //       );

// //     case "payment_intent.payment_failed":
// //       return await handlePaymentIntentFailed(
// //         event.data.object as Stripe.PaymentIntent
// //       );

// //     case "payment_intent.requires_action":
// //       return await handlePaymentIntentRequiresAction(
// //         event.data.object as Stripe.PaymentIntent
// //       );

// //     default:
// //       console.log(`🤷 Unhandled event type: ${event.type}`);
// //       return { success: true };
// //   }
// // }

// // async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
// //   console.log(`🔄 Handling subscription update: ${subscription.id}`);

// //   try {
// //     // Call Convex action to update subscription
// //     const result = await convex.action(api.stripe.handleStripeWebhook, {
// //       eventType: "customer.subscription.updated",
// //       data: {
// //         object: subscription,
// //         previous_attributes: {}
// //       }
// //     });

// //     // Update Clerk metadata for fast access
// //     await updateClerkMetadata(subscription);

// //     console.log(`✅ Subscription ${subscription.id} updated successfully`);
// //     return { success: true };
// //   } catch (error) {
// //     console.error(
// //       `❌ Failed to update subscription ${subscription.id}:`,
// //       error
// //     );
// //     throw error;
// //   }
// // }

// // async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
// //   console.log(`🗑️ Handling subscription deletion: ${subscription.id}`);

// //   try {
// //     await convex.action(api.stripe.handleStripeWebhook, {
// //       eventType: "customer.subscription.deleted",
// //       data: {
// //         object: subscription,
// //         previous_attributes: {}
// //       }
// //     });

// //     // Update Clerk metadata
// //     await updateClerkMetadata(subscription);

// //     console.log(`✅ Subscription ${subscription.id} marked as deleted`);
// //     return { success: true };
// //   } catch (error) {
// //     console.error(
// //       `❌ Failed to delete subscription ${subscription.id}:`,
// //       error
// //     );
// //     throw error;
// //   }
// // }

// // async function updateClerkMetadata(subscription: Stripe.Subscription) {
// //   try {
// //     // Extract metadata from subscription
// //     const clerkUserId = subscription.metadata?.clerkUserId;
// //     if (!clerkUserId) {
// //       console.warn(
// //         `⚠️ No clerkUserId in subscription metadata: ${subscription.id}`
// //       );
// //       return;
// //     }

// //     // Get price/plan info
// //     const priceId = subscription.items.data[0]?.price.id;
// //     const isBasicPlan =
// //       priceId === process.env.NEXT_PUBLIC_STRIPE_PRICE_BASIC_MONTHLY ||
// //       (priceId || "").includes("basic");

// //     const plan = isBasicPlan ? "basic" : "pro";
// //     const maxGpts = isBasicPlan ? 3 : 6;

// //     // FIX: Use type assertion to access current_period_end
// //     const subscriptionAny = subscription as any;

// //     // Update Clerk user metadata
// //     await clerkClient.users.updateUser(clerkUserId, {
// //       publicMetadata: {
// //         subscriptionStatus: subscription.status,
// //         subscriptionId: subscription.id,
// //         plan,
// //         maxGpts,
// //         currentPeriodEnd: subscriptionAny.current_period_end, // ✅ Fixed with type assertion
// //         cancelAtPeriodEnd: subscriptionAny.cancel_at_period_end || false // ✅ Fixed
// //       }
// //     });

// //     console.log(`✅ Updated Clerk metadata for user: ${clerkUserId}`);
// //   } catch (error) {
// //     console.error("❌ Failed to update Clerk metadata:", error);
// //   }
// // }

// // async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
// //   console.log(`💰 Invoice payment succeeded: ${invoice.id}`);

// //   const invoiceAny = invoice as any;

// //   if (invoiceAny.subscription || invoiceAny.subscription_id) {
// //     const subscriptionId =
// //       invoiceAny.subscription || invoiceAny.subscription_id;

// //     try {
// //       // Get the subscription to update status
// //       const subscription = await stripe.subscriptions.retrieve(subscriptionId);

// //       // Update in Convex
// //       await convex.action(api.stripe.handleStripeWebhook, {
// //         eventType: "invoice.payment_succeeded",
// //         data: {
// //           object: invoice
// //         }
// //       });

// //       console.log(`✅ Payment for subscription ${subscriptionId} processed`);
// //       return { success: true };
// //     } catch (error) {
// //       console.error(
// //         `❌ Failed to process invoice payment for ${subscriptionId}:`,
// //         error
// //       );
// //       throw error;
// //     }
// //   }

// //   return { success: true };
// // }

// // async function handlePaymentIntentSucceeded(
// //   paymentIntent: Stripe.PaymentIntent
// // ) {
// //   console.log(`✅ Payment intent succeeded: ${paymentIntent.id}`);
// //   return { success: true };
// // }

// // async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
// //   console.log(`❌ Payment intent failed: ${paymentIntent.id}`);

// //   const paymentIntentAny = paymentIntent as any;

// //   if (paymentIntentAny.invoice) {
// //     const invoiceId =
// //       typeof paymentIntentAny.invoice === "string"
// //         ? paymentIntentAny.invoice
// //         : paymentIntentAny.invoice.id;

// //     console.log(`⚠️ Failed payment for invoice: ${invoiceId}`);
// //   }

// //   return { success: true };
// // }

// // async function handlePaymentIntentRequiresAction(
// //   paymentIntent: Stripe.PaymentIntent
// // ) {
// //   console.log(`🔄 Payment requires action: ${paymentIntent.id}`);
// //   return { success: true };
// // }

// // async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
// //   console.log(`❌ Invoice payment failed: ${invoice.id}`);

// //   const invoiceAny = invoice as any;

// //   if (invoiceAny.subscription || invoiceAny.subscription_id) {
// //     const subscriptionId =
// //       invoiceAny.subscription || invoiceAny.subscription_id;
// //     console.log(`⚠️ Failed payment for subscription: ${subscriptionId}`);
// //   }

// //   return { success: true };
// // }

// // // // app/api/stripe-webhook/route.ts
// // // import { NextResponse } from "next/server";
// // // import { auth } from "@clerk/nextjs/server";
// // // import { ConvexHttpClient } from "convex/browser";
// // // import { api } from "@/convex/_generated/api";

// // // const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

// // // export async function POST(request: Request) {
// // //   try {
// // //     const { userId } = await auth(); // <-- THIS LINE IS REQUIRED

// // //     if (!userId) {
// // //       return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
// // //     }

// // //     const { stripePaymentMethodId, priceId, email, packageId, tier, maxGpts } =
// // //       await request.json();

// // //     const result = await convex.action(api.stripe.createSubscription, {
// // //       clerkUserId: userId,
// // //       stripePaymentMethodId: stripePaymentMethodId ?? null,
// // //       priceId,
// // //       email
// // //     });

// // //     // UPDATE USER SUBSCRIPTION
// // //     await convex.mutation(api.users.updateUserSubscription, {
// // //       clerkId: userId, // correct field name
// // //       stripeSubscriptionId: result.subscriptionId,
// // //       subscriptionStatus: result.status,
// // //       currentPeriodEnd: String(result.currentPeriodEnd),
// // //       maxGpts: selectedPackage.maxGpts,
// // //       packageId: selectedPackage._id,
// // //       tier: selectedPackage.tier
// // //     });

// // //     return NextResponse.json(result);
// // //   } catch (error: any) {
// // //     console.error("API Error:", error);
// // //     return NextResponse.json(
// // //       { error: error.message || "Internal server error" },
// // //       { status: 500 }
// // //     );
// // //   }
// // // }

// // // app/api/webhooks/stripe/route.ts
// // import { NextResponse } from "next/server";
// // import { headers } from "next/headers";
// // import Stripe from "stripe";
// // import { ConvexHttpClient } from "convex/browser";
// // import { api } from "@/convex/_generated/api";

// // const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
// //   apiVersion: "2024-12-18.acacia"
// // });

// // const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

// // // This is your Stripe webhook signing secret from the Stripe Dashboard
// // const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

// // export async function POST(req: Request) {
// //   try {
// //     const body = await req.text();
// //     const headersList = await headers();
// //     const signature = headersList.get("stripe-signature");

// //     if (!signature) {
// //       console.error("❌ No Stripe signature found");
// //       return NextResponse.json({ error: "No signature" }, { status: 400 });
// //     }

// //     // Verify the webhook signature
// //     let event: Stripe.Event;
// //     try {
// //       event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
// //     } catch (err: any) {
// //       console.error("❌ Webhook signature verification failed:", err.message);
// //       return NextResponse.json(
// //         { error: `Webhook Error: ${err.message}` },
// //         { status: 400 }
// //       );
// //     }

// //     console.log("✅ Webhook received:", event.type);

// //     // Handle the event
// //     switch (event.type) {
// //       case "customer.subscription.created":
// //       case "customer.subscription.updated": {
// //         const subscription = event.data.object as Stripe.Subscription;
// //         await handleSubscriptionChange(subscription, event.type);
// //         break;
// //       }

// //       case "customer.subscription.deleted": {
// //         const subscription = event.data.object as Stripe.Subscription;
// //         await handleSubscriptionCancellation(subscription);
// //         break;
// //       }

// //       case "invoice.payment_succeeded": {
// //         const invoice = event.data.object as Stripe.Invoice;
// //         await handlePaymentSucceeded(invoice);
// //         break;
// //       }

// //       case "invoice.payment_failed": {
// //         const invoice = event.data.object as Stripe.Invoice;
// //         await handlePaymentFailed(invoice);
// //         break;
// //       }

// //       default:
// //         console.log(`ℹ️ Unhandled event type: ${event.type}`);
// //     }

// //     return NextResponse.json({ received: true });
// //   } catch (error: any) {
// //     console.error("❌ Webhook handler error:", error);
// //     return NextResponse.json(
// //       { error: "Webhook handler failed" },
// //       { status: 500 }
// //     );
// //   }
// // }

// // async function handleSubscriptionChange(
// //   subscription: Stripe.Subscription,
// //   eventType: string
// // ) {
// //   console.log(`📝 Processing ${eventType}:`, subscription.id);

// //   const customerId = subscription.customer as string;
// //   const priceId = subscription.items.data[0]?.price.id;

// //   if (!priceId) {
// //     console.error("❌ No price ID found in subscription");
// //     return;
// //   }

// //   // Get user by Stripe customer ID
// //   const user = await convex.query(api.users.getUserByStripeCustomerId, {
// //     stripeCustomerId: customerId
// //   });

// //   if (!user) {
// //     console.error("❌ No user found for customer:", customerId);
// //     return;
// //   }

// //   // Get package details from Convex
// //   const packageData = await convex.query(api.packages.getPackageByPriceId, {
// //     stripePriceId: priceId
// //   });

// //   if (!packageData) {
// //     console.error("❌ No package found for price:", priceId);
// //     return;
// //   }

// //   // Sync to Convex
// //   await convex.mutation(api.subscriptions.syncSubscriptionFromStripe, {
// //     clerkUserId: user.clerkId,
// //     stripeSubscriptionId: subscription.id,
// //     stripeCustomerId: customerId,
// //     status: subscription.status,
// //     priceId,
// //     packageKey: packageData.key,
// //     currentPeriodStart: subscription.current_period_start,
// //     currentPeriodEnd: subscription.current_period_end,
// //     cancelAtPeriodEnd: subscription.cancel_at_period_end,
// //     maxGpts: packageData.maxGpts || 0
// //   });

// //   console.log(`✅ Subscription synced for user: ${user.clerkId}`);
// // }

// // async function handleSubscriptionCancellation(
// //   subscription: Stripe.Subscription
// // ) {
// //   console.log("🚫 Processing cancellation:", subscription.id);

// //   const customerId = subscription.customer as string;

// //   const user = await convex.query(api.users.getUserByStripeCustomerId, {
// //     stripeCustomerId: customerId
// //   });

// //   if (!user) {
// //     console.error("❌ No user found for customer:", customerId);
// //     return;
// //   }

// //   await convex.mutation(api.subscriptions.cancelUserSubscription, {
// //     clerkUserId: user.clerkId,
// //     stripeSubscriptionId: subscription.id,
// //     canceledAt: Math.floor(Date.now() / 1000)
// //   });

// //   console.log(`✅ Subscription canceled for user: ${user.clerkId}`);
// // }

// // async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
// //   console.log("💰 Payment succeeded:", invoice.id);

// //   if (!invoice.subscription) {
// //     console.log("ℹ️ Invoice not related to subscription");
// //     return;
// //   }

// //   const customerId = invoice.customer as string;

// //   const user = await convex.query(api.users.getUserByStripeCustomerId, {
// //     stripeCustomerId: customerId
// //   });

// //   if (!user) {
// //     console.error("❌ No user found for customer:", customerId);
// //     return;
// //   }

// //   // Update subscription status to active if it was past_due
// //   const subscriptionId = invoice.subscription as string;

// //   await convex.mutation(api.subscriptions.updateSubscriptionStatus, {
// //     clerkUserId: user.clerkId,
// //     stripeSubscriptionId: subscriptionId,
// //     status: "active"
// //   });

// //   console.log(`✅ Payment processed for user: ${user.clerkId}`);
// // }

// // async function handlePaymentFailed(invoice: Stripe.Invoice) {
// //   console.log("❌ Payment failed:", invoice.id);

// //   if (!invoice.subscription) {
// //     console.log("ℹ️ Invoice not related to subscription");
// //     return;
// //   }

// //   const customerId = invoice.customer as string;

// //   const user = await convex.query(api.users.getUserByStripeCustomerId, {
// //     stripeCustomerId: customerId
// //   });

// //   if (!user) {
// //     console.error("❌ No user found for customer:", customerId);
// //     return;
// //   }

// //   const subscriptionId = invoice.subscription as string;

// //   await convex.mutation(api.subscriptions.updateSubscriptionStatus, {
// //     clerkUserId: user.clerkId,
// //     stripeSubscriptionId: subscriptionId,
// //     status: "past_due"
// //   });

// //   console.log(`⚠️ Payment failed for user: ${user.clerkId}`);
// // }

// import { headers } from "next/headers";
// import { NextResponse } from "next/server";
// import Stripe from "stripe";
// import { ConvexHttpClient } from "convex/browser";
// import { api } from "@/convex/_generated/api";

// export const runtime = "nodejs";

// const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
// const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

// // ✅ STEP 1: Verify Stripe Signature
// async function verifyStripeSignature(
//   body: string,
//   signature: string
// ): Promise<Stripe.Event> {
//   try {
//     return stripe.webhooks.constructEvent(
//       body,
//       signature,
//       process.env.STRIPE_WEBHOOK_SECRET!
//     );
//   } catch (err: any) {
//     throw new Error(`Signature verification failed: ${err.message}`);
//   }
// }

// // ✅ STEP 2: Route Handler
// export async function POST(request: Request) {
//   const body = await request.text();
//   const headersList = await headers();
//   const signature = headersList.get("stripe-signature")!;

//   try {
//     const event = await verifyStripeSignature(body, signature);
//     console.log(`✅ Verified Stripe event: ${event.type}`);

//     // Route to appropriate handler
//     const result = await handleStripeEvent(event);
//     return NextResponse.json({ received: result.success });
//   } catch (error: any) {
//     console.error(`❌ Webhook error: ${error.message}`);
//     return NextResponse.json({ error: error.message }, { status: 400 });
//   }
// }

// // ✅ STEP 3: Event Router
// async function handleStripeEvent(event: Stripe.Event) {
//   switch (event.type) {
//     case "customer.subscription.created":
//     case "customer.subscription.updated":
//       return await handleSubscriptionUpdate(
//         event.data.object as Stripe.Subscription
//       );

//     case "customer.subscription.deleted":
//       return await handleSubscriptionDeleted(
//         event.data.object as Stripe.Subscription
//       );

//     case "invoice.payment_succeeded":
//       return await handleInvoicePaymentSucceeded(
//         event.data.object as Stripe.Invoice
//       );

//     case "invoice.payment_failed":
//       return await handleInvoicePaymentFailed(
//         event.data.object as Stripe.Invoice
//       );

//     default:
//       console.log(`Unhandled event: ${event.type}`);
//       return { success: true };
//   }
// }

// // In app/api/webhooks/stripe/route.ts

// // async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
// //   console.log(`🔄 Processing subscription: ${subscription.id}`);

// //   try {
// //     // Extract Stripe data
// //     const customerId = subscription.customer as string;
// //     const priceId = subscription.items.data[0]?.price.id;

// //     if (!priceId) throw new Error("No price found in subscription");

// //     // Determine package from price ID
// //     const packageKey = getPricePackageMapping(priceId);

// //     // Get clerkUserId from Stripe metadata
// //     let clerkUserId = subscription.metadata?.clerkUserId;

// //     // Fallback 1: If clerkUserId not in metadata, look up user by stripeCustomerId in Convex
// //     if (!clerkUserId) {
// //       console.log(
// //         `⚠️  clerkUserId not in subscription metadata, looking up by stripeCustomerId in Convex...`
// //       );
// //       const users = await convex.query(api.users.getByStripeCustomerId, {
// //         stripeCustomerId: customerId
// //       });

// //       if (users && users.length > 0) {
// //         clerkUserId = users[0].clerkId;
// //         console.log(`✅ Found clerkUserId from Convex lookup: ${clerkUserId}`);
// //       } else {
// //         // Fallback 2: Check Stripe customer object metadata
// //         console.log(
// //           `⚠️  No user found in Convex, checking Stripe customer metadata...`
// //         );
// //         const customer = await stripe.customers.retrieve(customerId);

// //         // Check if customer is deleted before accessing metadata
// //         if ("deleted" in customer && customer.deleted) {
// //           throw new Error(
// //             `Customer ${customerId} has been deleted. Cannot retrieve clerkUserId.`
// //           );
// //         }

// //         clerkUserId = (customer as Stripe.Customer).metadata?.clerkUserId;

// //         if (!clerkUserId) {
// //           throw new Error(
// //             `Cannot find clerkUserId for subscription ${subscription.id}. ` +
// //               `Not in subscription metadata, Convex DB, or Stripe customer metadata. ` +
// //               `Customer ID: ${customerId}`
// //           );
// //         }
// //         console.log(
// //           `✅ Found clerkUserId from Stripe customer metadata: ${clerkUserId}`
// //         );
// //       }
// //     }

// //     // ✅ Call Convex mutation to update database
// //     await convex.mutation(api.subscriptions.syncSubscriptionFromStripe, {
// //       clerkUserId,
// //       stripeSubscriptionId: subscription.id,
// //       stripeCustomerId: customerId,
// //       status: subscription.status,
// //       priceId,
// //       planType: packageKey, // Pass plan type directly (not packageKey)
// //       currentPeriodStart: subscription.items.data[0].current_period_start
// //         ? subscription.items.data[0].current_period_start * 1000
// //         : Date.now(),
// //       currentPeriodEnd: subscription.items.data[0].current_period_end
// //         ? subscription.items.data[0].current_period_end * 1000
// //         : Date.now() + 30 * 24 * 60 * 60 * 1000,
// //       cancelAtPeriodEnd: subscription.cancel_at_period_end,
// //       maxGpts: packageKey === "pro" ? 6 : 3
// //     });

// //     console.log(`✅ User subscription updated in Convex`);
// //     return { success: true };
// //   } catch (error) {
// //     console.error(`❌ Subscription update failed:`, error);
// //     return { success: false };
// //   }
// // }

// async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
//   console.log(`🔄 Processing subscription: ${subscription.id}`);

//   try {
//     const customerId = subscription.customer as string;
//     const priceId = subscription.items.data[0]?.price.id;

//     if (!priceId) throw new Error("No price found in subscription");

//     const packageKey = getPricePackageMapping(priceId);
//     let clerkUserId = subscription.metadata?.clerkUserId;

//     // Your existing clerkUserId lookup logic...
//     if (!clerkUserId) {
//       const users = await convex.query(api.users.getByStripeCustomerId, {
//         stripeCustomerId: customerId
//       });
//       if (users && users.length > 0) {
//         clerkUserId = users[0].clerkId;
//       }
//     }

//     if (!clerkUserId) {
//       const customer = await stripe.customers.retrieve(customerId);
//       if ("deleted" in customer && customer.deleted) {
//         throw new Error(`Customer ${customerId} has been deleted`);
//       }
//       clerkUserId = (customer as Stripe.Customer).metadata?.clerkUserId;
//     }

//     if (!clerkUserId) {
//       throw new Error(
//         `Cannot find clerkUserId for subscription ${subscription.id}`
//       );
//     }

//     // ✅ Call Convex HTTP action instead
//     const response = await fetch(
//       `${process.env.NEXT_PUBLIC_CONVEX_URL}/stripe/sync-subscription`,
//       {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({
//           clerkUserId,
//           stripeSubscriptionId: subscription.id,
//           stripeCustomerId: customerId,
//           status: subscription.status,
//           priceId,
//           planType: packageKey,
//           currentPeriodStart: subscription.current_period_start * 1000,
//           currentPeriodEnd: subscription.current_period_end * 1000,
//           cancelAtPeriodEnd: subscription.cancel_at_period_end,
//           maxGpts: packageKey === "pro" ? 6 : 3
//         })
//       }
//     );

//     if (!response.ok) {
//       const error = await response.text();
//       throw new Error(`Convex sync failed: ${error}`);
//     }

//     console.log(`✅ User subscription updated in Convex`);
//     return { success: true };
//   } catch (error) {
//     console.error(`❌ Subscription update failed:`, error);
//     return { success: false };
//   }
// }

// // Handle subscription deletion
// async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
//   console.log(`🗑️ Handling subscription deletion: ${subscription.id}`);

//   try {
//     const customerId = subscription.customer as string;
//     let clerkUserId = subscription.metadata?.clerkUserId;

//     // Fallback 1: Look up by stripeCustomerId in Convex
//     if (!clerkUserId) {
//       const users = await convex.query(api.users.getByStripeCustomerId, {
//         stripeCustomerId: customerId
//       });

//       if (users && users.length > 0) {
//         clerkUserId = users[0].clerkId;
//       } else {
//         // Fallback 2: Check Stripe customer metadata
//         const customer = await stripe.customers.retrieve(customerId);

//         // Check if customer is deleted before accessing metadata
//         if ("deleted" in customer && customer.deleted) {
//           throw new Error(
//             `Cannot find clerkUserId for deleted subscription ${subscription.id}. Customer is deleted.`
//           );
//         }

//         clerkUserId = (customer as Stripe.Customer).metadata?.clerkUserId;

//         if (!clerkUserId) {
//           throw new Error(
//             `Cannot find clerkUserId for deleted subscription ${subscription.id}`
//           );
//         }
//       }
//     }

//     const user = await convex.query(api.users.getUserByClerkId, {
//       clerkId: clerkUserId
//     });

//     if (user) {
//       // Clear subscription from user record
//       await convex.mutation(api.subscriptions.syncSubscriptionFromStripe, {
//         clerkUserId,
//         stripeSubscriptionId: subscription.id,
//         stripeCustomerId: customerId,
//         status: "canceled",
//         priceId: subscription.items.data[0]?.price.id || "",
//         planType: "sandbox", // ✅ CHANGED from packageKey: "free" to planType: "sandbox"
//         currentPeriodStart:
//           subscription.items.data[0]?.current_period_start * 1000,
//         currentPeriodEnd: subscription.items.data[0]?.current_period_end * 1000,
//         cancelAtPeriodEnd: false,
//         maxGpts: 0
//       });
//     }

//     console.log(`✅ Subscription ${subscription.id} marked as deleted`);
//     return { success: true };
//   } catch (error) {
//     console.error(`❌ Subscription deletion failed:`, error);
//     return { success: false };
//   }
// }

// // Handle invoice payment succeeded
// async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
//   console.log(`💰 Invoice payment succeeded: ${invoice.id}`);

//   try {
//     // const subscriptionId = invoice.lines.data[0]?.subscription as string | null;
//     const subscriptionId =
//       (invoice.lines.data.find((l) => l.subscription)?.subscription as
//         | string
//         | null) ?? null;

//     if (!subscriptionId) {
//       console.log("⏭️ No subscription for invoice, skipping...");
//       return { success: true };
//     }

//     if (!subscriptionId) {
//       console.log(`⏭️ No subscription for invoice, skipping...`);
//       return { success: true };
//     }

//     // Get the subscription
//     const subscription = await stripe.subscriptions.retrieve(subscriptionId);

//     // Trigger subscription update to sync latest status
//     return await handleSubscriptionUpdate(subscription);
//   } catch (error) {
//     console.error(`❌ Invoice payment processing failed:`, error);
//     return { success: false };
//   }
// }

// // Handle invoice payment failed
// async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
//   console.log(`❌ Invoice payment failed: ${invoice.id}`);

//   try {
//     const subscriptionId = invoice.lines.data[0]?.subscription as string | null;
//     const customerId = invoice.customer as string;

//     if (!subscriptionId || !customerId) {
//       console.log(`⏭️ Missing subscription/customer, skipping...`);
//       return { success: true };
//     }

//     // Get subscription
//     const subscription = await stripe.subscriptions.retrieve(subscriptionId);

//     // Update to past_due status
//     let clerkUserId = subscription.metadata?.clerkUserId;

//     if (!clerkUserId) {
//       // Fallback 1: Look up by stripeCustomerId in Convex
//       const users = await convex.query(api.users.getByStripeCustomerId, {
//         stripeCustomerId: customerId
//       });

//       if (users && users.length > 0) {
//         clerkUserId = users[0].clerkId;
//       } else {
//         // Fallback 2: Check Stripe customer metadata
//         const customer = await stripe.customers.retrieve(customerId);

//         // Check if customer is deleted before accessing metadata
//         if ("deleted" in customer && customer.deleted) {
//           throw new Error(
//             `Cannot find clerkUserId for failed invoice ${invoice.id}. Customer is deleted.`
//           );
//         }

//         clerkUserId = (customer as Stripe.Customer).metadata?.clerkUserId;

//         if (!clerkUserId) {
//           throw new Error(
//             `Cannot find clerkUserId for failed invoice ${invoice.id}`
//           );
//         }
//       }
//     }

//     const priceId = subscription.items.data[0]?.price.id || "";
//     const packageKey = getPricePackageMapping(priceId);

//     await convex.mutation(api.subscriptions.syncSubscriptionFromStripe, {
//       clerkUserId,
//       stripeSubscriptionId: subscription.id,
//       stripeCustomerId: customerId,
//       status: "past_due",
//       priceId,
//       planType: packageKey, // Pass plan type directly
//       currentPeriodStart: subscription.items.data[0].current_period_start
//         ? subscription.items.data[0].current_period_start * 1000
//         : Date.now(),
//       currentPeriodEnd: subscription.items.data[0].current_period_end
//         ? subscription.items.data[0].current_period_end * 1000
//         : Date.now() + 30 * 24 * 60 * 60 * 1000,
//       cancelAtPeriodEnd: subscription.cancel_at_period_end,
//       maxGpts: packageKey === "pro" ? 6 : 3
//     });

//     console.log(`✅ Subscription status updated to past_due`);
//     return { success: true };
//   } catch (error) {
//     console.error(`❌ Payment failure handling failed:`, error);
//     return { success: false };
//   }
// }

// // Helper: Map Stripe price ID to package (valid schema values)
// function getPricePackageMapping(
//   priceId: string
// ): "sandbox" | "clientProject" | "basic" | "pro" {
//   // Map environment variable price IDs to valid plan types
//   // Valid types: "sandbox", "clientProject", "basic", "pro"
//   const mapping: Record<string, "sandbox" | "clientProject" | "basic" | "pro"> =
//     {
//       // Paid plans
//       [process.env.STRIPE_PRICE_SANDBOX_LEVEL_MONTHLY || ""]: "sandbox",
//       [process.env.STRIPE_PRICE_CLIENT_PROJECT_GPT_MONTHLY || ""]:
//         "clientProject",
//       [process.env.STRIPE_PRICE_BASIC_ID || ""]: "basic",
//       [process.env.STRIPE_PRICE_PRO_ID || ""]: "pro",

//       // Free plans - map to "sandbox" plan type
//       [process.env.STRIPE_PRICE_ANALYZING_TRENDS_FREE || ""]: "sandbox",
//       [process.env.STRIPE_PRICE_SUMMER_SANDBOX_FREE || ""]: "sandbox",
//       [process.env.STRIPE_PRICE_WORKSHOP_SANDBOX_FREE || ""]: "sandbox",
//       [process.env.STRIPE_PRICE_CLASSROOM_SPEAKER_FREE || ""]: "sandbox",
//       [process.env.STRIPE_PRICE_SUBSTACK_GPT_FREE || ""]: "sandbox"
//     };

//   const planType = mapping[priceId];

//   if (!planType) {
//     throw new Error(
//       `Cannot map price ID "${priceId}" to a valid plan type. ` +
//         `Valid types are: "sandbox", "clientProject", "basic", "pro". ` +
//         `Please check that the price ID exists in your Stripe account and is configured in environment variables.`
//     );
//   }

//   return planType;
// }

// import { headers } from "next/headers";
// import { NextResponse } from "next/server";
// import Stripe from "stripe";
// import { ConvexHttpClient } from "convex/browser";
// import { api } from "@/convex/_generated/api";

// export const runtime = "nodejs";

// const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
// const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

// // ✅ STEP 1: Verify Stripe Signature
// async function verifyStripeSignature(
//   body: string,
//   signature: string
// ): Promise<Stripe.Event> {
//   try {
//     return stripe.webhooks.constructEvent(
//       body,
//       signature,
//       process.env.STRIPE_WEBHOOK_SECRET!
//     );
//   } catch (err: any) {
//     throw new Error(`Signature verification failed: ${err.message}`);
//   }
// }

// // ✅ STEP 2: Route Handler
// export async function POST(request: Request) {
//   const body = await request.text();
//   const headersList = await headers();
//   const signature = headersList.get("stripe-signature")!;

//   try {
//     const event = await verifyStripeSignature(body, signature);
//     console.log(`✅ Verified Stripe event: ${event.type}`);

//     // Route to appropriate handler
//     const result = await handleStripeEvent(event);
//     return NextResponse.json({ received: result.success });
//   } catch (error: any) {
//     console.error(`❌ Webhook error: ${error.message}`);
//     return NextResponse.json({ error: error.message }, { status: 400 });
//   }
// }

// // ✅ STEP 3: Event Router
// async function handleStripeEvent(event: Stripe.Event) {
//   switch (event.type) {
//     case "customer.subscription.created":
//     case "customer.subscription.updated":
//       return await handleSubscriptionUpdate(
//         event.data.object as Stripe.Subscription
//       );

//     case "customer.subscription.deleted":
//       return await handleSubscriptionDeleted(
//         event.data.object as Stripe.Subscription
//       );

//     case "invoice.payment_succeeded":
//       return await handleInvoicePaymentSucceeded(
//         event.data.object as Stripe.Invoice
//       );

//     case "invoice.payment_failed":
//       return await handleInvoicePaymentFailed(
//         event.data.object as Stripe.Invoice
//       );

//     default:
//       console.log(`Unhandled event: ${event.type}`);
//       return { success: true };
//   }
// }

// // In app/api/webhooks/stripe/route.ts

// async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
//   console.log(`🔄 Processing subscription: ${subscription.id}`);

//   try {
//     // Extract Stripe data
//     const customerId = subscription.customer as string;
//     const priceId = subscription.items.data[0]?.price.id;

//     if (!priceId) throw new Error("No price found in subscription");

//     // Determine package from price ID
//     const packageKey = getPricePackageMapping(priceId);

//     // Get clerkUserId from Stripe metadata
//     let clerkUserId = subscription.metadata?.clerkUserId;

//     // Fallback 1: If clerkUserId not in metadata, look up user by stripeCustomerId in Convex
//     if (!clerkUserId) {
//       console.log(
//         `⚠️  clerkUserId not in subscription metadata, looking up by stripeCustomerId in Convex...`
//       );
//       const users = await convex.query(api.users.getByStripeCustomerId, {
//         stripeCustomerId: customerId
//       });

//       if (users && users.length > 0) {
//         clerkUserId = users[0].clerkId;
//         console.log(`✅ Found clerkUserId from Convex lookup: ${clerkUserId}`);
//       } else {
//         // Fallback 2: Check Stripe customer object metadata
//         console.log(
//           `⚠️  No user found in Convex, checking Stripe customer metadata...`
//         );
//         const customer = await stripe.customers.retrieve(customerId);

//         // Check if customer is deleted before accessing metadata
//         if ("deleted" in customer && customer.deleted) {
//           throw new Error(
//             `Customer ${customerId} has been deleted. Cannot retrieve clerkUserId.`
//           );
//         }

//         clerkUserId = (customer as Stripe.Customer).metadata?.clerkUserId;

//         if (!clerkUserId) {
//           throw new Error(
//             `Cannot find clerkUserId for subscription ${subscription.id}. ` +
//               `Not in subscription metadata, Convex DB, or Stripe customer metadata. ` +
//               `Customer ID: ${customerId}`
//           );
//         }
//         console.log(
//           `✅ Found clerkUserId from Stripe customer metadata: ${clerkUserId}`
//         );
//       }
//     }

//     // ✅ Call Convex mutation to update database
//     await convex.mutation(api.subscriptions.syncSubscriptionFromStripe, {
//       clerkUserId,
//       stripeSubscriptionId: subscription.id,
//       stripeCustomerId: customerId,
//       status: subscription.status,
//       priceId,
//       planType: packageKey, // Pass plan type directly (not packageKey)
//       currentPeriodStart: subscription.items.data[0].current_period_start
//         ? subscription.items.data[0].current_period_start * 1000
//         : Date.now(),
//       currentPeriodEnd: subscription.items.data[0].current_period_end
//         ? subscription.items.data[0].current_period_end * 1000
//         : Date.now() + 30 * 24 * 60 * 60 * 1000,
//       cancelAtPeriodEnd: subscription.cancel_at_period_end,
//       maxGpts: packageKey === "pro" ? 6 : 3
//     });

//     console.log(`✅ User subscription updated in Convex`);
//     return { success: true };
//   } catch (error) {
//     console.error(`❌ Subscription update failed:`, error);
//     return { success: false };
//   }
// }

// // Handle subscription deletion
// async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
//   console.log(`🗑️ Handling subscription deletion: ${subscription.id}`);

//   try {
//     const customerId = subscription.customer as string;
//     let clerkUserId = subscription.metadata?.clerkUserId;

//     // Fallback 1: Look up by stripeCustomerId in Convex
//     if (!clerkUserId) {
//       const users = await convex.query(api.users.getByStripeCustomerId, {
//         stripeCustomerId: customerId
//       });

//       if (users && users.length > 0) {
//         clerkUserId = users[0].clerkId;
//       } else {
//         // Fallback 2: Check Stripe customer metadata
//         const customer = await stripe.customers.retrieve(customerId);

//         // Check if customer is deleted before accessing metadata
//         if ("deleted" in customer && customer.deleted) {
//           throw new Error(
//             `Cannot find clerkUserId for deleted subscription ${subscription.id}. Customer is deleted.`
//           );
//         }

//         clerkUserId = (customer as Stripe.Customer).metadata?.clerkUserId;

//         if (!clerkUserId) {
//           throw new Error(
//             `Cannot find clerkUserId for deleted subscription ${subscription.id}`
//           );
//         }
//       }
//     }

//     const user = await convex.query(api.users.getUserByClerkId, {
//       clerkId: clerkUserId
//     });

//     if (user) {
//       // Clear subscription from user record
//       await convex.mutation(api.subscriptions.syncSubscriptionFromStripe, {
//         clerkUserId,
//         stripeSubscriptionId: subscription.id,
//         stripeCustomerId: customerId,
//         status: "canceled",
//         priceId: subscription.items.data[0]?.price.id || "",
//         planType: "sandbox",
//         currentPeriodStart:
//           subscription.items.data[0]?.current_period_start * 1000,
//         currentPeriodEnd: subscription.items.data[0]?.current_period_end * 1000,
//         cancelAtPeriodEnd: false,
//         maxGpts: 0
//       });
//     }

//     console.log(`✅ Subscription ${subscription.id} marked as deleted`);
//     return { success: true };
//   } catch (error) {
//     console.error(`❌ Subscription deletion failed:`, error);
//     return { success: false };
//   }
// }

// // Handle invoice payment succeeded
// async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
//   console.log(`💰 Invoice payment succeeded: ${invoice.id}`);

//   try {
//     const subscriptionId =
//       (invoice.lines.data.find((l) => l.subscription)?.subscription as
//         | string
//         | null) ?? null;

//     if (!subscriptionId) {
//       console.log("⏭️ No subscription for invoice, skipping...");
//       return { success: true };
//     }

//     const subscription = await stripe.subscriptions.retrieve(subscriptionId);
//     return await handleSubscriptionUpdate(subscription);
//   } catch (error) {
//     console.error(`❌ Invoice payment processing failed:`, error);
//     return { success: false };
//   }
// }

// // Handle invoice payment failed
// async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
//   console.log(`❌ Invoice payment failed: ${invoice.id}`);

//   try {
//     const subscriptionId = invoice.lines.data[0]?.subscription as string | null;
//     const customerId = invoice.customer as string;

//     if (!subscriptionId || !customerId) {
//       console.log(`⏭️ Missing subscription/customer, skipping...`);
//       return { success: true };
//     }

//     const subscription = await stripe.subscriptions.retrieve(subscriptionId);
//     let clerkUserId = subscription.metadata?.clerkUserId;

//     if (!clerkUserId) {
//       const users = await convex.query(api.users.getByStripeCustomerId, {
//         stripeCustomerId: customerId
//       });

//       if (users && users.length > 0) {
//         clerkUserId = users[0].clerkId;
//       } else {
//         const customer = await stripe.customers.retrieve(customerId);

//         if ("deleted" in customer && customer.deleted) {
//           throw new Error(
//             `Cannot find clerkUserId for failed invoice ${invoice.id}. Customer is deleted.`
//           );
//         }

//         clerkUserId = (customer as Stripe.Customer).metadata?.clerkUserId;

//         if (!clerkUserId) {
//           throw new Error(
//             `Cannot find clerkUserId for failed invoice ${invoice.id}`
//           );
//         }
//       }
//     }

//     const priceId = subscription.items.data[0]?.price.id || "";
//     const packageKey = getPricePackageMapping(priceId);

//     await convex.mutation(api.subscriptions.syncSubscriptionFromStripe, {
//       clerkUserId,
//       stripeSubscriptionId: subscription.id,
//       stripeCustomerId: customerId,
//       status: "past_due",
//       priceId,
//       planType: packageKey,
//       currentPeriodStart: subscription.items.data[0].current_period_start
//         ? subscription.items.data[0].current_period_start * 1000
//         : Date.now(),
//       currentPeriodEnd: subscription.items.data[0].current_period_end
//         ? subscription.items.data[0].current_period_end * 1000
//         : Date.now() + 30 * 24 * 60 * 60 * 1000,
//       cancelAtPeriodEnd: subscription.cancel_at_period_end,
//       maxGpts: packageKey === "pro" ? 6 : 3
//     });

//     console.log(`✅ Subscription status updated to past_due`);
//     return { success: true };
//   } catch (error) {
//     console.error(`❌ Payment failure handling failed:`, error);
//     return { success: false };
//   }
// }

// // Helper: Map Stripe price ID to package
// function getPricePackageMapping(
//   priceId: string
// ): "sandbox" | "clientProject" | "basic" | "pro" {
//   const mapping: Record<string, "sandbox" | "clientProject" | "basic" | "pro"> =
//     {
//       [process.env.STRIPE_PRICE_SANDBOX_LEVEL_MONTHLY || ""]: "sandbox",
//       [process.env.STRIPE_PRICE_CLIENT_PROJECT_GPT_MONTHLY || ""]:
//         "clientProject",
//       [process.env.STRIPE_PRICE_BASIC_ID || ""]: "basic",
//       [process.env.STRIPE_PRICE_PRO_ID || ""]: "pro",
//       [process.env.STRIPE_PRICE_ANALYZING_TRENDS_FREE || ""]: "sandbox",
//       [process.env.STRIPE_PRICE_SUMMER_SANDBOX_FREE || ""]: "sandbox",
//       [process.env.STRIPE_PRICE_WORKSHOP_SANDBOX_FREE || ""]: "sandbox",
//       [process.env.STRIPE_PRICE_CLASSROOM_SPEAKER_FREE || ""]: "sandbox",
//       [process.env.STRIPE_PRICE_SUBSTACK_GPT_FREE || ""]: "sandbox"
//     };

//   const planType = mapping[priceId];

//   if (!planType) {
//     throw new Error(`Cannot map price ID "${priceId}"`);
//   }

//   return planType;
// }

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
  const signature = headersList.get("stripe-signature");

  if (!signature) {
    console.error("❌ No stripe-signature header found");
    return NextResponse.json({ error: "No signature header" }, { status: 400 });
  }

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
    case "invoice.paid":
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

// ✅ Helper function to sync subscription via HTTP action
async function syncSubscriptionToConvex(data: {
  clerkUserId: string;
  stripeSubscriptionId: string;
  stripeCustomerId: string;
  status: string;
  priceId: string;
  planType: "sandbox" | "clientProject" | "basic" | "pro";
  currentPeriodStart: number;
  currentPeriodEnd: number;
  cancelAtPeriodEnd: boolean;
  maxGpts: number;
}) {
  console.log(`🔄 Syncing to Convex for user: ${data.clerkUserId}`);

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_CONVEX_URL}/stripe/sync-subscription`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    }
  );

  if (!response.ok) {
    const error = await response.text();
    console.error(`❌ Convex sync failed:`, error);
    throw new Error(`Convex sync failed: ${error}`);
  }

  const result = await response.json();
  console.log(`✅ Convex sync successful:`, result);
  return result;
}

// ✅ Handle subscription creation/update
async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  console.log(`🔄 Processing subscription: ${subscription.id}`);

  try {
    const customerId = subscription.customer as string;
    const priceId = subscription.items.data[0]?.price.id;

    if (!priceId) throw new Error("No price found in subscription");

    const packageKey = getPricePackageMapping(priceId);
    let clerkUserId = subscription.metadata?.clerkUserId;

    // Fallback 1: Look up by stripeCustomerId in Convex
    if (!clerkUserId) {
      console.log(`⚠️  Looking up user by stripeCustomerId in Convex...`);
      const users = await convex.query(api.users.getByStripeCustomerId, {
        stripeCustomerId: customerId
      });
      if (users && users.length > 0) {
        clerkUserId = users[0].clerkId;
        console.log(`✅ Found clerkUserId from Convex: ${clerkUserId}`);
      }
    }

    // Fallback 2: Check Stripe customer metadata
    if (!clerkUserId) {
      console.log(`⚠️  Checking Stripe customer metadata...`);
      const customer = await stripe.customers.retrieve(customerId);
      if ("deleted" in customer && customer.deleted) {
        throw new Error(`Customer ${customerId} has been deleted`);
      }
      clerkUserId = (customer as Stripe.Customer).metadata?.clerkUserId;
      if (clerkUserId) {
        console.log(`✅ Found clerkUserId from Stripe: ${clerkUserId}`);
      }
    }

    if (!clerkUserId) {
      throw new Error(
        `Cannot find clerkUserId for subscription ${subscription.id}. ` +
          `Customer ID: ${customerId}`
      );
    }

    // ✅ Call Convex HTTP action
    await syncSubscriptionToConvex({
      clerkUserId,
      stripeSubscriptionId: subscription.id,
      stripeCustomerId: customerId,
      status: subscription.status,
      priceId,
      planType: packageKey,
      currentPeriodStart:
        subscription.items.data[0].current_period_start * 1000,
      currentPeriodEnd: subscription.items.data[0].current_period_end * 1000,
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

// ✅ Handle subscription deletion
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
      }
    }

    // Fallback 2: Check Stripe customer metadata
    if (!clerkUserId) {
      const customer = await stripe.customers.retrieve(customerId);
      if ("deleted" in customer && customer.deleted) {
        throw new Error(
          `Cannot find clerkUserId for deleted subscription ${subscription.id}`
        );
      }
      clerkUserId = (customer as Stripe.Customer).metadata?.clerkUserId;
    }

    if (!clerkUserId) {
      throw new Error(
        `Cannot find clerkUserId for deleted subscription ${subscription.id}`
      );
    }

    // ✅ Call Convex HTTP action
    await syncSubscriptionToConvex({
      clerkUserId,
      stripeSubscriptionId: subscription.id,
      stripeCustomerId: customerId,
      status: "canceled",
      priceId: subscription.items.data[0]?.price.id || "",
      planType: "sandbox",
      currentPeriodStart:
        (subscription.items.data[0]?.current_period_start || 0) * 1000,
      currentPeriodEnd:
        (subscription.items.data[0]?.current_period_end || 0) * 1000,
      cancelAtPeriodEnd: false,
      maxGpts: 0
    });

    console.log(`✅ Subscription ${subscription.id} marked as deleted`);
    return { success: true };
  } catch (error) {
    console.error(`❌ Subscription deletion failed:`, error);
    return { success: false };
  }
}

// ✅ Handle invoice payment succeeded - FIXED VERSION
async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  console.log(`💰 Invoice payment succeeded: ${invoice.id}`);

  try {
    // ✅ FIX: Check multiple places for subscription ID
    let subscriptionId: string | null = null;

    // Method 1: Check in lines.data (most common for subscription invoices)
    const lineWithSubscription = invoice.lines.data.find(
      (line) => line.subscription
    );
    if (lineWithSubscription?.subscription) {
      subscriptionId =
        typeof lineWithSubscription.subscription === "string"
          ? lineWithSubscription.subscription
          : lineWithSubscription.subscription.id;
    }

    // Method 2: Check in parent.subscription_details (for new Stripe API versions)
    if (!subscriptionId && invoice.parent) {
      const parent = invoice.parent as any;
      if (
        parent.type === "subscription_details" &&
        parent.subscription_details?.subscription
      ) {
        subscriptionId = parent.subscription_details.subscription;
      }
    }

    if (!subscriptionId) {
      console.log("⏭️ No subscription for invoice, skipping...");
      return { success: true };
    }

    console.log(`✅ Found subscription: ${subscriptionId}`);

    // Get the subscription
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);

    // Trigger subscription update to sync latest status
    return await handleSubscriptionUpdate(subscription);
  } catch (error) {
    console.error(`❌ Invoice payment processing failed:`, error);
    return { success: false };
  }
}

// ✅ Handle invoice payment failed
async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  console.log(`❌ Invoice payment failed: ${invoice.id}`);

  try {
    const subscriptionId =
      (invoice.lines.data[0]?.subscription as string | null) || null;
    const customerId = invoice.customer as string;

    if (!subscriptionId || !customerId) {
      console.log(`⏭️ Missing subscription/customer, skipping...`);
      return { success: true };
    }

    // Get subscription
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    let clerkUserId = subscription.metadata?.clerkUserId;

    // Fallback 1: Look up by stripeCustomerId in Convex
    if (!clerkUserId) {
      const users = await convex.query(api.users.getByStripeCustomerId, {
        stripeCustomerId: customerId
      });
      if (users && users.length > 0) {
        clerkUserId = users[0].clerkId;
      }
    }

    // Fallback 2: Check Stripe customer metadata
    if (!clerkUserId) {
      const customer = await stripe.customers.retrieve(customerId);
      if ("deleted" in customer && customer.deleted) {
        throw new Error(
          `Cannot find clerkUserId for failed invoice ${invoice.id}`
        );
      }
      clerkUserId = (customer as Stripe.Customer).metadata?.clerkUserId;
    }

    if (!clerkUserId) {
      throw new Error(
        `Cannot find clerkUserId for failed invoice ${invoice.id}`
      );
    }

    const priceId = subscription.items.data[0]?.price.id || "";
    const packageKey = getPricePackageMapping(priceId);

    // ✅ Call Convex HTTP action
    await syncSubscriptionToConvex({
      clerkUserId,
      stripeSubscriptionId: subscription.id,
      stripeCustomerId: customerId,
      status: "past_due",
      priceId,
      planType: packageKey,
      currentPeriodStart:
        subscription.items.data[0].current_period_start * 1000,
      currentPeriodEnd: subscription.items.data[0].current_period_end * 1000,
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
