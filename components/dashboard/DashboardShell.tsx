"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useUser } from "@clerk/nextjs";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { useSyncUser } from "@/lib/hooks/useSyncUser";
import { useAccessControl } from "@/lib/hooks/useAccessControl";

import Loader from "./Loader";
import WelcomeHeader from "./WelcomeHeader";
import SubscriptionWarnings from "./SubscriptionWarnings";
import GPTGrid from "./GPTGrid";
import QuickActions from "./QuickActions";
import ManageSubscription from "./ManageSubscription";
import { SubscriptionData } from "@/lib/types";

interface DashboardShellProps {
  data: SubscriptionData;
}

export default function DashboardShell({ data }: DashboardShellProps) {
  const { isLoaded: isUserLoaded, user } = useUser();
  const { isSynced } = useSyncUser();
  const searchParams = useSearchParams();
  const justSubscribed = searchParams.get("success") === "true";

  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 10;

  const subscriptionData = useQuery(api.users.getUserSubscription);
  const allSubscriptions = useQuery(
    api.subscriptions.getUserSubscriptions,
    user?.id ? { clerkUserId: user.id } : "skip"
  );

  useAccessControl({
    subscriptionData,
    isUserLoaded,
    isSynced,
    redirectTo: "/subscribe"
  });

  // Auto-retry fetching subscription data if just subscribed
  useEffect(() => {
    if (
      justSubscribed &&
      !subscriptionData?.subscription &&
      retryCount < maxRetries
    ) {
      const timer = setTimeout(() => {
        setRetryCount((prev) => prev + 1);
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [justSubscribed, subscriptionData, retryCount]);

  if (
    subscriptionData === undefined ||
    (justSubscribed &&
      !subscriptionData?.subscription &&
      retryCount < maxRetries)
  ) {
    return (
      <Loader
        text={
          justSubscribed
            ? `Processing your subscription... (${retryCount}/${maxRetries})`
            : "Loading your dashboard..."
        }
      />
    );
  }

  if (subscriptionData === null)
    return <Loader text="Setting up your account..." />;

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        <WelcomeHeader data={subscriptionData} />
        <SubscriptionWarnings data={subscriptionData} />
        <ManageSubscription
          data={subscriptionData}
          subscriptions={allSubscriptions}
        />
        <GPTGrid />
        <QuickActions subscriptions={allSubscriptions} />
      </div>
    </div>
  );
}
