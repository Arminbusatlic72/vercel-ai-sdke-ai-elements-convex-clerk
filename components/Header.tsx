"use client";

import { use } from "react";
import dynamic from "next/dynamic";
import { Button } from "../components/ui/button";
import { HamburgerMenuIcon } from "@radix-ui/react-icons";
import { NavigationContext } from "@/lib/NavigationProvider";

// Import the separated component
import ModelSelectorDropdown from "./ModelSelectorDropdown";

const UserButton = dynamic(
  () => import("@clerk/nextjs").then((mod) => mod.UserButton),
  { ssr: false }
);

export default function Header() {
  const { setIsMobileNavOpen } = use(NavigationContext);

  return (
    <header className="border-b border-gray-200/50 bg-white/80 backdrop-blur-xl z-50 shrink-0">
      <div className="flex items-center justify-between px-4 py-3">
        {/* LEFT */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMobileNavOpen(true)}
            className="md:hidden text-gray-500 hover:text-gray-700 hover:bg-gray-100/50"
          >
            <HamburgerMenuIcon className="h-5 w-5" />
          </Button>
        </div>

        {/* CENTER */}
        <nav className="flex items-center">
          <ModelSelectorDropdown />
        </nav>

        {/* RIGHT */}
        <div className="flex items-center">
          <UserButton
            afterSignOutUrl="/"
            appearance={{
              elements: {
                avatarBox:
                  "h-8 w-8 ring-2 ring-gray-200/50 ring-offset-2 rounded-full hover:ring-gray-300/50"
              }
            }}
          />
        </div>
      </div>
    </header>
  );
}
