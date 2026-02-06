"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useEffect, useState } from "react";

interface SubscriptionStatus {
  isActive: boolean;
  status:
    | "active"
    | "trialing"
    | "canceled"
    | "expires_soon"
    | "grace_period"
    | "past_due"
    | "no-subscription"
    | string;
  daysUntilExpiration: number | null;
  isInGracePeriod: boolean;
  isTrialing: boolean;
  messageKey: string;
  plan?: string;
  currentPeriodEnd?: number;
  trialEndDate?: number;
  gracePeriodEndDate?: number;
  cancelAtPeriodEnd?: boolean;
  lastPaymentFailedAt?: number;
}

interface UseSubscriptionStatusReturn extends SubscriptionStatus {
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
}

/**
 * Hook to get current subscription status and health
 * Includes trial status, grace period info, expiration dates
 * Updates in real-time as Convex syncs Stripe webhook data
 */
export function useSubscriptionStatus(): UseSubscriptionStatusReturn {
  const health = useQuery(api.subscriptions.getSubscriptionHealth);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (health !== undefined) {
      setIsLoading(false);
    }
  }, [health]);

  const refetch = () => {
    // Force re-fetch by updating a dependency
    // Convex automatically re-executes queries when dependencies change
    // This is typically handled by the Convex reactive system
    setIsLoading(true);
  };

  if (!health) {
    return {
      isActive: false,
      status: "no-subscription",
      daysUntilExpiration: null,
      isInGracePeriod: false,
      isTrialing: false,
      messageKey: "no_subscription",
      isLoading: true,
      isError: false,
      refetch
    };
  }

  return {
    ...health,
    isLoading,
    isError: false,
    refetch
  };
}

/**
 * Get human-readable status message
 */
export function getStatusMessage(status: string): string {
  const messages: Record<string, string> = {
    active: "Your subscription is active",
    trialing: "You're in a free trial period",
    canceled: "Your subscription has been canceled",
    expires_soon: "Your subscription expires at the end of the billing period",
    grace_period:
      "Your payment failed, but you have 7 days to update your payment method",
    past_due: "Your subscription has a past due payment",
    "no-subscription": "You don't have an active subscription"
  };

  return messages[status] || "Unknown subscription status";
}

/**
 * Get subscription expiration text for display
 */
export function getExpirationText(
  status: SubscriptionStatus,
  formatDate: (timestamp: number) => string
): string {
  if (status.status === "canceled") {
    return "Subscription canceled";
  }

  if (status.isTrialing && status.trialEndDate) {
    return `Trial ends ${formatDate(status.trialEndDate)}`;
  }

  if (status.isInGracePeriod && status.gracePeriodEndDate) {
    return `Grace period ends ${formatDate(status.gracePeriodEndDate)}`;
  }

  if (
    status.status === "active" &&
    !status.cancelAtPeriodEnd &&
    status.currentPeriodEnd
  ) {
    return `Renews ${formatDate(status.currentPeriodEnd)}`;
  }

  if (status.cancelAtPeriodEnd && status.currentPeriodEnd) {
    return `Expires ${formatDate(status.currentPeriodEnd)}`;
  }

  return "Unknown";
}

/**
 * Determine CSS class for status badge
 */
export function getStatusBadgeClass(status: string): string {
  const classes: Record<string, string> = {
    active: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    trialing: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    grace_period:
      "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    past_due: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    canceled: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
    expires_soon:
      "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
    "no-subscription":
      "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
  };

  return (
    classes[status] ||
    "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
  );
}
