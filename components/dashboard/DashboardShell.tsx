// "use client";

// import { useQuery } from "convex/react";
// import { api } from "@/convex/_generated/api";

// import { useSyncUser } from "@/lib/hooks/useSyncUser";
// import { useAccessControl } from "@/lib/hooks/useAccessControl";

// import Loader from "./Loader";
// import WelcomeHeader from "./WelcomeHeader";
// import SubscriptionWarnings from "./SubscriptionWarnings";
// import GPTGrid from "./GPTGrid";
// import QuickActions from "./QuickActions";
// import UsageSummary from "./UsageSummary";

// export default function DashboardShell() {
//   useSyncUser();

//   const subscriptionData = useQuery(api.users.getUserSubscription);

//   useAccessControl(subscriptionData);

//   if (subscriptionData === undefined)
//     return <Loader text="Loading your dashboard..." />;

//   if (subscriptionData === null)
//     return <Loader text="Setting up your account..." />;

//   return (
//     <div className="min-h-screen p-6">
//       <div className="max-w-7xl mx-auto space-y-8">
//         <WelcomeHeader data={subscriptionData} />
//         <SubscriptionWarnings data={subscriptionData} />
//         <GPTGrid data={subscriptionData} />
//         <QuickActions />
//         <UsageSummary data={subscriptionData} />
//       </div>
//     </div>
//   );
// }
