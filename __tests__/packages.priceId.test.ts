import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../convex/_generated/server", () => ({
  query: (config: unknown) => config,
  mutation: (config: unknown) => config
}));

import { getPackageByPriceId } from "../convex/packages";

describe("packages.getPackageByPriceId", () => {
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

  it("returns correct package when stripePriceId matches", async () => {
    const { ctx, unique, query, withIndex } = makeCtx();
    const pkg = {
      _id: "pkg_2",
      name: "Brand Decoder",
      stripePriceId: "price_brand"
    };

    unique.mockResolvedValue(pkg);

    const result = await (getPackageByPriceId as any).handler(ctx, {
      stripePriceId: "price_brand"
    });

    expect(query).toHaveBeenCalledWith("packages");
    expect(withIndex).toHaveBeenCalledWith(
      "by_stripePriceId",
      expect.any(Function)
    );
    expect(result).toEqual(pkg);
  });

  it("returns null when no matching stripePriceId exists", async () => {
    const { ctx, unique } = makeCtx();
    unique.mockResolvedValue(null);

    const result = await (getPackageByPriceId as any).handler(ctx, {
      stripePriceId: "price_missing"
    });

    expect(result).toBeNull();
  });

  it("returns matched package when other non-matching packages exist", async () => {
    const { ctx, unique } = makeCtx();
    const matched = {
      _id: "pkg_match",
      name: "Regional Code Toolkit",
      stripePriceId: "price_regional"
    };

    unique.mockResolvedValue(matched);

    const result = await (getPackageByPriceId as any).handler(ctx, {
      stripePriceId: "price_regional"
    });

    expect(result).toEqual(matched);
  });
});
