// // app/api/webhooks/stripe/route.ts - FIXED VERSION
// import { headers } from "next/headers";
// import { NextResponse } from "next/server";
// import Stripe from "stripe";
// import { ConvexHttpClient } from "convex/browser";
// import { api } from "@/convex/_generated/api";
// import { createClerkClient } from "@clerk/backend";

// const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
// const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
//   apiVersion: "2025-12-15.clover"
// });

// // Create Clerk client for backend
// const clerkClient = createClerkClient({
//   secretKey: process.env.CLERK_SECRET_KEY!
// });
// async function verifySubscriptionInConvex(subscription: Stripe.Subscription) {
//   try {
//     const customerId = subscription.customer as string;

//     // Use your existing query to find user by Stripe customer ID
//     const users = await convex.query(api.users.getByStripeCustomerId, {
//       stripeCustomerId: customerId
//     });

//     if (users && users.length > 0) {
//       const user = users[0];
//       console.log(`✅ Verified user in Convex:`, {
//         userId: user._id,
//         subscription: user.subscription,
//         stripeCustomerId: user.stripeCustomerId
//       });
//       return true;
//     } else {
//       console.error(`❌ No user found with Stripe customer ID: ${customerId}`);
//       return false;
//     }
//   } catch (error) {
//     console.error(`❌ Error verifying in Convex:`, error);
//     return false;
//   }
// }
// export async function POST(request: Request) {
//   const body = await request.text();
//   const headersList = await headers();
//   const signature = headersList.get("stripe-signature")!;

//   let event: Stripe.Event;

//   try {
//     event = stripe.webhooks.constructEvent(
//       body,
//       signature,
//       process.env.STRIPE_WEBHOOK_SECRET!
//     );
//   } catch (err: any) {
//     console.error(`❌ Webhook signature verification failed: ${err.message}`);
//     return NextResponse.json({ error: err.message }, { status: 400 });
//   }

//   console.log(`✅ Received Stripe event: ${event.type}`);

//   try {
//     // Handle the event
//     const result = await handleStripeEvent(event);

//     if (result.success) {
//       return NextResponse.json({ received: true });
//     } else {
//       return NextResponse.json(
//         { error: "Webhook handling failed" },
//         { status: 500 }
//       );
//     }
//   } catch (error: any) {
//     console.error("❌ Webhook processing error:", error);
//     return NextResponse.json(
//       { error: "Webhook handler failed" },
//       { status: 500 }
//     );
//   }
// }

// async function handleStripeEvent(event: Stripe.Event) {
//   switch (event.type) {
//     case "customer.subscription.updated":
//     case "customer.subscription.created":
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

//     case "payment_intent.succeeded":
//       return await handlePaymentIntentSucceeded(
//         event.data.object as Stripe.PaymentIntent
//       );

//     case "payment_intent.payment_failed":
//       return await handlePaymentIntentFailed(
//         event.data.object as Stripe.PaymentIntent
//       );

//     case "payment_intent.requires_action":
//       return await handlePaymentIntentRequiresAction(
//         event.data.object as Stripe.PaymentIntent
//       );

//     default:
//       console.log(`🤷 Unhandled event type: ${event.type}`);
//       return { success: true };
//   }
// }

// async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
//   console.log(`🔄 Handling subscription update: ${subscription.id}`);

//   try {
//     // Call Convex action to update subscription
//     const result = await convex.action(api.stripe.handleStripeWebhook, {
//       eventType: "customer.subscription.updated",
//       data: {
//         object: subscription,
//         previous_attributes: {}
//       }
//     });

//     // Update Clerk metadata for fast access
//     await updateClerkMetadata(subscription);

//     console.log(`✅ Subscription ${subscription.id} updated successfully`);
//     return { success: true };
//   } catch (error) {
//     console.error(
//       `❌ Failed to update subscription ${subscription.id}:`,
//       error
//     );
//     throw error;
//   }
// }

// async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
//   console.log(`🗑️ Handling subscription deletion: ${subscription.id}`);

//   try {
//     await convex.action(api.stripe.handleStripeWebhook, {
//       eventType: "customer.subscription.deleted",
//       data: {
//         object: subscription,
//         previous_attributes: {}
//       }
//     });

//     // Update Clerk metadata
//     await updateClerkMetadata(subscription);

