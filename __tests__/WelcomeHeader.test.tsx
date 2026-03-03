import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import WelcomeHeader from "../components/dashboard/WelcomeHeader";
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
    packages: {
      getPackageByProductId: "packages/getPackageByProductId"
    }
  }
}));

vi.mock("@/lib/user", () => ({
  getUserDisplayName: vi.fn(() => "Test User")
}));

vi.mock("../components/dashboard/SubscriptionStatusBadge", () => ({
  default: ({ status, plan }: { status: string; plan: string }) => (
    <div>{`status:${status}|plan:${plan}`}</div>
  )
}));

describe("WelcomeHeader", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useUser).mockReturnValue({
      user: { id: "user_1" }
    } as unknown as ReturnType<typeof useUser>);
  });

  it("shows data.planLabel while pkg is loading (undefined)", () => {
    vi.mocked(useQuery).mockReturnValue(undefined);

    render(
      <WelcomeHeader
        data={{
          role: "member",
          planLabel: "StoryEngine",
          aiCredits: 42,
          subscription: { productId: "prod_123", status: "active", plan: "x" }
        }}
      />
    );

    expect(screen.getByText("Plan: StoryEngine")).toBeInTheDocument();
    expect(screen.queryByText("Plan: No active plan")).not.toBeInTheDocument();
  });

  it("shows pkg.name once query resolves successfully", () => {
    vi.mocked(useQuery).mockReturnValue({
      name: "Speculative Futures Toolkit"
    });

    render(
      <WelcomeHeader
        data={{
          role: "member",
          planLabel: "Fallback Plan",
          aiCredits: 42,
          subscription: { productId: "prod_123", status: "active", plan: "x" }
        }}
      />
    );

    expect(
      screen.getByText("Plan: Speculative Futures Toolkit")
    ).toBeInTheDocument();
  });

  it("shows 'No active plan' only when pkg resolves to null", () => {
    vi.mocked(useQuery).mockReturnValue(null);

    render(
      <WelcomeHeader
        data={{
          role: "member",
          planLabel: null,
          aiCredits: 42,
          subscription: {
            productId: "prod_unknown",
            status: "active",
            plan: "x"
          }
        }}
      />
    );

    expect(screen.getByText("Plan: No active plan")).toBeInTheDocument();
  });

  it("never shows 'No active plan' during loading state", () => {
    vi.mocked(useQuery).mockReturnValue(undefined);

    render(
      <WelcomeHeader
        data={{
          role: "member",
          planLabel: "Loading label",
          aiCredits: 42,
          subscription: { productId: "prod_123", status: "active", plan: "x" }
        }}
      />
    );

    expect(screen.getByText("Plan: Loading label")).toBeInTheDocument();
    expect(screen.queryByText("Plan: No active plan")).not.toBeInTheDocument();
  });

  it("renders correctly when subscription productId is missing/null", () => {
    vi.mocked(useQuery).mockReturnValue(undefined);

    render(
      <WelcomeHeader
        data={{
          role: "member",
          planLabel: null,
          aiCredits: 42,
          subscription: null
        }}
      />
    );

    expect(screen.getByText("Welcome, Test User 👋")).toBeInTheDocument();
    expect(screen.getByText("Role: MEMBER")).toBeInTheDocument();
    expect(screen.getByText("Plan: No active plan")).toBeInTheDocument();
    expect(useQuery).toHaveBeenCalledWith(
      "packages/getPackageByProductId",
      "skip"
    );
  });
});
