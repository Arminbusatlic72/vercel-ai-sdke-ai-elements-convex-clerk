import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

const http = httpRouter();

http.route({
  path: "/stripe/sync-subscription",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const body = await request.json();

    // Validate the request has required fields
    if (!body.clerkUserId || !body.stripeSubscriptionId) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400 }
      );
    }

    // Call the internal mutation
    await ctx.runMutation(internal.subscriptions.syncSubscriptionFromStripe, {
      clerkUserId: body.clerkUserId,
      stripeSubscriptionId: body.stripeSubscriptionId,
      stripeCustomerId: body.stripeCustomerId,
      status: body.status,
      priceId: body.priceId,
      planType: body.planType,
      currentPeriodStart: body.currentPeriodStart,
      currentPeriodEnd: body.currentPeriodEnd,
      cancelAtPeriodEnd: body.cancelAtPeriodEnd,
      maxGpts: body.maxGpts
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  })
});

export default http;
