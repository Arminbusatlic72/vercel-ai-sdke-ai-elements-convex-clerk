import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import DashboardSubscriptionsPage from "@/app/dashboard/subscriptions/page";
import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";

vi.mock("@clerk/nextjs", () => ({
  useUser: vi.fn()
}));

vi.mock("convex/react", () => ({
  useQuery: vi.fn()
}));

vi.mock("@/convex/_generated/api", () => ({
  api: {
    subscriptions: {
      getUserSubscriptions: "subscriptions/getUserSubscriptions",
      getUserGpts: "subscriptions/getUserGpts"
    },
    gpts: {
      listGpts: "gpts/listGpts"
    },
    packages: {
      getAllPackages: "packages/getAllPackages"
    }
  }
}));

vi.mock("@/components/subscriptions/SubscriptionList", () => ({
  SubscriptionList: () => <div>SubscriptionList</div>
}));

vi.mock("@/components/subscriptions/SubscriptionGptGrid", () => ({
  SubscriptionGptGrid: () => <div>SubscriptionGptGrid</div>
}));

vi.mock("@/components/subscriptions/SubscriptionLimitBadge", () => ({
  SubscriptionLimitBadge: ({
    activeCount,
    max
  }: {
    activeCount: number;
    max: number;
  }) => <div>{`${activeCount}/${max}`}</div>
}));

describe("DashboardSubscriptionsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useUser).mockReturnValue({
      user: { id: "user_1" }
    } as unknown as ReturnType<typeof useUser>);
  });

  it("shows limit warning when user has 6 active subscriptions", () => {
    vi.mocked(useQuery).mockImplementation((query: unknown) => {
      if (query === "subscriptions/getUserSubscriptions") {
        return new Array(6).fill(null).map((_, index) => ({
          _id: `sub_${index}`,
          stripeSubscriptionId: `ss_${index}`,
          stripeCustomerId: "cus_123",
          productId: `prod_${index}`,
          status: "active",
          productName: `Package ${index}`,
          packageName: `Package ${index}`,
          gptIds: []
        }));
      }
      if (query === "subscriptions/getUserGpts") return [];
      if (query === "gpts/listGpts") return [];
      if (query === "packages/getAllPackages") return [];
      return undefined;
    });

    render(<DashboardSubscriptionsPage />);

    expect(
      screen.getByText(
        "Subscription limit reached (6 active). Cancel one before adding a new package."
      )
    ).toBeInTheDocument();
  });

  it("does not show limit warning when user has fewer than 6 active subscriptions", () => {
    vi.mocked(useQuery).mockImplementation((query: unknown) => {
      if (query === "subscriptions/getUserSubscriptions") {
        return new Array(5).fill(null).map((_, index) => ({
          _id: `sub_${index}`,
          stripeSubscriptionId: `ss_${index}`,
          stripeCustomerId: "cus_123",
          productId: `prod_${index}`,
          status: "active",
          productName: `Package ${index}`,
          packageName: `Package ${index}`,
          gptIds: []
        }));
      }
      if (query === "subscriptions/getUserGpts") return [];
      if (query === "gpts/listGpts") return [];
      if (query === "packages/getAllPackages") return [];
      return undefined;
    });

    render(<DashboardSubscriptionsPage />);

    expect(
      screen.queryByText(
        "Subscription limit reached (6 active). Cancel one before adding a new package."
      )
    ).not.toBeInTheDocument();
  });
});
