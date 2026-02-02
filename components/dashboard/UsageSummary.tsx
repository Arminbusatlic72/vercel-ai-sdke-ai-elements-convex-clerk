import { getPlanMeta } from "@/lib/plan";
import SubscriptionStatusIcon from "./SubscriptionStatusIcon";

export default function UsageSummary({ data }: { data: any }) {
  const meta = getPlanMeta(data.plan);
  const Icon = meta.icon;

  return (
    <div className="rounded-xl border p-4">
      <div className="flex justify-between items-center">
        <div>
          <p className="text-sm text-muted-foreground">Plan</p>
          <p className="text-lg font-semibold">{meta.label}</p>
        </div>

        <Icon className={`h-6 w-6 ${meta.color}`} />
      </div>

      <div className="mt-4">Credits: {data.aiCredits}</div>

      <SubscriptionStatusIcon status={data.subscription?.status} />
    </div>
  );
}
