import { AlertTriangle, XCircle } from "lucide-react";
import Link from "next/link";

type Props = {
  data: any; // you can replace with your SubscriptionData type
};

export default function SubscriptionWarnings({ data }: Props) {
  // admins never see warnings
  if (data.role === "admin") return null;

  const sub = data.subscription;

  // 🚫 no subscription at all
  if (!sub) {
    return (
      <WarningBox
        icon={AlertTriangle}
        title="Subscription Required"
        message="You need an active subscription to access all features."
        href="/subscribe"
        linkText="Subscribe Now →"
        color="amber"
      />
    );
  }

  // ⏳ processing
  if (sub.status === "incomplete" || sub.status === "incomplete_expired") {
    return (
      <WarningBox
        icon={AlertTriangle}
        title="Payment Processing"
        message="Your subscription payment is being processed. This may take a few minutes."
        href="/subscribe"
        linkText="View Subscription Status →"
        color="amber"
      />
    );
  }

  // ❌ failed payment
  if (sub.status === "past_due" || sub.status === "unpaid") {
    return (
      <WarningBox
        icon={XCircle}
        title="Payment Required"
        message="Your subscription payment failed. Please update your payment method."
        href="/subscribe"
        linkText="Update Payment Method →"
        color="red"
      />
    );
  }

  return null;
}

/* -------------------------- */
/* Small reusable subcomponent */
/* -------------------------- */

function WarningBox({
  icon: Icon,
  title,
  message,
  href,
  linkText,
  color
}: {
  icon: any;
  title: string;
  message: string;
  href: string;
  linkText: string;
  color: "amber" | "red";
}) {
  const styles = {
    amber: {
      wrapper: "border-amber-200 bg-amber-50",
      icon: "text-amber-600",
      title: "text-amber-900",
      text: "text-amber-800",
      link: "text-amber-700 hover:text-amber-900"
    },
    red: {
      wrapper: "border-red-200 bg-red-50",
      icon: "text-red-600",
      title: "text-red-900",
      text: "text-red-800",
      link: "text-red-700 hover:text-red-900"
    }
  };

  const s = styles[color];

  return (
    <div className={`rounded-lg border p-4 ${s.wrapper}`}>
      <div className="flex items-start">
        <Icon className={`h-5 w-5 mt-0.5 mr-3 ${s.icon}`} />

        <div>
          <h3 className={`font-medium ${s.title}`}>{title}</h3>

          <p className={`text-sm mt-1 ${s.text}`}>{message}</p>

          <Link
            href={href}
            className={`inline-block mt-3 text-sm font-medium ${s.link}`}
          >
            {linkText}
          </Link>
        </div>
      </div>
    </div>
  );
}
