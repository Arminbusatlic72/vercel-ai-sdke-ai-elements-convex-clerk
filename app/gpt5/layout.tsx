"use client";

import { Authenticated } from "convex/react";
import Header from "@/components/Header";
import Sidebar from "@/components/SideBar";
import { NavigationProvider } from "@/lib/NavigationProvider";
import { api } from "@/convex/_generated/api";

export default function DashboardLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <NavigationProvider>
      <div className="flex h-dvh overflow-hidden min-h-0">
        <Authenticated>
          <Sidebar />

          <div className="flex-1 flex flex-col overflow-hidden min-h-0">
            <Header />

            <main className="flex-1 overflow-y-auto min-h-0">{children}</main>
          </div>
        </Authenticated>
      </div>
    </NavigationProvider>
  );
}
