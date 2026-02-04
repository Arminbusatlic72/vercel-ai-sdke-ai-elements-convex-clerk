import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { SubscriptionData } from "@/lib/types";

interface UseAccessControlOptions {
  subscriptionData: SubscriptionData | null | undefined;
  isUserLoaded: boolean;
  isSynced: boolean;
  redirectTo?: string;
}

export function useAccessControl({
  subscriptionData,
  isUserLoaded,
  isSynced,
  redirectTo = "/subscribe"
}: UseAccessControlOptions) {
  const router = useRouter();
  const hasCheckedAccessRef = useRef(false);

  useEffect(() => {
    // Reset the check flag when dependencies change
    // This allows re-checking when subscription data updates
    hasCheckedAccessRef.current = false;
  }, [subscriptionData]);

  useEffect(() => {
    // Only check access once per data state to prevent redirect loops
    if (hasCheckedAccessRef.current) return;

    // Don't check while still loading, syncing, or if data is not available
    if (
      !isUserLoaded ||
      !isSynced ||
      subscriptionData === undefined ||
      subscriptionData === null
    ) {
      return;
    }

    // Mark that we've checked
    hasCheckedAccessRef.current = true;

    const isAdmin = subscriptionData.role === "admin";
    const hasSubscription = !!subscriptionData.subscription;
    const subscriptionStatus = subscriptionData.subscription?.status;

    console.log("🎯 Access Check:", {
      isAdmin,
      hasSubscription,
      subscriptionStatus,
      canCreateProject: subscriptionData.canCreateProject,
      role: subscriptionData.role
    });

    // Allow access if:
    // 1. User is admin, OR
    // 2. User has an active subscription (active, trialing, past_due)
    const hasActiveSubscription =
      hasSubscription &&
      (subscriptionStatus === "active" ||
        subscriptionStatus === "trialing" ||
        subscriptionStatus === "past_due");

    const hasAccess = hasActiveSubscription || isAdmin;

    if (!hasAccess) {
      console.log(`🚨 Redirecting to ${redirectTo} - No active subscription`);
      router.replace(redirectTo);
    } else {
      console.log("✅ Access granted - User can view dashboard");
    }
  }, [subscriptionData, isUserLoaded, isSynced, router, redirectTo]);

  return {
    isChecking:
      !hasCheckedAccessRef.current &&
      (subscriptionData === undefined || subscriptionData === null)
  };
}
