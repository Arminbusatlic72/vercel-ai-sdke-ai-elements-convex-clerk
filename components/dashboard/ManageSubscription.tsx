"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { SubscriptionData } from "@/lib/types";
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
}

export default function ManageSubscription({ data }: ManageSubscriptionProps) {
  const [isLoadingPortal, setIsLoadingPortal] = useState(false);
  const [isLoadingCancel, setIsLoadingCancel] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const cancelMutation = useMutation(
    api.subscriptions.cancelSubscriptionAtPeriodEnd
  );
  const reactivateMutation = useMutation(
    api.subscriptions.reactivateSubscription
  );

  const subscription = data.subscription;

  if (!subscription) {
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

  const handleManageSubscription = async () => {
    setIsLoadingPortal(true);
    setError(null);

    try {
      const response = await fetch("/api/stripe/create-portal-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          stripeCustomerId: data.stripeCustomerId, // 'data' here refers to the component prop
          returnUrl: window.location.href
        })
      });

      const responseData = await response.json(); // Renamed to avoid conflict with component prop

      if (!response.ok) {
        throw new Error(
          responseData.error || "Failed to create portal session"
        );
      }

      window.location.href = responseData.url;
    } catch (err: any) {
      console.error("Error:", err);
      setError(err.message);
      setIsLoadingPortal(false);
    }
  };

  const handleCancelSubscription = async () => {
    // Simple browser confirmation
    const confirmed = window.confirm(
      `Cancel Subscription?\n\nYour subscription will remain active until ${formatDate(subscription.currentPeriodEnd)}. After that, you'll lose access to premium features.\n\nAre you sure you want to cancel?`
    );

    if (!confirmed) return;

    setIsLoadingCancel(true);
    setError(null);
    setSuccess(null);

    try {
      // First, cancel in Stripeget
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

      setSuccess(
        "Subscription will be canceled at the end of the billing period."
      );
    } catch (err: any) {
      console.error("Error:", err);
      setError(err.message);
    } finally {
      setIsLoadingCancel(false);
    }
  };

  const handleReactivateSubscription = async () => {
    setIsLoadingCancel(true);
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
      setIsLoadingCancel(false);
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
    return new Date(timestamp * 1000).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric"
    });
  };

  const getPlanDisplayName = (plan: string) => {
    const planNames: Record<string, string> = {
      sandbox: "Sandbox",
      clientProject: "Client Project",
      basic: "Basic",
      pro: "Pro"
    };
    return planNames[plan] || plan;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Manage Subscription</CardTitle>
            <CardDescription>
              {getPlanDisplayName(subscription.plan || "")} Plan
            </CardDescription>
          </div>
          <Badge className={getStatusColor(subscription.status)}>
            {subscription.status}
          </Badge>
        </div>
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

        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Status:</span>
            <span className="font-medium capitalize">
              {subscription.status}
            </span>
          </div>

          {subscription.currentPeriodEnd && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                {subscription.cancelAtPeriodEnd ? "Expires on:" : "Renews on:"}
              </span>
              <span className="font-medium">
                {formatDate(subscription.currentPeriodEnd)}
              </span>
            </div>
          )}

          {subscription.cancelAtPeriodEnd && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Your subscription will be canceled at the end of the billing
                period.
              </AlertDescription>
            </Alert>
          )}

          <div className="flex justify-between">
            <span className="text-muted-foreground">AI Credits:</span>
            <span className="font-medium">{data.aiCredits}</span>
          </div>

          {subscription.maxGpts !== undefined && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">GPTs:</span>
              <span className="font-medium">
                {data.currentGPTCount || 0} / {subscription.maxGpts}
              </span>
            </div>
          )}
        </div>

        <div className="pt-4 space-y-2">
          <Button
            onClick={handleManageSubscription}
            disabled={isLoadingPortal}
            className="w-full"
            variant="default"
          >
            {isLoadingPortal ? (
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
                onClick={handleCancelSubscription}
                variant="outline"
                className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
                disabled={isLoadingCancel}
              >
                {isLoadingCancel ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <XCircle className="mr-2 h-4 w-4" />
                )}
                Cancel Subscription
              </Button>
            )}

          {subscription.cancelAtPeriodEnd && (
            <Button
              onClick={handleReactivateSubscription}
              disabled={isLoadingCancel}
              className="w-full"
              variant="default"
            >
              {isLoadingCancel ? (
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

          <p className="text-xs text-muted-foreground text-center">
            Manage billing, payment methods, and invoices
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
