"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "../components/ui/button";
import { ChevronDownIcon } from "@radix-ui/react-icons";

// Radix Dropdown
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuGroup
} from "@radix-ui/react-dropdown-menu";

const allGPTs = {
  llms: [
    { name: "GPT 5", href: "/gpt5" }
    // { name: "Claude", href: "/llm/claude" },
    // { name: "LLaMA", href: "/llm/llama" },
    // { name: "Mistral", href: "/llm/mistral" }
  ],
  diagnostic: [
    { name: "Trend Diagnostic Toolkit", href: "/tool/diagnostic/trend-diag" },
    { name: "Trend Contrarian Toolkit", href: "/tool/diagnostic/trend-contra" },
    { name: "Brand Decoder", href: "/tool/diagnostic/brand-dec" },
    { name: "Digital Flâneur", href: "/tool/diagnostic/flaneur" },
    { name: "Retail Space Analysis", href: "/tool/diagnostic/retail-sa" },
    { name: "Regional Code Analysis", href: "/tool/diagnostic/regional-ca" },
    { name: "Subculture Analysis", href: "/tool/diagnostic/subculture" }
  ],
  innovation: [
    {
      name: "Speculative Futures Toolkit",
      href: "/tool/innovation/speculative"
    },
    {
      name: "Packaged Goods Innovation Toolkit",
      href: "/tool/innovation/packaged-g"
    },
    { name: "Culture Mapping Toolkit", href: "/tool/innovation/culture-map" },
    { name: "Visualizing Unknowns", href: "/tool/innovation/visualize" },
    { name: "Crisis Simulator", href: "/tool/innovation/crisis-sim" }
  ]
};

export default function ModelSelectorDropdown() {
  const pathname = usePathname();

  const allLinks = [
    ...allGPTs.llms,
    ...allGPTs.diagnostic,
    ...allGPTs.innovation
  ];

  const activeModel =
    allLinks.find((item) => item.href === pathname) || allGPTs.llms[0];

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
              className={`block py-2 text-sm cursor-pointer transition-colors
                ${indent ? "pl-8 pr-4" : "px-4"}
                ${
                  isActive
                    ? "bg-blue-50 text-blue-700 font-semibold"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
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
        {renderGroup("Generic LLMs", allGPTs.llms)}

        <DropdownMenuSeparator className="h-px bg-gray-200 my-1" />
        {renderGroup("Diagnostic GPTs", allGPTs.diagnostic, true)}

        <DropdownMenuSeparator className="h-px bg-gray-200 my-1" />
        {renderGroup("Innovation GPTs", allGPTs.innovation, true)}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
