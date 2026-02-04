"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useUser } from "@clerk/nextjs";

import { useSyncUser } from "@/lib/hooks/useSyncUser";
import { useAccessControl } from "@/lib/hooks/useAccessControl";

import Loader from "./Loader";
import WelcomeHeader from "./WelcomeHeader";
import SubscriptionWarnings from "./SubscriptionWarnings";
import GPTGrid from "./GPTGrid";
import QuickActions from "./QuickActions";
import UsageSummary from "./UsageSummary";
import ManageSubscription from "./ManageSubscription";
import { SubscriptionData } from "@/lib/types";

interface DashboardShellProps {
  data: SubscriptionData;
}

export default function DashboardShell({ data }: DashboardShellProps) {
  const { isLoaded: isUserLoaded } = useUser();
  const { isSynced } = useSyncUser();

  const subscriptionData = useQuery(api.users.getUserSubscription);

  useAccessControl({
    subscriptionData,
    isUserLoaded,
    isSynced,
    redirectTo: "/subscribe"
  });

  if (subscriptionData === undefined)
    return <Loader text="Loading your dashboard..." />;

  if (subscriptionData === null)
    return <Loader text="Setting up your account..." />;

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        <WelcomeHeader data={subscriptionData} />
        <SubscriptionWarnings data={subscriptionData} />
        <GPTGrid />
        <QuickActions />
        <UsageSummary data={subscriptionData} />
        <ManageSubscription data={subscriptionData} />
      </div>
    </div>
  );
}
