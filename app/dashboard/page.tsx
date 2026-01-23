// app/dashboard/page.tsx - UPDATED FOR NEW PLANS
"use client";

import { useUser } from "@clerk/nextjs";
import {
  useMutation,
  useQuery,
  Authenticated,
  Unauthenticated
} from "convex/react";
import { api } from "@/convex/_generated/api";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Cpu,
  Briefcase,
  Zap,
  Rocket
} from "lucide-react";
import { GPTConfig } from "@/lib/types";
const cards = [
  {
    title: "Start a Chat",
    description: "Ask questions and explore ideas instantly."
  },
  {
    title: "Create Project",
    description: "Organize conversations into projects."
  },
  { title: "Browse History", description: "Revisit previous chats anytime." },
  { title: "Manage Settings", description: "Customize your experience." }
];

// Update types to include new plans
type PlanType = "basic" | "pro" | "sandbox" | "clientProject";

type ConvexUser = {
  role: "admin" | "user";
  subscription?: {
    status:
      | "active"
      | "canceled"
      | "past_due"
      | "trialing"
      | "incomplete"
      | "incomplete_expired"
      | "unpaid"
      | "paused";
    plan: PlanType;
    maxGpts: number;
    gptIds: string[];
  };
  aiCredits?: number;
};

type SubscriptionData = {
  subscription: {
    status:
      | "active"
      | "canceled"
      | "past_due"
      | "trialing"
      | "incomplete"
      | "incomplete_expired"
      | "unpaid";
    plan: PlanType;
    maxGpts: number;
    gptIds: string[];
  } | null;
  aiCredits: number;
  aiCreditsResetAt?: number;
  canCreateProject: boolean;
  plan: PlanType;
  planLabel: string;
  role: "admin" | "user";
} | null;

// Helper to get plan display name
const getPlanDisplayName = (plan: PlanType | string): string => {
  switch (plan) {
    case "sandbox":
      return "SandBox Level";
    case "clientProject":
      return "Client Project GPTs";
    case "basic":
      return "Basic";
    case "pro":
      return "Pro";
    default:
      return plan;
  }
};

// Helper to get plan icon
const getPlanIcon = (plan: PlanType | string) => {
  switch (plan) {
    case "sandbox":
      return <Cpu className="w-5 h-5" />;
    case "clientProject":
      return <Briefcase className="w-5 h-5" />;
    case "pro":
      return <Rocket className="w-5 h-5" />;
    case "basic":
      return <Zap className="w-5 h-5" />;
    default:
      return <Zap className="w-5 h-5" />;
  }
};

// Helper to get plan color
const getPlanColor = (plan: PlanType | string): string => {
  switch (plan) {
    case "sandbox":
      return "purple";
    case "clientProject":
      return "blue";
    case "pro":
      return "green";
    case "basic":
      return "yellow";
    default:
      return "gray";
  }
};

