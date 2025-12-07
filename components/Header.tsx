"use client";
import { use } from "react";
import Link from "next/link";
import { Button } from "../components/ui/button";
import { HamburgerMenuIcon } from "@radix-ui/react-icons";
import { NavigationContext } from "@/lib/NavigationProvider";
import dynamic from "next/dynamic";

const UserButton = dynamic(
  () => import("@clerk/nextjs").then((mod) => mod.UserButton),
  { ssr: false }
);

export default function Header() {
  const { setIsMobileNavOpen } = use(NavigationContext);

  // Four LLM menu items:
  const llmLinks = [
    { label: "GPT-5", href: "/gpt5" },
    { label: "Claude", href: "/llm/claude" },
    { label: "LLaMA", href: "/llm/llama" },
    { label: "Mistral", href: "/llm/mistral" }
  ];

  return (
    <header className="border-b border-gray-200/50 bg-white/80 backdrop-blur-xl z-50 shrink-0">
      <div className="flex items-center justify-between px-4 py-3">
        {/* LEFT: mobile menu + title */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMobileNavOpen(true)}
            className="md:hidden text-gray-500 hover:text-gray-700 hover:bg-gray-100/50"
          >
            <HamburgerMenuIcon className="h-5 w-5" />
          </Button>

          <div className="font-semibold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
            Chat with an AI Agent
          </div>
        </div>

        {/* CENTER: navigation (visible on desktop only) */}
        <nav className="hidden md:flex items-center gap-6">
          {llmLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* RIGHT: User button */}
        <div className="flex items-center">
          <UserButton
            afterSignOutUrl="/"
            appearance={{
              elements: {
                avatarBox:
                  "h-8 w-8 ring-2 ring-gray-200/50 ring-offset-2 rounded-full transition-shadow hover:ring-gray-300/50"
              }
            }}
          />
        </div>
      </div>
    </header>
  );
}
