import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useQuery, useMutation } from "convex/react";
import { useUser } from "@clerk/nextjs";
import ManageSubscription from "@/components/dashboard/ManageSubscription";

vi.mock("convex/react", () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn()
}));

vi.mock("@clerk/nextjs", () => ({
  useUser: vi.fn()
}));

vi.mock("@/convex/_generated/api", () => ({
  api: {
    subscriptions: {
      getUserSubscriptions: "subscriptions/getUserSubscriptions",
      cancelSubscriptionAtPeriodEnd:
        "subscriptions/cancelSubscriptionAtPeriodEnd",
      reactivateSubscription: "subscriptions/reactivateSubscription"
    },
    gpts: {
      listGpts: "gpts/listGpts"
    }
  }
}));

describe("ManageSubscription", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useUser).mockReturnValue({
      user: { id: "user_1" }
    } as any);

    vi.mocked(useMutation).mockReturnValue(
      vi.fn(async () => ({ success: true })) as any
    );

    vi.mocked(useQuery).mockImplementation((...args: unknown[]) => {
      const [query] = args;
      if (query === "gpts/listGpts") return [];
      return [];
    });
  });

  it("shows subscription limit warning at 6 active subscriptions", () => {
    const subscriptions = Array.from({ length: 6 }).map((_, index) => ({
      _id: `sub_${index}`,
      stripeSubscriptionId: `ss_${index}`,
      stripeCustomerId: "cus_1",
      status: "active",
      packageName: `Package ${index}`,
      productName: `Package ${index}`,
      gptIds: []
    }));

    render(
      <ManageSubscription
        data={{
          role: "user",
          plan: "none",
          planLabel: "none",
          aiCredits: 0,
          subscription: null
        }}
        subscriptions={subscriptions}
      />
    );

    expect(
      screen.getByText(
        "Subscription limit reached (6 active). Cancel one before adding a new package."
      )
    ).toBeInTheDocument();
  });

  it("renders a card per subscription from subscriptions table", () => {
    const subscriptions = [
      {
        _id: "sub_1",
        stripeSubscriptionId: "ss_1",
        stripeCustomerId: "cus_1",
        status: "active",
        packageName: "Speculative Futures Toolkit",
        productName: "Speculative Futures Toolkit",
        gptIds: []
      },
      {
        _id: "sub_2",
        stripeSubscriptionId: "ss_2",
        stripeCustomerId: "cus_1",
        status: "trialing",
        packageName: "Brand Decoder",
        productName: "Brand Decoder",
        gptIds: []
      }
    ];

    render(
      <ManageSubscription
        data={{
          role: "user",
          plan: "none",
          planLabel: "none",
          aiCredits: 0,
          subscription: null
        }}
        subscriptions={subscriptions}
      />
    );

    expect(screen.getByText("Speculative Futures Toolkit")).toBeInTheDocument();
    expect(screen.getByText("Brand Decoder")).toBeInTheDocument();
  });
});
