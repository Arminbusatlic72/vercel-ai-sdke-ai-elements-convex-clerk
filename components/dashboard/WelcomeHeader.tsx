import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { getUserDisplayName } from "@/lib/user";

import SubscriptionStatusBadge from "./SubscriptionStatusBadge";

export default function WelcomeHeader({ data }: { data: any }) {
  const { user } = useUser();
  const productId = data?.subscription?.productId?.trim();

  const pkg = useQuery(
    api.packages.getPackageByProductId,
    productId
      ? {
          stripeProductId: productId
        }
      : "skip"
  );

  const rawPlan = data?.planLabel || pkg?.name || data?.subscription?.plan;
  const planName = rawPlan
    ? String(rawPlan)
        .replace(/[-_]+/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase())
    : "No active plan";

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
        <p className="text-sm text-muted-foreground">Plan: {planName}</p>
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
