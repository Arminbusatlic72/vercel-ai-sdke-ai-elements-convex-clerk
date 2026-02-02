import { useUser } from "@clerk/nextjs";
import { getUserDisplayName } from "@/lib/user";

import SubscriptionStatusBadge from "./SubscriptionStatusBadge";

export default function WelcomeHeader({ data }: { data: any }) {
  const { user } = useUser();

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div className="space-y-1">
        <h1 className="text-3xl font-semibold">
          Welcome, {getUserDisplayName(user)} 👋
        </h1>

        <p className="text-sm text-muted-foreground">
          Role: {data.role.toUpperCase()}
        </p>

        {/* Plan label comes from root */}
        <p className="text-sm text-muted-foreground">
          Plan: {data.planLabel || "No Plan"}
        </p>
      </div>

      {data.subscription && (
        <div className="flex items-center gap-3">
          <SubscriptionStatusBadge
            status={data.subscription.status}
            plan={data.subscription.plan}
          />

          <div className="text-sm text-gray-600">
            <span className="font-semibold">{data.aiCredits}</span> AI Credits
          </div>
        </div>
      )}
    </div>
  );
}
