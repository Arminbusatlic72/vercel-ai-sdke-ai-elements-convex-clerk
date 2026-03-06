import { SubscriptionStatus } from "../../types/subscriptions";

/**
 * Returns true if a subscription grants active entitlement.
 *
 * Rules:
 * - active / trialing → always entitled
 * - past_due → entitled only within paymentFailureGracePeriodEnd window
 *   (if no grace period set, defaults to entitled — covers legacy rows)
 * - all other statuses (canceled, unpaid, paused, etc.) → not entitled
 */
export function isEntitled(sub: {
  status: string;
  paymentFailureGracePeriodEnd?: number;
}): boolean {
  if (sub.status === "active" || sub.status === "trialing") {
    return true;
  }

  if (sub.status === "past_due") {
    if (!sub.paymentFailureGracePeriodEnd) {
      return true;
    }
    return Date.now() < sub.paymentFailureGracePeriodEnd;
  }

  return false;
}

/**
 * Returns the remaining grace period in milliseconds.
 * Returns 0 if grace period has expired or was never set.
 */
export function getGraceRemainingMs(sub: {
  paymentFailureGracePeriodEnd?: number;
}): number {
  if (!sub.paymentFailureGracePeriodEnd) return 0;
  return Math.max(0, sub.paymentFailureGracePeriodEnd - Date.now());
}

/**
 * Returns a human-readable grace period label.
 * Example: "3 days remaining" or "Grace period expired"
 */
export function getGraceLabel(sub: {
  paymentFailureGracePeriodEnd?: number;
}): string {
  const remaining = getGraceRemainingMs(sub);
  if (remaining === 0) return "Grace period expired";
  const days = Math.ceil(remaining / (1000 * 60 * 60 * 24));
  return `${days} day${days === 1 ? "" : "s"} remaining`;
}

export type { SubscriptionStatus };
