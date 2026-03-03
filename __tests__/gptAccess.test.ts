import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../convex/_generated/server", () => ({
  query: (config: unknown) => config
}));

import { checkGptAccess } from "../convex/gptAccess";

describe("gptAccess.checkGptAccess", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function makeCtx() {
    const unique = vi.fn();
    const withIndex = vi.fn(() => ({ unique }));
    const query = vi.fn(() => ({ withIndex }));

    return {
      ctx: { db: { query } },
      unique,
      query,
      withIndex
    };
  }

  it("grants access when user package includes the GPT", async () => {
    const { ctx, unique } = makeCtx();

    unique
      .mockResolvedValueOnce({
        role: "member",
        subscription: {
          status: "active",
          productId: "prod_1"
        }
      })
      .mockResolvedValueOnce({
        gptId: "gpt_1",
        packageId: "pkg_1"
      })
      .mockResolvedValueOnce({ _id: "pkg_1" });

    const result = await (checkGptAccess as any).handler(ctx, {
      clerkUserId: "user_1",
      gptId: "gpt_1"
    });

    expect(result).toEqual(
      expect.objectContaining({
        hasAccess: true,
        reason: null
      })
    );
  });

  it("denies access when GPT is not included in user's package", async () => {
    const { ctx, unique } = makeCtx();

    unique
      .mockResolvedValueOnce({
        role: "member",
        subscription: {
          status: "active",
          productId: "prod_1"
        }
      })
      .mockResolvedValueOnce({
        gptId: "gpt_1",
        packageId: "pkg_other"
      })
      .mockResolvedValueOnce({ _id: "pkg_1" });

    const result = await (checkGptAccess as any).handler(ctx, {
      clerkUserId: "user_1",
      gptId: "gpt_1"
    });

    expect(result).toEqual(
      expect.objectContaining({
        hasAccess: false,
        reason: "GPT not included in your subscription package"
      })
    );
  });

  it("denies access when user has no subscription", async () => {
    const { ctx, unique } = makeCtx();

    unique
      .mockResolvedValueOnce({ role: "member", subscription: null })
      .mockResolvedValueOnce({ gptId: "gpt_1", packageId: "pkg_1" });

    const result = await (checkGptAccess as any).handler(ctx, {
      clerkUserId: "user_1",
      gptId: "gpt_1"
    });

    expect(result).toEqual(
      expect.objectContaining({
        hasAccess: false,
        reason: "No active subscription"
      })
    );
  });

  it("denies access when productId resolves to no package", async () => {
    const { ctx, unique } = makeCtx();

    unique
      .mockResolvedValueOnce({
        role: "member",
        subscription: {
          status: "active",
          productId: "prod_missing"
        }
      })
      .mockResolvedValueOnce({ gptId: "gpt_1", packageId: "pkg_1" })
      .mockResolvedValueOnce(null);

    const result = await (checkGptAccess as any).handler(ctx, {
      clerkUserId: "user_1",
      gptId: "gpt_1"
    });

    expect(result).toEqual(
      expect.objectContaining({
        hasAccess: false,
        reason: "Package not found"
      })
    );
  });

  it("does not grant access when package query returns undefined (loading-like mock)", async () => {
    const { ctx, unique } = makeCtx();

    unique
      .mockResolvedValueOnce({
        role: "member",
        subscription: {
          status: "active",
          productId: "prod_1"
        }
      })
      .mockResolvedValueOnce({ gptId: "gpt_1", packageId: "pkg_1" })
      .mockResolvedValueOnce(undefined);

    const result = await (checkGptAccess as any).handler(ctx, {
      clerkUserId: "user_1",
      gptId: "gpt_1"
    });

    expect(result).toEqual(
      expect.objectContaining({
        hasAccess: false,
        reason: "Package not found"
      })
    );
  });
});
