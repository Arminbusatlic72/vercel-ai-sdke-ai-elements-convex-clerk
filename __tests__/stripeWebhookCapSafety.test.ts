import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  return {
    constructEvent: vi.fn(),
    subscriptionsRetrieve: vi.fn(),
    subscriptionsCancel: vi.fn(),
    invoicesList: vi.fn(),
    refundsCreate: vi.fn(),
    customersRetrieve: vi.fn(),
    customersUpdate: vi.fn(),
    convexQuery: vi.fn(),
    convexMutation: vi.fn(),
    recordWebhookEvent: vi.fn(),
    getWebhookEvent: vi.fn()
  };
});

vi.mock("next/headers", () => ({
  headers: vi.fn(async () => ({
    get: vi.fn(() => "sig_test")
  }))
}));

vi.mock("stripe", () => {
  return {
    default: class Stripe {
      webhooks = {
        constructEvent: mocks.constructEvent
      };

      subscriptions = {
        retrieve: mocks.subscriptionsRetrieve,
        cancel: mocks.subscriptionsCancel
      };

      invoices = {
        list: mocks.invoicesList
      };

      refunds = {
        create: mocks.refundsCreate
      };

      customers = {
        retrieve: mocks.customersRetrieve,
        update: mocks.customersUpdate
      };
    }
  };
});

vi.mock("convex/browser", () => ({
  ConvexHttpClient: class {
    query = mocks.convexQuery;
    mutation = mocks.convexMutation;
  }
}));

vi.mock("@/convex/_generated/api", () => ({
  api: {
    webhooks: {
      getWebhookEvent: "webhooks:getWebhookEvent",
      recordWebhookEvent: "webhooks:recordWebhookEvent",
      savePendingSubscriptionByEmail: "webhooks:savePendingSubscriptionByEmail"
    },
    users: {
      getByStripeCustomerId: "users:getByStripeCustomerId",
      getOrCreateUserFromWebhook: "users:getOrCreateUserFromWebhook"
    },
    packages: {
      getPackageByProductId: "packages:getPackageByProductId"
    },
    gpts: {
      listGpts: "gpts:listGpts"
    },
    subscriptions: {
      upsertSubscription: "subscriptions:upsertSubscription",
      cancelSubscription: "subscriptions:cancelSubscription"
    }
  }
}));

