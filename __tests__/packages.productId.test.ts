import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../convex/_generated/server", () => ({
  query: (config: unknown) => config,
  mutation: (config: unknown) => config
}));

import { getPackageByProductId } from "../convex/packages";

describe("packages.getPackageByProductId", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function makeCtx() {
    const unique = vi.fn();
    const withIndex = vi.fn(() => ({ unique }));
    const query = vi.fn(() => ({ withIndex }));

    return {
      ctx: { db: { query } },
      query,
      withIndex,
      unique
    };
  }

  it("returns correct package when stripeProductId matches", async () => {
    const { ctx, unique, query, withIndex } = makeCtx();
    const pkg = {
      _id: "pkg_1",
      name: "Speculative Futures Toolkit",
      stripeProductId: "prod_speculative"
    };

    unique.mockResolvedValue(pkg);

    const result = await (getPackageByProductId as any).handler(ctx, {
      stripeProductId: "prod_speculative"
    });

    expect(query).toHaveBeenCalledWith("packages");
    expect(withIndex).toHaveBeenCalledWith(
      "by_stripeProductId",
      expect.any(Function)
    );
    expect(result).toEqual(pkg);
  });

  it("returns null when no matching stripeProductId exists", async () => {
    const { ctx, unique } = makeCtx();
    unique.mockResolvedValue(null);

    const result = await (getPackageByProductId as any).handler(ctx, {
      stripeProductId: "prod_missing"
    });

    expect(result).toBeNull();
  });

  it("surfaces error when multiple rows exist for same stripeProductId", async () => {
    const { ctx, unique } = makeCtx();
    unique.mockRejectedValue(new Error("More than one document found"));

    await expect(
      (getPackageByProductId as any).handler(ctx, {
        stripeProductId: "prod_duplicate"
      })
    ).rejects.toThrow("More than one document found");
  });
});
