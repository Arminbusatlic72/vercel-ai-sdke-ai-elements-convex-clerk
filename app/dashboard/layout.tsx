"use client";

import { Authenticated } from "convex/react";
import Header from "@/components/Header";
import Sidebar from "@/components/SideBar";
import { NavigationProvider } from "@/lib/NavigationProvider";

export default function DashboardLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    // <NavigationProvider>
    //   <div className="flex h-screen">
    //     <Authenticated>
    //       <Sidebar />
    //     </Authenticated>

    //     <div className="flex-1 flex flex-col">
    //       <Header />

    //       {/* Page content fills vertical space */}
    //       <main className="flex-1 overflow-y-auto">{children}</main>
    //     </div>
    //   </div>
    // </NavigationProvider>

    // <div className="flex h-screen overflow-hidden">
    //   <Authenticated>
    //     <Sidebar />
    //   </Authenticated>

    //   <div className="flex-1 flex flex-col overflow-hidden">
    //     <Header />

    //     {/* FIX: make main fill remaining height */}
    //     <main className="flex-1 overflow-y-auto">{children}</main>
    //   </div>
    // </div>
    <div className="flex h-screen overflow-hidden">
      <Authenticated>
        <Sidebar />
      </Authenticated>

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />

        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
