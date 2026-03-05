"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { SubscriptionData } from "@/lib/types";
import { useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  ExternalLink,
  AlertCircle,
  XCircle,
  CheckCircle
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ManageSubscriptionProps {
  data: SubscriptionData;
  subscriptions?: any[];
}

export default function ManageSubscription({
  data,
  subscriptions
}: ManageSubscriptionProps) {
  const { user } = useUser();
  const [loadingPortalId, setLoadingPortalId] = useState<string | null>(null);
  const [loadingCancelId, setLoadingCancelId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [canceledId, setCanceledId] = useState<string | null>(null);
  const [pollCount, setPollCount] = useState(0);

  const cancelMutation = useMutation(
    api.subscriptions.cancelSubscriptionAtPeriodEnd
  );
  const reactivateMutation = useMutation(
    api.subscriptions.reactivateSubscription
  );
  const queriedSubscriptions = useQuery(
    api.subscriptions.getUserSubscriptions,
    user?.id ? { clerkUserId: user.id } : "skip"
  );
  const allGpts = useQuery(api.gpts.listGpts, {});
  const activeSubscriptions = useMemo(
    () => subscriptions ?? queriedSubscriptions,
    [subscriptions, queriedSubscriptions]
  );

  const activeCount = activeSubscriptions?.length ?? 0;
  const isAtLimit = activeCount >= 6;

  useEffect(() => {
    if (!canceledId || !activeSubscriptions) return;

    const stillVisible = activeSubscriptions.some(
      (subscription) => subscription.stripeSubscriptionId === canceledId
    );

    if (stillVisible && pollCount < 15) {
      const timer = setTimeout(
        () => setPollCount((previous) => previous + 1),
        2000
      );
      return () => clearTimeout(timer);
    }

    if (!stillVisible) {
      setCanceledId(null);
      setPollCount(0);
    }
  }, [activeSubscriptions, canceledId, pollCount]);

  if (activeSubscriptions === undefined || allGpts === undefined) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Subscription</CardTitle>
          <CardDescription>Loading subscriptions...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!activeSubscriptions.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Subscription</CardTitle>
          <CardDescription>
            You don't have an active subscription
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => (window.location.href = "/subscribe")}>
            Subscribe Now
          </Button>
        </CardContent>
      </Card>
    );
  }

  const handleManageSubscription = async (subscription: any) => {
    setLoadingPortalId(subscription.stripeSubscriptionId);
    setError(null);

    try {
      const stripeCustomerId =
        subscription.stripeCustomerId ?? data.stripeCustomerId;

      if (!stripeCustomerId) {
        throw new Error("Missing Stripe customer ID");
      }

      const response = await fetch("/api/stripe/create-portal-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          stripeCustomerId,
          returnUrl: window.location.href
        })
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(
          responseData.error || "Failed to create portal session"
        );
      }

      window.location.href = responseData.url;
    } catch (err: any) {
      console.error("Error:", err);
      setError(err.message);
      setLoadingPortalId(null);
    }
  };

  const handleCancelSubscription = async (subscription: any) => {
    // Simple browser confirmation
    const confirmed = window.confirm(
      `Cancel Subscription?\n\nYour subscription will remain active until ${formatDate(subscription.currentPeriodEnd)}. After that, you'll lose access to premium features.\n\nAre you sure you want to cancel?`
    );

    if (!confirmed) return;

    setLoadingCancelId(subscription.stripeSubscriptionId);
    setError(null);
    setSuccess(null);

    try {
      // First, cancel in Stripe
      const response = await fetch("/api/stripe/cancel-subscription", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          subscriptionId: subscription.stripeSubscriptionId,
          cancelAtPeriodEnd: true
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to cancel subscription");
      }

      // Then update in Convex
      await cancelMutation({
        stripeSubscriptionId: subscription.stripeSubscriptionId!
      });

      setCanceledId(subscription.stripeSubscriptionId);
      setPollCount(0);
      setSuccess(
        "Subscription will be canceled at the end of the billing period."
      );
    } catch (err: any) {
      console.error("Error:", err);
      setError(err.message);
    } finally {
      setLoadingCancelId(null);
    }
  };

  const handleReactivateSubscription = async (subscription: any) => {
    setLoadingCancelId(subscription.stripeSubscriptionId);
    setError(null);
    setSuccess(null);

    try {
      // First, reactivate in Stripe
      const response = await fetch("/api/stripe/cancel-subscription", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          subscriptionId: subscription.stripeSubscriptionId,
          cancelAtPeriodEnd: false
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to reactivate subscription");
      }

      // Then update in Convex
      await reactivateMutation({
        stripeSubscriptionId: subscription.stripeSubscriptionId!
      });

      setSuccess("Subscription has been reactivated!");
    } catch (err: any) {
      console.error("Error:", err);
      setError(err.message);
    } finally {
      setLoadingCancelId(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-500";
      case "trialing":
        return "bg-blue-500";
      case "past_due":
        return "bg-yellow-500";
      case "canceled":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return "N/A";
    // timestamp is already in milliseconds from Convex (don't multiply by 1000)
    return new Date(timestamp).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric"
    });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Manage Subscription</CardTitle>
          <CardDescription>
            Manage all active subscriptions and included GPTs
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                {success}
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2 rounded-md border p-3">
            <p className="text-sm font-medium">Packages & GPTs</p>

            {isAtLimit && (
              <p className="text-xs text-red-600">
                Subscription limit reached (6 active). Cancel one before adding
                a new package.
              </p>
            )}

            <div className="text-sm text-muted-foreground">
              Active subscriptions: {activeCount}/6
            </div>
            <div className="text-sm text-muted-foreground">
              AI Credits: {data.aiCredits}
            </div>
          </div>
        </CardContent>
      </Card>

      {activeSubscriptions.map((subscription: any) => {
        const packageLabel =
          subscription.packageName ||
          subscription.productName ||
          subscription.planType ||
          "Active Plan";
        const gptNames = (subscription.gptIds || []).map((gptId: string) => {
          const gpt = (allGpts as any[]).find(
            (item: any) => item.gptId === gptId
          );
          return gpt?.name || gptId;
        });

        return (
          <Card key={subscription.stripeSubscriptionId}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{packageLabel}</CardTitle>
                  <CardDescription>
                    {subscription.currentPeriodEnd
                      ? `${subscription.cancelAtPeriodEnd ? "Expires" : "Renews"} on ${formatDate(subscription.currentPeriodEnd)}`
                      : "No renewal date"}
                  </CardDescription>
                </div>
                <Badge className={getStatusColor(subscription.status)}>
                  {subscription.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 rounded-md border p-3">
                <p className="text-sm font-medium">GPTs</p>
                <p className="text-xs text-muted-foreground">
                  {gptNames.length ? gptNames.join(", ") : "None"}
                </p>
              </div>

              {canceledId === subscription.stripeSubscriptionId && (
                <p className="text-sm text-muted-foreground animate-pulse">
                  Cancellation processing... ({pollCount}/15)
                </p>
              )}

              <div className="pt-2 space-y-2">
                <Button
                  onClick={() => void handleManageSubscription(subscription)}
                  disabled={
                    loadingPortalId === subscription.stripeSubscriptionId
                  }
                  className="w-full"
                  variant="default"
                >
                  {loadingPortalId === subscription.stripeSubscriptionId ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    <>
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Manage in Stripe Portal
                    </>
                  )}
                </Button>

                {subscription.status === "active" &&
                  !subscription.cancelAtPeriodEnd && (
                    <Button
                      onClick={() =>
                        void handleCancelSubscription(subscription)
                      }
                      variant="outline"
                      className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
                      disabled={
                        loadingCancelId === subscription.stripeSubscriptionId
                      }
                    >
                      {loadingCancelId === subscription.stripeSubscriptionId ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <XCircle className="mr-2 h-4 w-4" />
                      )}
                      Cancel Subscription
                    </Button>
                  )}

                {subscription.cancelAtPeriodEnd && (
                  <Button
                    onClick={() =>
                      void handleReactivateSubscription(subscription)
                    }
                    disabled={
                      loadingCancelId === subscription.stripeSubscriptionId
                    }
                    className="w-full"
                    variant="default"
                  >
                    {loadingCancelId === subscription.stripeSubscriptionId ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Reactivate Subscription
                      </>
                    )}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}

      <Card>
        <CardContent className="pt-4">
          <p className="text-xs text-muted-foreground text-center">
            Manage billing, payment methods, and invoices
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
