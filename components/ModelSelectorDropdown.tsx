// app/components/ModelSelectorDropdown.tsx

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "./ui/button";
import { ChevronDownIcon } from "@radix-ui/react-icons";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuGroup
} from "@radix-ui/react-dropdown-menu";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { formatGptTitle } from "@/lib/formatters";
import {
  Cpu,
  Briefcase,
  Zap,
  Rocket,
  Users,
  TrendingUp,
  Sun,
  Mic,
  FileText,
  School,
  BookOpen,
  Mail,
  BarChart,
  Code,
  MessageSquare,
  Search,
  Brain,
  Lightbulb,
  Home,
  Settings,
  AlertCircle,
  ExternalLink
} from "lucide-react";
import { GPTConfig } from "@/lib/types";

type GPTItem = {
  gptId: string;
};

export default function ModelSelectorDropdown() {
  const pathname = usePathname();

  // Get user data
  const userData = useQuery(api.users.getCurrentUser);
  const isAdmin = userData?.role === "admin";

  // Get subscription GPTs (only shows GPTs from user's active subscription)
  const subscriptionGpts = (useQuery(api.packages.getSubscriptionGpts) ||
    []) as GPTConfig[];

  // Get all GPTs (for admin only)
  const allGPTs = (useQuery(api.gpts.listGpts) || []) as GPTConfig[];

  // If admin, show all GPTs. Otherwise, show only GPTs from user's subscription
  const gptsToShow = isAdmin ? allGPTs : subscriptionGpts;

  // Helper to get GPT icon based on ID
  const getGPTIcon = (gptId: string) => {
    const gptLower = gptId.toLowerCase();

    if (gptLower.includes("gpu") || gptLower.includes("compute")) {
      return <Cpu className="w-4 h-4" />;
    } else if (gptLower.includes("client") || gptLower.includes("project")) {
      return <Briefcase className="w-4 h-4" />;
    } else if (gptLower.includes("sales") || gptLower.includes("business")) {
      return <TrendingUp className="w-4 h-4" />;
    } else if (gptLower.includes("support") || gptLower.includes("help")) {
      return <Users className="w-4 h-4" />;
    } else if (gptLower.includes("content") || gptLower.includes("write")) {
      return <FileText className="w-4 h-4" />;
    } else if (gptLower.includes("creative") || gptLower.includes("design")) {
      return <Sun className="w-4 h-4" />;
    } else if (
      gptLower.includes("analysis") ||
      gptLower.includes("analytics")
    ) {
      return <BarChart className="w-4 h-4" />;
    } else if (gptLower.includes("technical") || gptLower.includes("code")) {
      return <Code className="w-4 h-4" />;
    } else if (gptLower.includes("chat") || gptLower.includes("message")) {
      return <MessageSquare className="w-4 h-4" />;
    } else if (gptLower.includes("search") || gptLower.includes("research")) {
      return <Search className="w-4 h-4" />;
    } else if (gptLower.includes("ai") || gptLower.includes("assistant")) {
      return <Brain className="w-4 h-4" />;
    } else if (gptLower.includes("idea") || gptLower.includes("brainstorm")) {
      return <Lightbulb className="w-4 h-4" />;
    } else if (gptLower.includes("education") || gptLower.includes("learn")) {
      return <School className="w-4 h-4" />;
    } else if (
      gptLower.includes("speaker") ||
      gptLower.includes("presentation")
    ) {
      return <Mic className="w-4 h-4" />;
    } else if (
      gptLower.includes("newsletter") ||
      gptLower.includes("substack")
    ) {
      return <Mail className="w-4 h-4" />;
    }

    return <Zap className="w-4 h-4" />;
  };

  // Create dynamic links from available GPTs
  const sourceGpts: GPTConfig[] = isAdmin ? allGPTs : subscriptionGpts;

  // ✅ UPDATE: Include description in dynamic links
  const dynamicLinks = sourceGpts.map((gpt) => ({
    id: gpt.gptId,
    name: gpt.name || formatGptTitle(gpt.gptId), // ✅ Use name if available
    description: gpt.description, // ✅ ADD THIS
    href: `/gpt5/${gpt.gptId}`,
    icon: getGPTIcon(gpt.gptId)
  }));

  const staticLLMs = isAdmin
    ? [
        {
          id: "gpt5",
          name: "GPT 5",
          href: "/gpt5",
          icon: <Zap className="w-4 h-4" />,
          description: "Universal AI assistant" // ✅ ADD THIS
        }
      ]
    : [];

  const staticDashboard = [
    {
      id: "dashboard",
      name: "Dashboard",
      href: "/dashboard",
      icon: <Home className="w-4 h-4" />
    }
  ];

  const staticAdmin = [
    {
      id: "admin",
      name: "Admin",
      href: "/admin",
      icon: <Settings className="w-4 h-4" />
    }
  ];

  const allLinks = [...staticLLMs, ...dynamicLinks];

  const activeModel =
    [...allLinks]
      .sort((a, b) => b.href.length - a.href.length)
      .find((item) => pathname.startsWith(item.href)) ||
    dynamicLinks[0] ||
    staticDashboard[0];

  // ✅ UPDATE: renderGroup to show descriptions
  const renderGroup = (
    label: string,
    items: any[],
    description?: string,
    icon?: React.ReactNode
  ) => (
    <DropdownMenuGroup>
      <div className="px-4 py-2">
        <div className="flex items-center gap-2 mb-1">
          {icon && <div className="text-gray-500">{icon}</div>}
          <DropdownMenuLabel className="text-xs font-semibold uppercase text-gray-500">
            {label}
          </DropdownMenuLabel>
        </div>
        {description && (
          <p className="text-xs text-gray-400 mb-2">{description}</p>
        )}
      </div>

      {items.map((item) => {
        const isActive = item.href === activeModel.href;
        return (
          <DropdownMenuItem key={item.id} asChild>
            <Link
              href={item.href}
              className={`flex items-start gap-3 py-3 px-4 text-sm cursor-pointer transition-colors
                ${
                  isActive
                    ? "bg-blue-50 text-blue-700"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
            >
              {/* Icon */}
              <div
                className={`mt-0.5 ${isActive ? "text-blue-600" : "text-gray-500"}`}
              >
                {item.icon}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div
                  className={`font-semibold ${isActive ? "text-blue-700" : "text-gray-900"}`}
                >
                  {item.name}
                </div>

                {/* ✅ ADD DESCRIPTION */}
                {item.description && (
                  <p
                    className={`text-xs mt-0.5 line-clamp-2 ${
                      isActive ? "text-blue-600" : "text-gray-500"
                    }`}
                  >
                    {item.description}
                  </p>
                )}
              </div>
            </Link>
          </DropdownMenuItem>
        );
      })}
    </DropdownMenuGroup>
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="flex items-center gap-1 text-sm font-medium text-gray-700 hover:text-gray-900"
        >
          {activeModel.icon && (
            <div className="text-gray-600">{activeModel.icon}</div>
          )}
          <span className="font-semibold text-gray-900">
            {activeModel.name}
          </span>
          <ChevronDownIcon className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-80 mt-2 rounded-md bg-white shadow-lg p-0 border z-100 max-h-[80vh] overflow-y-auto"
      >
        {/* Generic LLM */}
        {staticLLMs.length > 0 && (
          <>
            {renderGroup(
              "Generic LLM",
              staticLLMs,
              undefined,
              <Zap className="w-4 h-4" />
            )}
            <DropdownMenuSeparator className="h-px bg-gray-200" />
          </>
        )}

        {/* Package-Specific GPTs */}
        {dynamicLinks.length > 0 && (
          <>
            {renderGroup(
              "Your GPTs",
              dynamicLinks,
              `${dynamicLinks.length} specialized assistants available`
            )}

            <DropdownMenuSeparator className="h-px bg-gray-200" />
          </>
        )}

        {/* Show empty state if no subscription (non-admin users) */}
        {!isAdmin && dynamicLinks.length === 0 && !userData?.subscription && (
          <div className="px-4 py-6 text-center">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Cpu className="w-6 h-6 text-gray-400" />
            </div>
            <p className="text-sm text-gray-600 mb-2">
              No subscription plan active
            </p>
            <Link
              href="/subscribe"
              className="text-sm font-medium text-blue-600 hover:text-blue-800 inline-flex items-center gap-1"
            >
              View Plans <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        )}

        <DropdownMenuSeparator className="h-px bg-gray-200" />

        {/* Navigation */}
        {renderGroup(
          "Navigation",
          staticDashboard,
          "Back to dashboard",
          <Home className="w-4 h-4" />
        )}

        {/* Admin only */}
        {isAdmin && (
          <>
            <DropdownMenuSeparator className="h-px bg-gray-200" />
            {renderGroup(
              "Admin",
              staticAdmin,
              "Administration panel",
              <Settings className="w-4 h-4" />
            )}
          </>
        )}

        {/* Plan Information */}
        {userData?.subscription &&
          userData.subscription.status === "active" && (
            <div className="border-t border-gray-100 px-4 py-3 bg-gray-50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-700">
                    Plan: {userData.subscription.productName || "Active Plan"}
                  </p>
                  <p className="text-xs text-gray-500">
                    {dynamicLinks.length} GPTs available
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  {userData.subscription.status === "active" && (
                    <span className="text-xs font-medium bg-blue-100 text-blue-700 px-2 py-1 rounded">
                      Active
                    </span>
                  )}
                </div>
              </div>

              {/* Show subscription end date if applicable */}
              {userData.subscription.currentPeriodEnd && (
                <p className="text-xs text-gray-500 mt-2">
                  Access until:{" "}
                  {new Date(
                    userData.subscription.currentPeriodEnd
                  ).toLocaleDateString()}
                </p>
              )}
            </div>
          )}

        {/* No plan information */}
        {!userData?.subscription && !isAdmin && (
          <div className="border-t border-gray-100 px-4 py-3 bg-gray-50">
            <div className="flex items-center gap-2 mb-1">
              <AlertCircle className="w-4 h-4 text-gray-400" />
              <p className="text-xs font-medium text-gray-700">
                No Active Plan
              </p>
            </div>
            <p className="text-xs text-gray-500 mb-2">
              Subscribe to a plan to access GPTs
            </p>
            <Link
              href="/subscribe"
              className="text-xs font-medium text-blue-600 hover:text-blue-800 inline-flex items-center gap-1"
            >
              Browse Plans <ChevronDownIcon className="w-3 h-3" />
            </Link>
          </div>
        )}

        {/* Admin notice */}
        {isAdmin && (
          <div className="border-t border-gray-100 px-4 py-3 bg-gray-50">
            <div className="flex items-center gap-2 mb-1">
              <Settings className="w-4 h-4 text-gray-400" />
              <p className="text-xs font-medium text-gray-700">
                Administrator View
              </p>
            </div>
            <p className="text-xs text-gray-500">
              You can see all {allGPTs.length} GPTs
            </p>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
