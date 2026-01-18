// "use client";

// import Link from "next/link";
// import { usePathname } from "next/navigation";
// import { Button } from "../components/ui/button";
// import { ChevronDownIcon } from "@radix-ui/react-icons";
// import {
//   DropdownMenu,
//   DropdownMenuTrigger,
//   DropdownMenuContent,
//   DropdownMenuItem,
//   DropdownMenuLabel,
//   DropdownMenuSeparator,
//   DropdownMenuGroup
// } from "@radix-ui/react-dropdown-menu";

// import { useQuery } from "convex/react";
// import { api } from "@/convex/_generated/api";
// import { formatGptTitle } from "@/lib/formatters";

// export default function ModelSelectorDropdown() {
//   const pathname = usePathname();

//   // ✅ Convex user (source of truth)
//   const convexUser = useQuery(api.users.getCurrentUser);
//   const isAdmin = convexUser?.role === "admin";

//   // Static links
//   const staticLLMs = [{ name: "GPT 5", href: "/gpt5" }];
//   const staticDashboard = [{ name: "Dashboard", href: "/dashboard" }];
//   const staticAdmin = [{ name: "Admin", href: "/admin" }];

//   // Dynamic GPTs
//   const dynamicGPTs = useQuery(api.gpts.listGpts) ?? [];
//   const dynamicLinks = dynamicGPTs.map((gpt) => ({
//     name: formatGptTitle(gpt.gptId),
//     href: `/gpt5/${gpt.gptId}`
//   }));

//   const allLinks = [...staticLLMs, ...dynamicLinks];

//   const activeModel =
//     [...allLinks]
//       .sort((a, b) => b.href.length - a.href.length)
//       .find((item) => pathname.startsWith(item.href)) || staticLLMs[0];

//   const renderGroup = (label: string, models: any[], indent = false) => (
//     <DropdownMenuGroup>
//       <DropdownMenuLabel className="px-4 py-2 text-xs font-semibold uppercase text-gray-500">
//         {label}
//       </DropdownMenuLabel>

//       {models.map((item) => {
//         const isActive = item.href === activeModel.href;
//         return (
//           <DropdownMenuItem key={item.href} asChild>
//             <Link
//               href={item.href}
//               className={`uppercase block py-2 text-sm cursor-pointer transition-colors
//                 ${indent ? "pl-8 pr-4" : "px-4"}
//                 ${
//                   isActive
//                     ? "bg-blue-50 text-blue-700 font-semibold"
//                     : "text-gray-700 hover:bg-gray-100"
//                 }`}
//             >
//               {item.name}
//             </Link>
//           </DropdownMenuItem>
//         );
//       })}
//     </DropdownMenuGroup>
//   );

//   return (
//     <DropdownMenu>
//       <DropdownMenuTrigger asChild>
//         <Button
//           variant="ghost"
//           className="flex items-center gap-1 text-sm font-medium text-gray-700 hover:text-gray-900"
//         >
//           <span className="font-semibold text-gray-900">
//             {activeModel.name}
//           </span>
//           <ChevronDownIcon className="h-4 w-4" />
//         </Button>
//       </DropdownMenuTrigger>

//       <DropdownMenuContent
//         align="end"
//         className="w-72 mt-2 rounded-md bg-white shadow-lg p-1 border z-[100]"
//       >
//         {renderGroup("Generic LLMs", staticLLMs)}
//         {renderGroup("Dynamic GPTs", dynamicLinks, true)}

//         <DropdownMenuSeparator className="h-px bg-gray-200 my-1" />

//         {renderGroup("Navigation", staticDashboard)}

//         {/* 🔐 Admin only */}
//         {isAdmin && renderGroup("Admin", staticAdmin)}
//       </DropdownMenuContent>
//     </DropdownMenu>
//   );
// }

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
  FileText
} from "lucide-react";

