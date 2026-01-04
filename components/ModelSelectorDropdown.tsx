"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "../components/ui/button";
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

export default function ModelSelectorDropdown() {
  const pathname = usePathname();

  // Hardcoded links
  const staticLLMs = [{ name: "GPT 5", href: "/gpt5" }];
  const staticDashboard = [{ name: "Dashboard", href: "/" }];
  const staticAdmin = [{ name: "Admin", href: "/admin" }];

  // Fetch dynamic GPTs from Convex
  const dynamicGPTs = useQuery(api.gpts.listGpts) ?? [];
  const dynamicLinks = dynamicGPTs.map((gpt) => ({
    name: formatGptTitle(gpt.gptId),
    href: `/gpt5/${gpt.gptId}`
  }));

  const allLinks = [...staticLLMs, ...dynamicLinks];

  const activeModel =
    allLinks.find((item) => item.href === pathname) || staticLLMs[0];

  const renderGroup = (label: string, models: any[], indent = false) => (
    <DropdownMenuGroup>
      <DropdownMenuLabel className="px-4 py-2 text-xs font-semibold uppercase text-gray-500">
        {label}
      </DropdownMenuLabel>

      {models.map((item) => {
        const isActive = item.href === activeModel.href;
        return (
          <DropdownMenuItem key={item.href} asChild>
            <Link
              href={item.href}
              className={`uppercase block py-2 text-sm cursor-pointer transition-colors
                ${indent ? "pl-8 pr-4" : "px-4"}
                ${isActive ? "bg-blue-50 text-blue-700 font-semibold" : "text-gray-700 hover:bg-gray-100"}`}
            >
              {item.name}
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
          <span className="font-semibold text-gray-900">
            {activeModel.name}
          </span>
          <ChevronDownIcon className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-72 mt-2 rounded-md bg-white shadow-lg p-1 border z-[100]"
      >
        {renderGroup("Generic LLMs", staticLLMs)}
        {renderGroup("Dynamic GPTs", dynamicLinks, true)}
        <DropdownMenuSeparator className="h-px bg-gray-200 my-1" />
        {renderGroup("Navigation", staticDashboard)}
        {renderGroup("Admin", staticAdmin)}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
