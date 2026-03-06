import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  getGraceLabel,
  getGraceRemainingMs,
  isEntitled
} from "../convex/lib/subscriptionUtils";

const DAY_MS = 24 * 60 * 60 * 1000;
const FIXED_NOW = new Date("2026-03-05T12:00:00.000Z");

describe("subscriptionUtils.isEntitled", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns true for active", () => {
    expect(isEntitled({ status: "active" })).toBe(true);
  });

  it("returns true for trialing", () => {
    expect(isEntitled({ status: "trialing" })).toBe(true);
  });

  it("returns true for past_due with no grace end (legacy safe default)", () => {
    expect(isEntitled({ status: "past_due" })).toBe(true);
  });

  it("returns true for past_due with grace end in 3 days", () => {
    expect(
      isEntitled({
        status: "past_due",
        paymentFailureGracePeriodEnd: Date.now() + 3 * DAY_MS
      })
    ).toBe(true);
  });

  it("returns false for past_due with expired grace end", () => {
    expect(
      isEntitled({
        status: "past_due",
        paymentFailureGracePeriodEnd: Date.now() - DAY_MS
      })
    ).toBe(false);
  });

  it("returns false for canceled", () => {
    expect(isEntitled({ status: "canceled" })).toBe(false);
  });

  it("returns false for unpaid", () => {
    expect(isEntitled({ status: "unpaid" })).toBe(false);
  });

  it("returns false for paused", () => {
    expect(isEntitled({ status: "paused" })).toBe(false);
  });

  it("returns false for incomplete", () => {
    expect(isEntitled({ status: "incomplete" })).toBe(false);
  });

  it("returns false for incomplete_expired", () => {
    expect(isEntitled({ status: "incomplete_expired" })).toBe(false);
  });
});

describe("subscriptionUtils.getGraceRemainingMs", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns 0 when timestamp is not set", () => {
    expect(getGraceRemainingMs({})).toBe(0);
  });

  it("returns positive remaining ms for timestamp in the future (+3 days)", () => {
    const remaining = getGraceRemainingMs({
      paymentFailureGracePeriodEnd: Date.now() + 3 * DAY_MS
    });

    expect(remaining).toBeGreaterThan(0);
    expect(remaining).toBeGreaterThanOrEqual(3 * DAY_MS - 1);
    expect(remaining).toBeLessThanOrEqual(3 * DAY_MS);
  });

  it("returns 0 for timestamp in the past (-1 day)", () => {
    expect(
      getGraceRemainingMs({
        paymentFailureGracePeriodEnd: Date.now() - DAY_MS
      })
    ).toBe(0);
  });
});

describe("subscriptionUtils.getGraceLabel", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns "Grace period expired" when timestamp is not set', () => {
    expect(getGraceLabel({})).toBe("Grace period expired");
  });

  it('returns "2 days remaining" for timestamp 25 hours from now (ceil)', () => {
    expect(
      getGraceLabel({
        paymentFailureGracePeriodEnd: Date.now() + 25 * 60 * 60 * 1000
      })
    ).toBe("2 days remaining");
  });

  it('returns "1 day remaining" for timestamp 24 hours from now', () => {
    expect(
      getGraceLabel({
        paymentFailureGracePeriodEnd: Date.now() + 24 * 60 * 60 * 1000
      })
    ).toBe("1 day remaining");
  });

  it('returns "Grace period expired" for timestamp in the past', () => {
    expect(
      getGraceLabel({
        paymentFailureGracePeriodEnd: Date.now() - DAY_MS
      })
    ).toBe("Grace period expired");
  });
});