export default function ModelSelectorDropdown() {
  const pathname = usePathname();

  // Get user subscription data
  const subscriptionData = useQuery(api.users.getUserSubscription);
  const isAdmin = subscriptionData?.role === "admin";

  // Get all GPTs from database
  const allGPTs = useQuery(api.gpts.listGpts) ?? [];

  // Filter GPTs based on subscription package
  const getAvailableGPTs = () => {
    if (!subscriptionData?.subscription?.gptIds) {
      return [];
    }

    // For admin users, show all GPTs
    if (isAdmin) {
      return allGPTs;
    }

    // Filter GPTs based on subscription package's gptIds
    const availableGptIds = subscriptionData.subscription.gptIds;
    return allGPTs.filter((gpt) => availableGptIds.includes(gpt.gptId));
  };

  const availableGPTs = getAvailableGPTs();

  // Map subscription plan to GPT categories
  const getPackageCategories = () => {
    const plan = subscriptionData?.subscription?.plan;

    switch (plan) {
      case "sandbox":
        return [
          {
            name: "Professional GPUs",
            description: "12 high-performance GPUs for AI development",
            icon: <Cpu className="w-4 h-4" />
          }
        ];
      case "clientProject":
        return [
          {
            name: "Client Project GPT",
            description: "Dedicated assistant for client projects",
            icon: <Briefcase className="w-4 h-4" />
          }
        ];
      case "pro":
        return [
          {
            name: "Premium GPTs",
            description: "6 specialized AI assistants",
            icon: <Rocket className="w-4 h-4" />
          }
        ];
      case "basic":
        return [
          {
            name: "Essential GPTs",
            description: "3 core AI assistants",
            icon: <Zap className="w-4 h-4" />
          }
        ];
      default:
        return [];
    }
  };

  // Helper to get GPT icon based on ID
  const getGPTIcon = (gptId: string) => {
    if (gptId.startsWith("gpu-")) {
      return <Cpu className="w-4 h-4" />;
    } else if (gptId.includes("client")) {
      return <Briefcase className="w-4 h-4" />;
    } else if (gptId.includes("sales")) {
      return <TrendingUp className="w-4 h-4" />;
    } else if (gptId.includes("support")) {
      return <Users className="w-4 h-4" />;
    } else if (gptId.includes("content")) {
      return <FileText className="w-4 h-4" />;
    } else if (gptId.includes("creative")) {
      return <Sun className="w-4 h-4" />;
    } else if (gptId.includes("analysis")) {
      return <TrendingUp className="w-4 h-4" />;
    } else if (gptId.includes("technical")) {
      return <Cpu className="w-4 h-4" />;
    }
    return <Zap className="w-4 h-4" />;
  };

  // Create dynamic links from available GPTs
  const dynamicLinks = availableGPTs.map((gpt) => ({
    id: gpt.gptId,
    name: formatGptTitle(gpt.gptId),
    href: `/gpt5/${gpt.gptId}`,
    icon: getGPTIcon(gpt.gptId)
  }));

  // Static links
  const staticLLMs = [
    {
      id: "gpt5",
      name: "GPT 5",
      href: "/gpt5",
      icon: <Zap className="w-4 h-4" />
    }
  ];

  const staticDashboard = [
    {
      id: "dashboard",
      name: "Dashboard",
      href: "/dashboard",
      icon: <ChevronDownIcon className="w-4 h-4" />
    }
  ];

  const staticAdmin = [
    {
      id: "admin",
      name: "Admin",
      href: "/admin",
      icon: <Cpu className="w-4 h-4" />
    }
  ];

  const allLinks = [...staticLLMs, ...dynamicLinks];

  const activeModel =
    [...allLinks]
      .sort((a, b) => b.href.length - a.href.length)
      .find((item) => pathname.startsWith(item.href)) || staticLLMs[0];

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
              className={`flex items-center gap-3 py-2 text-sm cursor-pointer transition-colors px-4
                ${
                  isActive
                    ? "bg-blue-50 text-blue-700 font-semibold"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
            >
              {item.icon && <div className="text-gray-500">{item.icon}</div>}
              <span>{item.name}</span>
            </Link>
          </DropdownMenuItem>
        );
      })}
    </DropdownMenuGroup>
  );

  // Get package categories
  const packageCategories = getPackageCategories();

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
        className="w-80 mt-2 rounded-md bg-white shadow-lg p-0 border z-[100] max-h-[80vh] overflow-y-auto"
      >
        {/* Generic LLM */}
        {renderGroup(
          "Generic LLM",
          staticLLMs,
          "Universal AI assistant",
          <Zap className="w-4 h-4" />
        )}

        <DropdownMenuSeparator className="h-px bg-gray-200" />

        {/* Package-Specific GPTs */}
        {packageCategories.map((category, index) => (
          <div key={index}>
            {renderGroup(
              category.name,
              dynamicLinks,
              category.description,
              category.icon
            )}
            {index < packageCategories.length - 1 && (
              <DropdownMenuSeparator className="h-px bg-gray-200" />
            )}
          </div>
        ))}

        {/* Show empty state if no GPTs available */}
        {!isAdmin && dynamicLinks.length === 0 && (
          <div className="px-4 py-6 text-center">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Cpu className="w-6 h-6 text-gray-400" />
            </div>
            <p className="text-sm text-gray-600 mb-2">
              No GPTs available with your current plan
            </p>
            <Link
              href="/subscribe"
              className="text-sm font-medium text-blue-600 hover:text-blue-800"
            >
              Upgrade Plan →
            </Link>
          </div>
        )}

        <DropdownMenuSeparator className="h-px bg-gray-200" />

        {/* Navigation */}
        {renderGroup("Navigation", staticDashboard, "Back to dashboard")}

        {/* Admin only */}
        {isAdmin && (
          <>
            <DropdownMenuSeparator className="h-px bg-gray-200" />
            {renderGroup("Admin", staticAdmin, "Administration panel")}
          </>
        )}

        {/* Plan Information */}
        {subscriptionData?.subscription && (
          <div className="border-t border-gray-100 px-4 py-3 bg-gray-50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-700">
                  {getPlanDisplayName(subscriptionData.subscription.plan)}
                </p>
                <p className="text-xs text-gray-500">
                  {subscriptionData.subscription.maxGpts} GPTs available
                </p>
              </div>
              {subscriptionData.subscription.status === "trialing" && (
                <span className="text-xs font-medium bg-blue-100 text-blue-700 px-2 py-1 rounded">
                  Trial
                </span>
              )}
            </div>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Helper to get plan display name
function getPlanDisplayName(plan: string): string {
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
}
