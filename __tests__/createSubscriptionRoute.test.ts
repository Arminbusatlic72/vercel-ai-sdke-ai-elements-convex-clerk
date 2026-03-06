import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  return {
    auth: vi.fn(),
    convexQuery: vi.fn(),
    convexMutation: vi.fn(),
    convexAction: vi.fn(),
    stripeSubscriptionsUpdate: vi.fn(),
    stripeSubscriptionsRetrieve: vi.fn(),
    stripeSubscriptionsCancel: vi.fn()
  };
});

vi.mock("@clerk/nextjs/server", () => ({
  auth: mocks.auth
}));

vi.mock("convex/browser", () => ({
  ConvexHttpClient: class {
    query = mocks.convexQuery;
    mutation = mocks.convexMutation;
    action = mocks.convexAction;
  }
}));

vi.mock("stripe", () => ({
  default: class Stripe {
    subscriptions = {
      update: mocks.stripeSubscriptionsUpdate,
      retrieve: mocks.stripeSubscriptionsRetrieve,
      cancel: mocks.stripeSubscriptionsCancel,
      create: vi.fn()
    };
  }
}));

vi.mock("@/convex/_generated/api", () => ({
  api: {
    subscriptions: {
      getUserActiveSubscriptionCount:
        "subscriptions/getUserActiveSubscriptionCount",
      getUserSubscriptions: "subscriptions/getUserSubscriptions",
      syncSubscriptionFromStripe: "subscriptions/syncSubscriptionFromStripe"
    },
    packages: {
      getPackageByPriceId: "packages/getPackageByPriceId"
    },
    stripe: {
      createSubscription: "stripe/createSubscription"
    },
    users: {
      saveStripeCustomerId: "users/saveStripeCustomerId",
      getUserByClerkId: "users/getUserByClerkId",
      createUser: "users/createUser"
    }
  }
}));

describe("create-subscription route immediate sync cap catch", () => {
  let POST: (request: Request) => Promise<Response>;

  beforeAll(async () => {
    process.env.NEXT_PUBLIC_CONVEX_URL = "https://example.convex.cloud";
    process.env.STRIPE_SECRET_KEY = "sk_test_123";
    ({ POST } = await import("../app/api/stripe/create-subscription/route"));
  });

  beforeEach(() => {
    vi.clearAllMocks();

    mocks.auth.mockResolvedValue({ userId: "user_test_1" });

    mocks.convexQuery.mockImplementation(async (fn: unknown) => {
      if (fn === "subscriptions/getUserActiveSubscriptionCount") {
        return {
          activeCount: 5,
          statuses: ["active", "active", "active", "active", "active"],
          cancelAtPeriodEnd: [false, false, false, false, false]
        };
      }

      if (fn === "subscriptions/getUserSubscriptions") {
        return new Array(5).fill(null).map((_, index) => ({
          _id: `sub_${index}`,
          status: "active",
          productId: `prod_${index}`
        }));
      }

      if (fn === "packages/getPackageByPriceId") {
        return {
          stripeProductId: "prod_not_subscribed"
        };
      }

      if (fn === "users/getUserByClerkId") {
        return {
          _id: "user_internal_1",
          clerkId: "user_test_1"
        };
      }

      throw new Error(`Unexpected query fn: ${String(fn)}`);
    });

    mocks.convexAction.mockImplementation(async (fn: unknown) => {
      if (fn === "stripe/createSubscription") {
        return {
          subscriptionId: "sub_test_race",
          customerId: "cus_test_1"
        };
      }

      throw new Error(`Unexpected action fn: ${String(fn)}`);
    });

    mocks.convexMutation.mockImplementation(async (fn: unknown) => {
      if (fn === "users/saveStripeCustomerId") return { success: true };

      if (fn === "subscriptions/syncSubscriptionFromStripe") {
        throw { data: { code: "MAX_SUBSCRIPTIONS_REACHED" } };
      }

      if (fn === "users/createUser") {
        return { success: true };
      }

      throw new Error(`Unexpected mutation fn: ${String(fn)}`);
    });

    mocks.stripeSubscriptionsUpdate.mockResolvedValue({ id: "sub_test_race" });
    mocks.stripeSubscriptionsRetrieve.mockResolvedValue({
      id: "sub_test_race",
      status: "active",
      cancel_at_period_end: false,
      items: {
        data: [
          {
            current_period_start: 1700000000,
            current_period_end: 1702592000,
            price: {
              product: "prod_race_1"
            }
          }
        ]
      }
    });
    mocks.stripeSubscriptionsCancel.mockResolvedValue({ id: "sub_test_race" });
  });

  it("returns 400 and cancels newly created stripe subscription when immediate sync hits max cap", async () => {
    const request = new Request(
      "http://localhost/api/stripe/create-subscription",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          stripePaymentMethodId: "pm_test_1",
          priceId: "price_test_1",
          email: "race@test.com",
          packageKey: "sandbox",
          maxGpts: 5,
          tier: "paid"
        })
      }
    );

    const response = await POST(request);
    const body = await response.json();

    expect(mocks.convexAction).toHaveBeenCalledTimes(1);
    expect(mocks.convexAction).toHaveBeenCalledWith(
      "stripe/createSubscription",
      expect.any(Object)
    );

    expect(mocks.stripeSubscriptionsCancel).toHaveBeenCalledTimes(1);
    expect(mocks.stripeSubscriptionsCancel).toHaveBeenCalledWith(
      "sub_test_race"
    );

    expect(response.status).toBe(400);
    expect(body.error).toBe("MAX_SUBSCRIPTIONS_REACHED");

    const subscriptionMutationCalls = mocks.convexMutation.mock.calls.filter(
      (call) => String(call[0]).startsWith("subscriptions/")
    );
    expect(subscriptionMutationCalls).toHaveLength(1);
    expect(subscriptionMutationCalls[0][0]).toBe(
      "subscriptions/syncSubscriptionFromStripe"
    );

    const createUserCalls = mocks.convexMutation.mock.calls.filter(
      (call) => call[0] === "users/createUser"
    );
    expect(createUserCalls.length).toBe(0);
  });
});