export default function DashboardWelcomePage() {
  const { user, isLoaded: isUserLoaded } = useUser();
  const router = useRouter();
  const syncUser = useMutation(api.users.syncCurrentUser);
  const userGpts = useQuery(api.gpts.getUserGpts) as GPTConfig[] | undefined;
  const safeGpts = userGpts?.filter(
    (gpt): gpt is NonNullable<typeof gpt> => gpt !== null
  );
  function gptIdToName(id: string) {
    return id
      .replace(/[-_]+/g, " ")
      .trim()
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }

  // Get subscription data from Convex
  const subscriptionData = useQuery(
    api.users.getUserSubscription,
    {} // No arguments needed for current user
  ) as SubscriptionData;
  const plan = subscriptionData?.planLabel;
  console.log("Subscription Data:", subscriptionData);
  const [convexUser, setConvexUser] = useState<ConvexUser | null>(null);
  const [isRedirecting, setIsRedirecting] = useState(false);

  // 🔐 Prevent duplicate sync (Strict Mode / rerenders)
  const hasSyncedRef = useRef(false);

  useEffect(() => {
    if (!isUserLoaded || !user || hasSyncedRef.current) return;

    hasSyncedRef.current = true;

    syncUser()
      .then((updatedUser) => {
        console.log("User synced in Convex:", updatedUser);
        setConvexUser(updatedUser);
      })
      .catch((error) => {
        hasSyncedRef.current = false; // allow retry if failed
        console.error("Failed to sync user:", error);
      });
  }, [isUserLoaded, user, syncUser]);

  useEffect(() => {
    // Don't redirect while still loading
    if (!isUserLoaded || subscriptionData === undefined) {
      console.log("⏳ Still loading...", {
        isUserLoaded,
        subscriptionDataDefined: subscriptionData !== undefined
      });
      return;
    }

    // If no user, they'll be handled by Unauthenticated component
    if (!user) {
      console.log("❌ No user");
      return;
    }

    // If subscriptionData is null, it means the query ran but returned null (user not found)
    if (subscriptionData === null) {
      console.log(
        "⚠️ subscriptionData is null - user might not exist in Convex yet"
      );
      return; // Don't redirect, let them stay and sync
    }

    console.log("📊 Checking subscription access:", {
      subscription: subscriptionData.subscription,
      role: subscriptionData.role
    });

    // Check subscription status from the nested structure
    const subscriptionStatus = subscriptionData?.subscription?.status;
    const isActive = subscriptionStatus === "active";
    const isTrialing = subscriptionStatus === "trialing";
    const isIncomplete = subscriptionStatus === "incomplete";

    console.log("✅ Status checks:", {
      subscriptionStatus,
      isActive,
      isTrialing,
      isIncomplete
    });

    // Allow access if: active, trialing, or incomplete (payment processing)
    const canAccessDashboard = isActive || isTrialing || isIncomplete;

    // Also allow admin users regardless of subscription
    const isAdmin = subscriptionData?.role === "admin";

    console.log("🎯 Final decision:", {
      canAccessDashboard,
      isAdmin,
      shouldRedirect: !canAccessDashboard && !isAdmin && !isRedirecting
    });

    // Redirect to subscribe page if no valid subscription and not admin
    if (!canAccessDashboard && !isAdmin && !isRedirecting) {
      setIsRedirecting(true);
      console.log("🚨 REDIRECTING to /subscribe");
      router.push("/subscribe");
    } else {
      console.log("✅ Access granted - staying on dashboard");
    }
  }, [isUserLoaded, user, subscriptionData, router, isRedirecting]);
  // Loading state - show spinner
  if (!isUserLoaded || subscriptionData === undefined) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-gray-500 mx-auto" />
          <p className="mt-2 text-sm text-muted-foreground">
            Loading your dashboard...
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Unauthenticated>
        <div className="flex h-full items-center justify-center p-6">
          <div className="w-full max-w-5xl space-y-8 text-center">
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold">Please Sign In</h1>
              <p className="text-sm text-muted-foreground">
                Sign in to access your dashboard and start chatting.
              </p>
            </div>
          </div>
        </div>
      </Unauthenticated>

      <Authenticated>
        {!user ? (
          // Loading state while Clerk is initializing
          <div className="flex h-full items-center justify-center p-6">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
              <p className="mt-2 text-sm text-muted-foreground">
                Loading your dashboard...
              </p>
            </div>
          </div>
        ) : (
          // User is guaranteed to exist here
          <div className="flex min-h-screen p-6">
            <div className="w-full max-w-7xl mx-auto space-y-8">
              {/* Welcome Header with Subscription Status */}
              <div className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-2">
                    <h1 className="text-3xl font-semibold">
                      Welcome, {getUserDisplayName(user)} 👋
                    </h1>
                    <p className="text-sm text-muted-foreground">
                      Role: {subscriptionData?.role?.toUpperCase() || "USER"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Plan: {plan ? getPlanDisplayName(plan) : "No Plan"}
                    </p>
                  </div>

                  {/* Subscription Status Badge */}
                  {subscriptionData?.subscription && (
                    <div className="flex items-center gap-2">
                      <SubscriptionStatusBadge
                        status={subscriptionData.subscription.status}
                        plan={subscriptionData.subscription.plan}
                      />
                      <div className="text-sm text-gray-600">
                        <span className="font-semibold">
                          {subscriptionData.aiCredits}
                        </span>{" "}
                        AI Credits
                      </div>
                    </div>
                  )}
                </div>

                {/* Subscription Warning for Incomplete/No Subscription */}
                {subscriptionData?.role !== "admin" && (
                  <>
                    {!subscriptionData?.subscription ||
                    subscriptionData.subscription.status === "incomplete" ||
                    subscriptionData.subscription.status ===
                      "incomplete_expired" ? (
                      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                        <div className="flex items-start">
                          <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 mr-3" />
                          <div>
                            <h3 className="font-medium text-amber-900">
                              Subscription Required
                            </h3>
                            <p className="text-sm text-amber-800 mt-1">
                              {!subscriptionData?.subscription
                                ? "You need an active subscription to access all features."
                                : "Your subscription payment is being processed. This may take a few minutes."}
                            </p>
                            <a
                              href="/subscribe"
                              className="inline-block mt-3 text-sm font-medium text-amber-700 hover:text-amber-900"
                            >
                              {!subscriptionData?.subscription
                                ? "Subscribe Now →"
                                : "View Subscription Status →"}
                            </a>
                          </div>
                        </div>
                      </div>
                    ) : subscriptionData.subscription.status === "past_due" ||
                      subscriptionData.subscription.status === "unpaid" ? (
                      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                        <div className="flex items-start">
                          <XCircle className="h-5 w-5 text-red-600 mt-0.5 mr-3" />
                          <div>
                            <h3 className="font-medium text-red-900">
                              Payment Required
                            </h3>
                            <p className="text-sm text-red-800 mt-1">
                              Your subscription payment failed. Please update
                              your payment method.
                            </p>
                            <a
                              href="/subscribe"
                              className="inline-block mt-3 text-sm font-medium text-red-700 hover:text-red-900"
                            >
                              Update Payment Method →
                            </a>
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </>
                )}
              </div>

              {/* Available GPTs Section */}
              {subscriptionData?.subscription?.gptIds &&
                subscriptionData.subscription.gptIds.length > 0 && (
                  <div className="space-y-4">
                    <h2 className="text-xl font-semibold">
                      Your Available GPTs
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {safeGpts?.map((gpt) => (
                        <div key={gpt.gptId} className="rounded-xl border p-4">
                          <h3 className="font-medium">
                            {gptIdToName(gpt.gptId)}
                          </h3>

                          {/* <p className="text-xs text-muted-foreground">
                            {gpt. ?? "AI assistant"}
                          </p> */}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              {/* Cards Grid */}
              <div className="space-y-4">
                <h2 className="text-xl font-semibold">Quick Actions</h2>
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                  {cards.map((card) => (
                    <div
                      key={card.title}
                      className="rounded-xl border p-4 text-center hover:bg-muted transition cursor-pointer"
                    >
                      <h3 className="font-medium">{card.title}</h3>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {card.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Usage Stats */}
              {subscriptionData && (
                <div className="space-y-4">
                  <h2 className="text-xl font-semibold">Usage Summary</h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="rounded-xl border p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Plan</p>
                          <p className="text-lg font-semibold">
                            {getPlanDisplayName(
                              subscriptionData.plan || "None"
                            )}
                          </p>
                        </div>
                        <div
                          className={`text-2xl text-${getPlanColor(subscriptionData.plan || "basic")}-600`}
                        >
                          {getPlanIcon(subscriptionData.plan || "basic")}
                        </div>
                      </div>
                      <div className="mt-4">
                        <div className="flex justify-between text-sm mb-1">
                          <span>GPTs Available</span>
                          <span className="font-medium">
                            {subscriptionData.subscription?.maxGpts || 0}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`bg-${getPlanColor(subscriptionData.plan || "basic")}-600 h-2 rounded-full`}
                            style={{ width: "100%" }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="rounded-xl border p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">
                            AI Credits
                          </p>
                          <p className="text-lg font-semibold">
                            {subscriptionData.aiCredits?.toLocaleString() || 0}
                          </p>
                        </div>
                        <div className="text-2xl">💎</div>
                      </div>
                      <div className="mt-4">
                        <div className="flex justify-between text-sm mb-1">
                          <span>Remaining</span>
                          <span className="font-medium">
                            {subscriptionData.aiCredits?.toLocaleString() || 0}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ width: "100%" }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="rounded-xl border p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">
                            Status
                          </p>
                          <p className="text-lg font-semibold capitalize">
                            {subscriptionData.subscription?.status || "none"}
                          </p>
                        </div>
                        <SubscriptionStatusIcon
                          status={subscriptionData.subscription?.status}
                        />
                      </div>
                      {subscriptionData.canCreateProject ? (
                        <div className="mt-4 p-2 bg-green-50 text-green-700 rounded-lg text-sm text-center">
                          ✓ Ready to create projects
                        </div>
                      ) : (
                        <div className="mt-4 p-2 bg-amber-50 text-amber-700 rounded-lg text-sm text-center">
                          ⚠️ Subscription required for projects
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Trial Information */}
                  {subscriptionData.subscription?.status === "trialing" && (
                    <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 mt-6">
                      <div className="flex items-start">
                        <AlertTriangle className="h-5 w-5 text-blue-600 mt-0.5 mr-3" />
                        <div>
                          <h3 className="font-medium text-blue-900">
                            Trial Period Active
                          </h3>
                          <p className="text-sm text-blue-800 mt-1">
                            Your{" "}
                            {getPlanDisplayName(
                              subscriptionData.subscription.plan
                            )}{" "}
                            trial ends on{" "}
                            {new Date(
                              subscriptionData.subscription.plan || Date.now()
                            ).toLocaleDateString()}
                            . After the trial, your subscription will
                            automatically convert to a paid plan.
                          </p>
                          <a
                            href="/subscribe"
                            className="inline-block mt-3 text-sm font-medium text-blue-700 hover:text-blue-900"
                          >
                            Manage Subscription →
                          </a>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </Authenticated>
    </>
  );
}

// Helper component for subscription status badge
function SubscriptionStatusBadge({
  status,
  plan
}: {
  status: string;
  plan: PlanType | string;
}) {
  const getStatusConfig = () => {
    switch (status) {
      case "active":
        return { color: "green", text: "Active", icon: CheckCircle };
      case "trialing":
        return { color: "blue", text: "Trial", icon: CheckCircle };
      case "incomplete":
        return { color: "yellow", text: "Processing", icon: AlertTriangle };
      case "past_due":
      case "unpaid":
        return { color: "red", text: "Payment Failed", icon: XCircle };
      case "canceled":
        return { color: "gray", text: "Canceled", icon: XCircle };
      default:
        return { color: "gray", text: status, icon: AlertTriangle };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <div className="flex items-center gap-2">
      <div
        className={`flex items-center px-3 py-1 rounded-full bg-${config.color}-100`}
      >
        <Icon className={`h-4 w-4 text-${config.color}-600 mr-2`} />
        <span className={`text-sm font-medium text-${config.color}-800`}>
          {config.text}
        </span>
      </div>
      <span className="text-sm font-medium bg-gray-100 px-2 py-1 rounded">
        {getPlanDisplayName(plan).toUpperCase() || "NONE"}
      </span>
    </div>
  );
}

// Helper component for status icon
function SubscriptionStatusIcon({ status }: { status?: string }) {
  if (!status) return <AlertTriangle className="h-6 w-6 text-gray-500" />;

  switch (status) {
    case "active":
    case "trialing":
      return <CheckCircle className="h-6 w-6 text-green-500" />;
    case "incomplete":
      return <AlertTriangle className="h-6 w-6 text-yellow-500" />;
    case "past_due":
    case "unpaid":
      return <XCircle className="h-6 w-6 text-red-500" />;
    default:
      return <AlertTriangle className="h-6 w-6 text-gray-500" />;
  }
}

// Helper function to safely get user display name
function getUserDisplayName(user: any): string {
  if (!user) return "User";

  return (
    user.firstName ||
    user.username ||
    user.emailAddresses[0]?.emailAddress ||
    "User"
  );
}

// Helper functions for GPT display
function getGPTHumanName(gptId: string): string {
  if (gptId.startsWith("gpu-")) {
    return "GPU";
  } else if (gptId === "client-project") {
    return "CP";
  }
  return gptId.charAt(0).toUpperCase();
}

function getGPTDisplayName(gptId: string): string {
  if (gptId.startsWith("gpu-")) {
    return `GPU ${gptId.split("-")[1] || ""}`.trim();
  } else if (gptId === "client-project") {
    return "Client Project Assistant";
  }
  // Format to title case
  return gptId
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function getGPTDescription(gptId: string): string {
  if (gptId.startsWith("gpu-")) {
    return "High-performance AI processing unit";
  } else if (gptId === "client-project") {
    return "Dedicated client project assistant";
  }
  return "Specialized AI assistant";
}
