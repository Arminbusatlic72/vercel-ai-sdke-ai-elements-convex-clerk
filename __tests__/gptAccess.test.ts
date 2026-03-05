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
    const first = vi.fn();
    const collect = vi.fn();
    const withIndex = vi.fn(() => ({ unique, first, collect }));
    const query = vi.fn(() => ({ withIndex, collect }));

    return {
      ctx: { db: { query } },
      unique,
      first,
      collect,
      query,
      withIndex
    };
  }

  it("grants access when user package includes the GPT", async () => {
    const { ctx, unique, collect } = makeCtx();

    unique
      .mockResolvedValueOnce({
        role: "member",
        _id: "user_1"
      })
      .mockResolvedValueOnce({
        gptId: "gpt_1"
      });

    collect.mockResolvedValueOnce([
      {
        status: "active",
        gptIds: ["gpt_1"]
      }
    ]);

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
    const { ctx, unique, collect } = makeCtx();

    unique
      .mockResolvedValueOnce({
        role: "member",
        _id: "user_1"
      })
      .mockResolvedValueOnce({
        gptId: "gpt_1"
      });

    collect.mockResolvedValueOnce([
      {
        status: "active",
        gptIds: ["gpt_2"]
      }
    ]);

    const result = await (checkGptAccess as any).handler(ctx, {
      clerkUserId: "user_1",
      gptId: "gpt_1"
    });

    expect(result).toEqual(
      expect.objectContaining({
        hasAccess: false,
        reason: "GPT not included in your active subscriptions"
      })
    );
  });

  it("denies access when user has no subscription", async () => {
    const { ctx, unique, collect } = makeCtx();

    unique
      .mockResolvedValueOnce({ role: "member", _id: "user_1" })
      .mockResolvedValueOnce({ gptId: "gpt_1" });

    collect.mockResolvedValueOnce([]);

    const result = await (checkGptAccess as any).handler(ctx, {
      clerkUserId: "user_1",
      gptId: "gpt_1"
    });

    expect(result).toEqual(
      expect.objectContaining({
        hasAccess: false,
        reason: "GPT not included in your active subscriptions"
      })
    );
  });

  it("denies access when GPT does not exist", async () => {
    const { ctx, unique } = makeCtx();

    unique.mockResolvedValueOnce(null);

    const result = await (checkGptAccess as any).handler(ctx, {
      clerkUserId: "user_1",
      gptId: "gpt_1"
    });

    expect(result).toEqual(
      expect.objectContaining({
        hasAccess: false,
        reason: "GPT not found"
      })
    );
  });

  it("denies access when user is missing", async () => {
    const { ctx, unique } = makeCtx();

    unique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ gptId: "gpt_1" });

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
});
