import { CheckCircle, AlertTriangle, XCircle } from "lucide-react";
import { getPlanMeta } from "@/lib/plan";

type Props = {
  status?: string;
  plan?: string;
};

export default function SubscriptionStatusBadge({
  status,
  plan = "basic"
}: Props) {
  const { label } = getPlanMeta(plan);

  const config = getStatusConfig(status);

  const Icon = config.icon;

  return (
    <div className="flex items-center gap-2">
      {/* Status pill */}
      <div
        className={`flex items-center gap-2 px-3 py-1 rounded-full ${config.bg}`}
      >
        <Icon className={`h-4 w-4 ${config.color}`} />

        <span className={`text-sm font-medium ${config.color}`}>
          {config.text}
        </span>
      </div>

      {/* Plan label */}
      <span className="text-xs font-medium bg-gray-100 px-2 py-1 rounded">
        {label.toUpperCase()}
      </span>
    </div>
  );
}

/* -------------------------------- */
/* Status → UI mapping (static safe) */
/* -------------------------------- */

function getStatusConfig(status?: string) {
  switch (status) {
    case "active":
      return {
        text: "Active",
        icon: CheckCircle,
        color: "text-green-700",
        bg: "bg-green-100"
      };

    case "trialing":
      return {
        text: "Trial",
        icon: CheckCircle,
        color: "text-blue-700",
        bg: "bg-blue-100"
      };

    case "incomplete":
      return {
        text: "Processing",
        icon: AlertTriangle,
        color: "text-yellow-700",
        bg: "bg-yellow-100"
      };

    case "past_due":
    case "unpaid":
      return {
        text: "Payment Failed",
        icon: XCircle,
        color: "text-red-700",
        bg: "bg-red-100"
      };

    case "canceled":
      return {
        text: "Canceled",
        icon: XCircle,
        color: "text-gray-600",
        bg: "bg-gray-100"
      };

    default:
      return {
        text: "None",
        icon: AlertTriangle,
        color: "text-gray-600",
        bg: "bg-gray-100"
      };
  }
}