describe("Stripe webhook cap safety net", () => {
  const now = Date.now();

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();

    process.env.NEXT_PUBLIC_CONVEX_URL = "https://example.convex.cloud";
    process.env.STRIPE_SECRET_KEY = "sk_test_123";
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_123";

    mocks.getWebhookEvent.mockResolvedValue(null);
    mocks.recordWebhookEvent.mockResolvedValue(undefined);

    mocks.convexQuery.mockImplementation(async (fn: unknown, args: any) => {
      if (fn === "webhooks:getWebhookEvent") return mocks.getWebhookEvent();
      if (fn === "users:getByStripeCustomerId") return [];
      if (fn === "packages:getPackageByProductId") {
        return {
          _id: "pkg_1",
          name: "Test Package",
          key: "sandbox",
          maxGpts: 5
        };
      }
      if (fn === "gpts:listGpts") {
        return [{ packageId: "pkg_1", gptId: "gpt_alpha" }];
      }
      throw new Error(
        `Unexpected query fn: ${String(fn)} ${JSON.stringify(args)}`
      );
    });

    mocks.convexMutation.mockImplementation(async (fn: unknown) => {
      if (fn === "webhooks:recordWebhookEvent") return undefined;
      if (fn === "users:getOrCreateUserFromWebhook") return { _id: "user_1" };
      if (fn === "subscriptions:upsertSubscription") return undefined;
      if (fn === "subscriptions:cancelSubscription") return undefined;
      throw new Error(`Unexpected mutation fn: ${String(fn)}`);
    });

    mocks.customersRetrieve.mockResolvedValue({
      id: "cus_123",
      deleted: false,
      metadata: {}
    });
    mocks.customersUpdate.mockResolvedValue(undefined);

    mocks.subscriptionsCancel.mockResolvedValue({ id: "sub_over_cap" });
    mocks.invoicesList.mockResolvedValue({
      data: [
        {
          id: "in_1",
          amount_paid: 1200,
          payment_intent: "pi_123"
        }
      ]
    });
    mocks.refundsCreate.mockResolvedValue({ id: "re_1" });

    mocks.subscriptionsRetrieve.mockResolvedValue({
      id: "sub_over_cap",
      customer: "cus_123",
      status: "active",
      metadata: {
        clerkUserId: "clerk_123"
      },
      cancel_at_period_end: false,
      items: {
        data: [
          {
            current_period_start: Math.floor(now / 1000),
            current_period_end: Math.floor(
              (now + 7 * 24 * 60 * 60 * 1000) / 1000
            ),
            price: {
              id: "price_123",
              product: "prod_123"
            }
          }
        ]
      }
    });
  });

  function makeSubscriptionEvent(
    type: "customer.subscription.created" | "customer.subscription.updated"
  ) {
    return {
      id: `evt_${type}`,
      type,
      data: {
        object: {
          id: "sub_over_cap",
          customer: "cus_123",
          status: "active",
          metadata: {
            clerkUserId: "clerk_123"
          },
          cancel_at_period_end: false,
          items: {
            data: [
              {
                current_period_start: 1700000000,
                current_period_end: 1702592000,
                price: {
                  id: "price_123",
                  product: "prod_123"
                }
              }
            ]
          }
        }
      }
    };
  }

  function makeSubscriptionDeletedEvent() {
    return {
      id: "evt_customer.subscription.deleted",
      type: "customer.subscription.deleted",
      data: {
        object: {
          id: "sub_deleted_1",
          customer: "cus_123",
          status: "canceled",
          metadata: {
            clerkUserId: "clerk_123"
          },
          cancel_at_period_end: false,
          items: {
            data: [
              {
                current_period_start: 1700000000,
                current_period_end: 1702592000,
                price: {
                  id: "price_123",
                  product: "prod_123"
                }
              }
            ]
          }
        }
      }
    };
  }

  function makeInvoicePaymentFailedEvent() {
    return {
      id: "evt_invoice.payment_failed",
      type: "invoice.payment_failed",
      data: {
        object: {
          id: "in_failed_1",
          customer: "cus_123",
          lines: {
            data: [
              {
                subscription: "sub_over_cap"
              }
            ]
          }
        }
      }
    };
  }

  function makeCheckoutCompletedEvent() {
    return {
      id: "evt_checkout.session.completed",
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_test_1",
          subscription: "sub_over_cap"
        }
      }
    };
  }

  it("customer.subscription.created over cap auto-cancels and refunds", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    mocks.constructEvent.mockReturnValue(
      makeSubscriptionEvent("customer.subscription.created")
    );

    mocks.convexMutation.mockImplementation(async (fn: unknown) => {
      if (fn === "webhooks:recordWebhookEvent") return undefined;
      if (fn === "users:getOrCreateUserFromWebhook") return { _id: "user_1" };
      if (fn === "subscriptions:upsertSubscription") {
        throw { data: { code: "MAX_SUBSCRIPTIONS_REACHED" } };
      }
      throw new Error(`Unexpected mutation fn: ${String(fn)}`);
    });

    const { POST } = await import("../app/api/webhooks/stripe/route");

    const response = await POST(
      new Request("http://localhost/api/webhooks/stripe", {
        method: "POST",
        body: JSON.stringify({ any: "payload" })
      })
    );

    expect(mocks.subscriptionsCancel).toHaveBeenCalledTimes(1);
    expect(mocks.subscriptionsCancel).toHaveBeenCalledWith("sub_over_cap");
    expect(mocks.refundsCreate).toHaveBeenCalledTimes(1);
    expect(mocks.refundsCreate).toHaveBeenCalledWith({
      payment_intent: "pi_123",
      reason: "duplicate"
    });

    expect(response.status).toBe(409);
    const json = await response.json();
    expect(json.error).toBe("MAX_SUBSCRIPTIONS_REACHED");
    expect(json.action).toBe("subscription_auto_canceled");

    expect(warnSpy).toHaveBeenCalledWith(
      "[SUBSCRIPTION_CAP_EXCEEDED]",
      expect.objectContaining({
        stripeSubscriptionId: "sub_over_cap",
        stripeCustomerId: "cus_123",
        clerkUserId: "clerk_123",
        action: "auto_canceled_and_refunded"
      })
    );
  });

  it("customer.subscription.created under cap does not auto-cancel", async () => {
    mocks.constructEvent.mockReturnValue(
      makeSubscriptionEvent("customer.subscription.created")
    );

    const { POST } = await import("../app/api/webhooks/stripe/route");

    const response = await POST(
      new Request("http://localhost/api/webhooks/stripe", {
        method: "POST",
        body: JSON.stringify({ any: "payload" })
      })
    );

    expect(mocks.subscriptionsCancel).not.toHaveBeenCalled();
    expect(mocks.convexMutation).toHaveBeenCalledWith(
      "subscriptions:upsertSubscription",
      expect.any(Object)
    );
    expect(response.status).toBe(200);
  });

  it("customer.subscription.updated over cap never auto-cancels", async () => {
    mocks.constructEvent.mockReturnValue(
      makeSubscriptionEvent("customer.subscription.updated")
    );

    mocks.convexMutation.mockImplementation(async (fn: unknown) => {
      if (fn === "webhooks:recordWebhookEvent") return undefined;
      if (fn === "users:getOrCreateUserFromWebhook") return { _id: "user_1" };
      if (fn === "subscriptions:upsertSubscription") {
        throw { data: { code: "MAX_SUBSCRIPTIONS_REACHED" } };
      }
      throw new Error(`Unexpected mutation fn: ${String(fn)}`);
    });

    const { POST } = await import("../app/api/webhooks/stripe/route");

    const response = await POST(
      new Request("http://localhost/api/webhooks/stripe", {
        method: "POST",
        body: JSON.stringify({ any: "payload" })
      })
    );

    expect(mocks.subscriptionsCancel).not.toHaveBeenCalled();
    expect(mocks.refundsCreate).not.toHaveBeenCalled();

    expect(response.status).toBe(409);
    const json = await response.json();
    expect(json.error).toBe("MAX_SUBSCRIPTIONS_REACHED");
    expect(json.action).toBeUndefined();
  });

  it("customer.subscription.created over cap with free invoice does not refund", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    mocks.constructEvent.mockReturnValue(
      makeSubscriptionEvent("customer.subscription.created")
    );

    mocks.invoicesList.mockResolvedValue({
      data: [
        {
          id: "in_free_1",
          amount_paid: 0,
          payment_intent: null
        }
      ]
    });

    mocks.convexMutation.mockImplementation(async (fn: unknown) => {
      if (fn === "webhooks:recordWebhookEvent") return undefined;
      if (fn === "users:getOrCreateUserFromWebhook") return { _id: "user_1" };
      if (fn === "subscriptions:upsertSubscription") {
        throw { data: { code: "MAX_SUBSCRIPTIONS_REACHED" } };
      }
      if (fn === "subscriptions:cancelSubscription") return undefined;
      throw new Error(`Unexpected mutation fn: ${String(fn)}`);
    });

    const { POST } = await import("../app/api/webhooks/stripe/route");

    const response = await POST(
      new Request("http://localhost/api/webhooks/stripe", {
        method: "POST",
        body: JSON.stringify({ any: "payload" })
      })
    );

    expect(mocks.subscriptionsCancel).toHaveBeenCalledTimes(1);
    expect(mocks.refundsCreate).not.toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining("no charge to refund")
    );
    expect(response.status).toBe(409);
  });

  it("customer.subscription.created over cap absorbs cancel failure", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    mocks.constructEvent.mockReturnValue(
      makeSubscriptionEvent("customer.subscription.created")
    );

    mocks.subscriptionsCancel.mockRejectedValue(
      new Error("Stripe cancel failed")
    );

    mocks.convexMutation.mockImplementation(async (fn: unknown) => {
      if (fn === "webhooks:recordWebhookEvent") return undefined;
      if (fn === "users:getOrCreateUserFromWebhook") return { _id: "user_1" };
      if (fn === "subscriptions:upsertSubscription") {
        throw { data: { code: "MAX_SUBSCRIPTIONS_REACHED" } };
      }
      if (fn === "subscriptions:cancelSubscription") return undefined;
      throw new Error(`Unexpected mutation fn: ${String(fn)}`);
    });

    const { POST } = await import("../app/api/webhooks/stripe/route");

    const response = await POST(
      new Request("http://localhost/api/webhooks/stripe", {
        method: "POST",
        body: JSON.stringify({ any: "payload" })
      })
    );

    expect(response.status).toBe(409);
    expect(mocks.refundsCreate).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        "Failed to auto-cancel/refund over-limit subscription"
      ),
      expect.any(Error)
    );
  });

  it("customer.subscription.created over cap absorbs refund failure", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    mocks.constructEvent.mockReturnValue(
      makeSubscriptionEvent("customer.subscription.created")
    );

    mocks.subscriptionsCancel.mockResolvedValue({ id: "sub_over_cap" });
    mocks.invoicesList.mockResolvedValue({
      data: [
        {
          id: "in_paid_1",
          amount_paid: 2900,
          payment_intent: "pi_paid_1"
        }
      ]
    });
    mocks.refundsCreate.mockRejectedValue(new Error("Refund failed"));

    mocks.convexMutation.mockImplementation(async (fn: unknown) => {
      if (fn === "webhooks:recordWebhookEvent") return undefined;
      if (fn === "users:getOrCreateUserFromWebhook") return { _id: "user_1" };
      if (fn === "subscriptions:upsertSubscription") {
        throw { data: { code: "MAX_SUBSCRIPTIONS_REACHED" } };
      }
      if (fn === "subscriptions:cancelSubscription") return undefined;
      throw new Error(`Unexpected mutation fn: ${String(fn)}`);
    });

    const { POST } = await import("../app/api/webhooks/stripe/route");

    const response = await POST(
      new Request("http://localhost/api/webhooks/stripe", {
        method: "POST",
        body: JSON.stringify({ any: "payload" })
      })
    );

    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body.error).toBe("MAX_SUBSCRIPTIONS_REACHED");
    expect(errorSpy).toHaveBeenCalled();
    expect(mocks.subscriptionsCancel).toHaveBeenCalledTimes(1);
    expect(mocks.refundsCreate).toHaveBeenCalledTimes(1);
    expect(mocks.customersUpdate).not.toHaveBeenCalled();
  });

  it("customer.subscription.deleted cancels in Convex only", async () => {
    mocks.constructEvent.mockReturnValue(makeSubscriptionDeletedEvent());

    const { POST } = await import("../app/api/webhooks/stripe/route");

    const response = await POST(
      new Request("http://localhost/api/webhooks/stripe", {
        method: "POST",
        body: JSON.stringify({ any: "payload" })
      })
    );

    expect(mocks.convexMutation).toHaveBeenCalledWith(
      "subscriptions:cancelSubscription",
      expect.objectContaining({
        stripeSubscriptionId: "sub_deleted_1"
      })
    );
    expect(mocks.subscriptionsCancel).not.toHaveBeenCalled();
    expect(response.status).toBe(200);
  });

  it("invoice.payment_failed sets past_due with grace period metadata", async () => {
    mocks.constructEvent.mockReturnValue(makeInvoicePaymentFailedEvent());

    const before = Date.now();

    const { POST } = await import("../app/api/webhooks/stripe/route");

    const response = await POST(
      new Request("http://localhost/api/webhooks/stripe", {
        method: "POST",
        body: JSON.stringify({ any: "payload" })
      })
    );

    const upsertCall = mocks.convexMutation.mock.calls.find(
      (call) => call[0] === "subscriptions:upsertSubscription"
    );

    expect(upsertCall).toBeTruthy();
    const stripeData = upsertCall?.[1]?.stripeData;
    expect(stripeData.status).toBe("past_due");

    const after = Date.now();
    const expectedGrace = before + 7 * 24 * 60 * 60 * 1000;

    expect(
      Math.abs(stripeData.lastPaymentFailedAt - after)
    ).toBeLessThanOrEqual(5000);
    expect(
      Math.abs(stripeData.paymentFailureGracePeriodEnd - expectedGrace)
    ).toBeLessThanOrEqual(5000);
    expect(mocks.subscriptionsCancel).not.toHaveBeenCalled();
    expect(response.status).toBe(200);
  });

  it("checkout.session.completed over cap returns 409 and auto-cancels", async () => {
    mocks.constructEvent.mockReturnValue(makeCheckoutCompletedEvent());

    mocks.convexMutation.mockImplementation(async (fn: unknown) => {
      if (fn === "webhooks:recordWebhookEvent") return undefined;
      if (fn === "users:getOrCreateUserFromWebhook") return { _id: "user_1" };
      if (fn === "subscriptions:upsertSubscription") {
        throw { data: { code: "MAX_SUBSCRIPTIONS_REACHED" } };
      }
      if (fn === "subscriptions:cancelSubscription") return undefined;
      throw new Error(`Unexpected mutation fn: ${String(fn)}`);
    });

    const { POST } = await import("../app/api/webhooks/stripe/route");

    const response = await POST(
      new Request("http://localhost/api/webhooks/stripe", {
        method: "POST",
        body: JSON.stringify({ any: "payload" })
      })
    );

    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body.error).toBe("MAX_SUBSCRIPTIONS_REACHED");
    expect(body.action).toBe("subscription_auto_canceled");
    expect(mocks.subscriptionsCancel).toHaveBeenCalledTimes(1);
    expect(mocks.subscriptionsCancel).toHaveBeenCalledWith("sub_over_cap");
  });

  it("checkout.session.completed under cap processes normally", async () => {
    mocks.constructEvent.mockReturnValue(makeCheckoutCompletedEvent());

    const { POST } = await import("../app/api/webhooks/stripe/route");

    const response = await POST(
      new Request("http://localhost/api/webhooks/stripe", {
        method: "POST",
        body: JSON.stringify({ any: "payload" })
      })
    );

    expect(response.status).toBe(200);
    expect(mocks.convexMutation).toHaveBeenCalledWith(
      "subscriptions:upsertSubscription",
      expect.any(Object)
    );
    expect(mocks.subscriptionsCancel).not.toHaveBeenCalled();
  });
});
