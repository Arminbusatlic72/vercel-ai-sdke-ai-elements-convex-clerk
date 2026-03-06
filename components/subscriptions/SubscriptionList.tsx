"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { getGraceLabel } from "@/convex/lib/subscriptionUtils";

type SubscriptionItem = {
  _id: string;
  status: string;
  stripeSubscriptionId: string;
  stripeCustomerId: string;
  productId?: string;
  productName?: string;
  packageName?: string;
  currentPeriodEnd?: number;
  cancelAtPeriodEnd?: boolean;
  paymentFailureGracePeriodEnd?: number;
};

interface SubscriptionListProps {
  subscriptions: SubscriptionItem[];
  packageTierByProductId?: Record<string, string>;
}

function getStatusMeta(status: string) {
  switch (status) {
    case "active":
      return {
        className: "bg-green-100 text-green-700 border-green-200",
        tooltip: undefined
      };
    case "trialing":
      return {
        className: "bg-blue-100 text-blue-700 border-blue-200",
        tooltip: undefined
      };
    case "past_due":
      return {
        className: "bg-amber-100 text-amber-800 border-amber-200",
        tooltip: "Payment failed — access maintained for 7 days"
      };
    case "paused":
      return {
        className: "bg-gray-100 text-gray-700 border-gray-200",
        tooltip: undefined
      };
    case "canceled":
      return {
        className: "bg-red-100 text-red-700 border-red-200",
        tooltip: undefined
      };
    default:
      return {
        className: "bg-muted text-muted-foreground border-border",
        tooltip: undefined
      };
  }
}

function SubscriptionCard({
  subscription,
  tier
}: {
  subscription: SubscriptionItem;
  tier?: string;
}) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const result = useQuery(api.subscriptions.getSubscriptionWithGpts, {
    stripeSubscriptionId: subscription.stripeSubscriptionId
  });

  const gpts = result?.gpts ?? [];
  const visible = expanded ? gpts : gpts.slice(0, 4);
  const hiddenCount = Math.max(0, gpts.length - 4);
  const statusMeta = getStatusMeta(subscription.status);

  const handlePortal = async () => {
    if (!subscription.stripeCustomerId) return;
    setPortalLoading(true);
    try {
      const response = await fetch("/api/stripe/create-portal-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stripeCustomerId: subscription.stripeCustomerId,
          returnUrl: `${window.location.origin}/dashboard/subscriptions`
        })
      });

      const payload = await response.json();
      if (response.ok && payload.url) {
        router.push(payload.url);
      }
    } finally {
      setPortalLoading(false);
    }
  };

  return (
    <Card key={subscription._id}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-base">
            {subscription.productName ||
              subscription.packageName ||
              "Subscription"}
          </CardTitle>
          <Badge
            variant="outline"
            title={statusMeta.tooltip}
            className={statusMeta.className}
          >
            {subscription.status}
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs capitalize">
            {tier || "unknown"}
          </Badge>
        </div>

        {subscription.currentPeriodEnd && (
          <p className="text-xs text-muted-foreground">
            Renews:{" "}
            {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
          </p>
        )}

        {subscription.cancelAtPeriodEnd && (
          <p className="text-xs text-amber-700">⚠️ Cancels at period end</p>
        )}

        {subscription.status === "past_due" && (
          <p className="text-xs text-orange-600">
            ⚠️ Payment failed — {getGraceLabel(subscription)}
          </p>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        <div>
          <p className="text-sm font-medium mb-2">
            GPTs included in this package:
          </p>

          {result === undefined ? (
            <div className="flex gap-2">
              {[1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="h-8 w-20 rounded-full bg-muted animate-pulse"
                />
              ))}
            </div>
          ) : gpts.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No GPTs assigned to this package yet
            </p>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              {visible.map((gpt: any) => (
                <div
                  key={gpt._id}
                  className="inline-flex items-center gap-2 rounded-full border px-2 py-1 text-xs"
                >
                  <div className="h-5 w-5 rounded-full bg-muted flex items-center justify-center text-[10px] font-semibold">
                    {(gpt.name || gpt.gptId).slice(0, 1).toUpperCase()}
                  </div>
                  <span className="max-w-28 truncate">
                    {gpt.name || gpt.gptId}
                  </span>
                </div>
              ))}

              {!expanded && hiddenCount > 0 && (
                <button
                  type="button"
                  onClick={() => setExpanded(true)}
                  className="rounded-full border px-2 py-1 text-xs hover:bg-muted"
                >
                  +{hiddenCount} more
                </button>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            disabled={
              subscription.cancelAtPeriodEnd ||
              portalLoading ||
              !subscription.stripeCustomerId
            }
            onClick={() => void handlePortal()}
            className="rounded-md border px-3 py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {subscription.cancelAtPeriodEnd
              ? "Cancellation scheduled"
              : portalLoading
                ? "Opening..."
                : "Cancel Subscription"}
          </button>
        </div>
      </CardContent>
    </Card>
  );
}

export function SubscriptionList({
  subscriptions,
  packageTierByProductId = {}
}: SubscriptionListProps) {
  if (!subscriptions.length) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">
            No active subscriptions found.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {subscriptions.map((subscription) => (
        <SubscriptionCard
          key={subscription._id}
          subscription={subscription}
          tier={
            (subscription.productId &&
              packageTierByProductId[subscription.productId]) ||
            undefined
          }
        />
      ))}
    </div>
  );
}
