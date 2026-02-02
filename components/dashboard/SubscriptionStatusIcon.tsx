import { CheckCircle, AlertTriangle, XCircle } from "lucide-react";

type Props = {
  status?: string;
};

export default function SubscriptionStatusIcon({ status }: Props) {
  switch (status) {
    case "active":
    case "trialing":
      return <CheckCircle className="h-6 w-6 text-green-500" />;

    case "incomplete":
      return <AlertTriangle className="h-6 w-6 text-yellow-500" />;

    case "past_due":
    case "unpaid":
      return <XCircle className="h-6 w-6 text-red-500" />;

    case "canceled":
      return <XCircle className="h-6 w-6 text-gray-400" />;

    default:
      return <AlertTriangle className="h-6 w-6 text-gray-400" />;
  }
}
