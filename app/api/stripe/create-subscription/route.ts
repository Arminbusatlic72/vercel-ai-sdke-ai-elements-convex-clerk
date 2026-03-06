// app/api/stripe/create-subscription/route.ts
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import Stripe from "stripe";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-12-15.clover"
});

function isMaxSubscriptionsReachedError(error: unknown): boolean {
  const maybeError = error as any;
  if (maybeError?.data?.code === "MAX_SUBSCRIPTIONS_REACHED") return true;
  if (maybeError?.code === "MAX_SUBSCRIPTIONS_REACHED") return true;

  const raw = JSON.stringify(error);
  return typeof raw === "string" && raw.includes("MAX_SUBSCRIPTIONS_REACHED");
}

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { stripePaymentMethodId, priceId, email, packageKey, maxGpts, tier } =
      await request.json();

    const capSnapshot = await convex.query(
      api.subscriptions.getUserActiveSubscriptionCount,
      {
        clerkUserId: userId
      }
    );

    const activeCount = capSnapshot?.activeCount ?? 0;

    if (activeCount >= 6) {
      return NextResponse.json(
        {
          error: "MAX_SUBSCRIPTIONS_REACHED",
          current: activeCount,
          max: 6
        },
        { status: 400 }
      );
    }

    const activeSubscriptions = await convex.query(
      api.subscriptions.getUserSubscriptions,
      {
        clerkUserId: userId
      }
    );

    // Resolve productId from priceId via packages table
    // productId is not in request body — only available post-Stripe-call
    if (priceId) {
      const requestedPackage = await convex.query(
        api.packages.getPackageByPriceId,
        {
          stripePriceId: priceId
        }
      );
      const requestedProductId = requestedPackage?.stripeProductId;

      // Guard: prevent duplicate subscription for same product
      if (requestedProductId) {
        const alreadySubscribed = activeSubscriptions?.some(
          (sub: any) => sub.productId && sub.productId === requestedProductId
        );

        if (alreadySubscribed) {
          return NextResponse.json(
            {
              error: "ALREADY_SUBSCRIBED",
              message:
                "You already have an active subscription for this package.",
              productId: requestedProductId
            },
            { status: 400 }
          );
        }
      }
    }

    // ✅ VALIDATE PRICE ID
    if (!priceId) {
      return NextResponse.json({ error: "Missing priceId" }, { status: 400 });
    }

    if (!priceId.startsWith("price_")) {
      console.error(
        `❌ Invalid price ID detected: ${priceId}. Expected format: price_xxxx`
      );

      if (priceId.includes("rice_")) {
        console.error(
          `   This looks like a typo in environment variables or database (rice_ instead of price_).`
        );
        console.error(
          `   Please check .env.local and reseed the packages table.`
        );
      }

      return NextResponse.json(
        {
          error: `Invalid price ID: "${priceId}". Expected format: price_xxxx (must start with "price_")`
        },
        { status: 400 }
      );
    }

    // 1️⃣ Create Stripe subscription via Convex action
    const result = await convex.action(api.stripe.createSubscription, {
      clerkUserId: userId,
      stripePaymentMethodId: stripePaymentMethodId ?? null,
      priceId,
      email
    });

    if (result.subscriptionId) {
      try {
        await stripe.subscriptions.update(result.subscriptionId, {
          description: "Max 6 active subscriptions per account."
        });
      } catch (descriptionError) {
        console.warn(
          "⚠️ Failed to set subscription description policy text:",
          descriptionError
        );
      }
    }

    // 2️⃣ Save stripeCustomerId immediately
    await convex.mutation(api.users.saveStripeCustomerId, {
      clerkId: userId,
      stripeCustomerId: result.customerId
    });

    // 3️⃣ Ensure user exists
    const user = await convex.query(api.users.getUserByClerkId, {
      clerkId: userId
    });

    if (!user) {
      await convex.mutation(api.users.createUser, {
        clerkId: userId,
        email,
        stripeCustomerId: result.customerId
      });
    }

    // 4️⃣ IMMEDIATE SYNC: Fetch subscription details from Stripe and sync to Convex
    // This provides instant feedback while webhook is still processing
    if (result.subscriptionId) {
      try {
        console.log("🔄 Immediately syncing subscription to Convex...");

        const subscription = await stripe.subscriptions.retrieve(
          result.subscriptionId
        );

        // Determine plan type from packageKey or price metadata
        const planType = mapPackageKeyToPlanType(packageKey || "sandbox");

        const syncResult = await convex.mutation(
          api.subscriptions.syncSubscriptionFromStripe,
          {
            clerkUserId: userId,
            stripeSubscriptionId: subscription.id,
            stripeCustomerId: result.customerId,
            status: subscription.status,
            priceId: priceId,
            productId: subscription.items.data[0].price.product as string,
            planType: planType,
            currentPeriodStart: subscription.items.data[0].current_period_start,
            currentPeriodEnd: subscription.items.data[0].current_period_end,
            cancelAtPeriodEnd: subscription.cancel_at_period_end,
            maxGpts: maxGpts || 5
          }
        );

        const syncErrorCode =
          syncResult && "errorCode" in syncResult
            ? (syncResult as { errorCode?: string }).errorCode
            : undefined;

        if (
          syncResult &&
          syncResult.success === false &&
          syncErrorCode === "MAX_SUBSCRIPTIONS_REACHED"
        ) {
          try {
            await stripe.subscriptions.cancel(result.subscriptionId);
          } catch (cancelError) {
            console.error(
              "⚠️ Failed to cancel over-limit Stripe subscription after sync rejection:",
              cancelError
            );
          }

          return NextResponse.json(
            { error: "MAX_SUBSCRIPTIONS_REACHED", max: 6 },
            { status: 400 }
          );
        }

        console.log("✅ Subscription synced immediately to Convex");
      } catch (syncError) {
        if (isMaxSubscriptionsReachedError(syncError)) {
          try {
            await stripe.subscriptions.cancel(result.subscriptionId);
          } catch (cancelError) {
            console.error(
              "⚠️ Failed to cancel over-limit Stripe subscription after sync rejection:",
              cancelError
            );
          }

          return NextResponse.json(
            { error: "MAX_SUBSCRIPTIONS_REACHED", max: 6 },
            { status: 400 }
          );
        }

        // Don't fail the request if immediate sync fails - webhook will handle it
        console.error(
          "⚠️ Immediate sync failed (webhook will retry):",
          syncError
        );
      }
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("API Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

// Helper function to map package key to plan type
function mapPackageKeyToPlanType(
  packageKey: string
): "sandbox" | "clientProject" | "basic" | "pro" {
  const map: Record<string, "sandbox" | "clientProject" | "basic" | "pro"> = {
    free: "sandbox",
    "analyzing-trends": "sandbox",
    "sandbox-summer": "sandbox",
    "sandbox-workshop": "sandbox",
    "gpts-classroom": "sandbox",
    "substack-gpt": "sandbox",
    "speaker-gpt": "sandbox",
    "sandbox-level": "sandbox",
    "client-project": "clientProject",
    basic: "basic",
    pro: "pro"
  };

  return map[packageKey] || "sandbox";
}
