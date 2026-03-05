import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { getUserDisplayName } from "@/lib/user";

import SubscriptionStatusBadge from "./SubscriptionStatusBadge";

export default function WelcomeHeader({ data }: { data: any }) {
  const { user } = useUser();
  const activeSubscriptions = useQuery(
    api.subscriptions.getUserSubscriptions,
    {}
  );

  const packageNames =
    activeSubscriptions === undefined
      ? data?.planLabel && data.planLabel !== "No active plan"
        ? [data.planLabel]
        : []
      : Array.from(
          new Set(
            activeSubscriptions.map(
              (sub: any) =>
                sub.packageName ||
                sub.productName ||
                sub.planType ||
                "Active Plan"
            )
          )
        );

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div className="space-y-1">
        <h1 className="text-3xl font-semibold">
          Welcome, {getUserDisplayName(user)} 👋
        </h1>

        <p className="text-sm text-muted-foreground">
          Role: {data.role.toUpperCase()}
        </p>

        {packageNames.length > 0 ? (
          <div>
            <p className="text-sm text-muted-foreground">Packages:</p>
            <ul className="list-disc pl-5 text-sm text-muted-foreground">
              {packageNames.map((name) => (
                <li key={name}>{name}</li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Packages: No active plan
          </p>
        )}
      </div>

      <div className="flex items-center gap-3">
        {data.subscription && (
          <SubscriptionStatusBadge
            status={data.subscription.status}
            plan={data.subscription.plan}
          />
        )}

        <div className="text-sm text-gray-600">
          <span className="font-semibold">{data.aiCredits}</span> AI Credits
        </div>
      </div>
    </div>
  );
}
