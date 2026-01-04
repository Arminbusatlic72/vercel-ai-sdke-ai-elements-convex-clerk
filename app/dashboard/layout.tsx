"use client";
import { Authenticated } from "convex/react";
import Header from "@/components/Header";

import { NavigationProvider } from "@/lib/NavigationProvider";

export default function DashboardLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <NavigationProvider>
      <div className="flex h-dvh overflow-hidden min-h-0">
        <Authenticated>
          <div className="flex-1 flex flex-col overflow-hidden min-h-0">
            <Header />

            <main className="flex-1 overflow-y-auto min-h-0">{children}</main>
          </div>
        </Authenticated>
      </div>
    </NavigationProvider>
  );
}