//     console.log(`✅ Subscription ${subscription.id} marked as deleted`);
//     return { success: true };
//   } catch (error) {
//     console.error(
//       `❌ Failed to delete subscription ${subscription.id}:`,
//       error
//     );
//     throw error;
//   }
// }

// async function updateClerkMetadata(subscription: Stripe.Subscription) {
//   try {
//     // Extract metadata from subscription
//     const clerkUserId = subscription.metadata?.clerkUserId;
//     if (!clerkUserId) {
//       console.warn(
//         `⚠️ No clerkUserId in subscription metadata: ${subscription.id}`
//       );
//       return;
//     }

//     // Get price/plan info
//     const priceId = subscription.items.data[0]?.price.id;
//     const isBasicPlan =
//       priceId === process.env.NEXT_PUBLIC_STRIPE_PRICE_BASIC_MONTHLY ||
//       (priceId || "").includes("basic");

//     const plan = isBasicPlan ? "basic" : "pro";
//     const maxGpts = isBasicPlan ? 3 : 6;

//     // FIX: Use type assertion to access current_period_end
//     const subscriptionAny = subscription as any;

//     // Update Clerk user metadata
//     await clerkClient.users.updateUser(clerkUserId, {
//       publicMetadata: {
//         subscriptionStatus: subscription.status,
//         subscriptionId: subscription.id,
//         plan,
//         maxGpts,
//         currentPeriodEnd: subscriptionAny.current_period_end, // ✅ Fixed with type assertion
//         cancelAtPeriodEnd: subscriptionAny.cancel_at_period_end || false // ✅ Fixed
//       }
//     });

//     console.log(`✅ Updated Clerk metadata for user: ${clerkUserId}`);
//   } catch (error) {
//     console.error("❌ Failed to update Clerk metadata:", error);
//   }
// }

// async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
//   console.log(`💰 Invoice payment succeeded: ${invoice.id}`);

//   const invoiceAny = invoice as any;

//   if (invoiceAny.subscription || invoiceAny.subscription_id) {
//     const subscriptionId =
//       invoiceAny.subscription || invoiceAny.subscription_id;

//     try {
//       // Get the subscription to update status
//       const subscription = await stripe.subscriptions.retrieve(subscriptionId);

//       // Update in Convex
//       await convex.action(api.stripe.handleStripeWebhook, {
//         eventType: "invoice.payment_succeeded",
//         data: {
//           object: invoice
//         }
//       });

//       console.log(`✅ Payment for subscription ${subscriptionId} processed`);
//       return { success: true };
//     } catch (error) {
//       console.error(
//         `❌ Failed to process invoice payment for ${subscriptionId}:`,
//         error
//       );
//       throw error;
//     }
//   }

//   return { success: true };
// }

// async function handlePaymentIntentSucceeded(
//   paymentIntent: Stripe.PaymentIntent
// ) {
//   console.log(`✅ Payment intent succeeded: ${paymentIntent.id}`);
//   return { success: true };
// }

// async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
//   console.log(`❌ Payment intent failed: ${paymentIntent.id}`);

//   const paymentIntentAny = paymentIntent as any;

//   if (paymentIntentAny.invoice) {
//     const invoiceId =
//       typeof paymentIntentAny.invoice === "string"
//         ? paymentIntentAny.invoice
//         : paymentIntentAny.invoice.id;

//     console.log(`⚠️ Failed payment for invoice: ${invoiceId}`);
//   }

//   return { success: true };
// }

// async function handlePaymentIntentRequiresAction(
//   paymentIntent: Stripe.PaymentIntent
// ) {
//   console.log(`🔄 Payment requires action: ${paymentIntent.id}`);
//   return { success: true };
// }

// async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
//   console.log(`❌ Invoice payment failed: ${invoice.id}`);

//   const invoiceAny = invoice as any;

//   if (invoiceAny.subscription || invoiceAny.subscription_id) {
//     const subscriptionId =
//       invoiceAny.subscription || invoiceAny.subscription_id;
//     console.log(`⚠️ Failed payment for subscription: ${subscriptionId}`);
//   }

//   return { success: true };
// }

// app/api/stripe-webhook/route.ts
import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const headersList = await headers();
    const signature = headersList.get("stripe-signature") as string;

    // Forward to Convex for processing
    const result = await convex.action(api.stripe.handleStripeWebhook, {
      signature,
      rawBody: body
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Webhook error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
