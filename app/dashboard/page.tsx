"use client";
import { Authenticated, Unauthenticated, useQuery } from "convex/react";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { api } from "@/convex/_generated/api";
import { SubscriptionData } from "@/lib/types";
import { useSyncUser } from "@/lib/hooks/useSyncUser";
import { useAccessControl } from "@/lib/hooks/useAccessControl";

export default function DashboardPage() {
  const { isSynced, isUserLoaded, syncError, isRetrying, retryCount } =
    useSyncUser();

  const subscriptionData = useQuery(
    api.users.getUserSubscription,
    isSynced ? {} : "skip"
  ) as SubscriptionData | undefined;

  useAccessControl({
    subscriptionData,
    isUserLoaded,
    isSynced,
    redirectTo: "/subscribe"
  });

  const isLoading =
    !isUserLoaded || !isSynced || subscriptionData === undefined;

  return (
    <>
      <Unauthenticated>
        <div className="flex h-full items-center justify-center">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-semibold">Please Sign In</h1>
            <p className="text-sm text-muted-foreground">
              Sign in to access your dashboard
            </p>
          </div>
        </div>
      </Unauthenticated>

      <Authenticated>
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center space-y-2">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto" />
              <p className="text-sm text-muted-foreground">
                {!isSynced
                  ? isRetrying
                    ? `Retrying connection... (${retryCount}/3)`
                    : "Setting up your account..."
                  : "Loading dashboard..."}
              </p>
              {syncError && !isRetrying && (
                <p className="text-xs text-red-500 mt-2">{syncError}</p>
              )}
            </div>
          </div>
        ) : (
          <DashboardShell data={subscriptionData} />
        )}
      </Authenticated>
    </>
  );
}
