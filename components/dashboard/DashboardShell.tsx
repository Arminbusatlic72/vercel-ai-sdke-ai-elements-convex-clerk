"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

import { useSyncUser } from "@/lib/hooks/useSyncUser";
import { useAccessControl } from "@/lib/hooks/useAccessControl";

import Loader from "./Loader";
import WelcomeHeader from "./WelcomeHeader";
import SubscriptionWarnings from "./SubscriptionWarnings";
import GPTGrid from "./GPTGrid";
import QuickActions from "./QuickActions";
import UsageSummary from "./UsageSummary";
import { SubscriptionData } from "@/lib/types";
interface DashboardShellProps {
  data: SubscriptionData;
}
export default function DashboardShell({ data }: DashboardShellProps) {
  useSyncUser();

  const subscriptionData = useQuery(api.users.getUserSubscription);

  useAccessControl(subscriptionData);

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
      </div>
    </div>
  );
}

// // DashboardShell.tsx
// import React from "react";
// import WelcomeHeader from "./WelcomeHeader";

// interface DashboardShellProps {
//   data: any; // Replace `any` with your SubscriptionData type if available
// }

// export default function DashboardShell({ data }: DashboardShellProps) {
//   return (
//     <div className="min-h-screen p-6">
//       <WelcomeHeader data={data} />

//       {/* Rest of your dashboard content */}
//     </div>
//   );
// }
