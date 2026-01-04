"use client";

import { useUser } from "@clerk/nextjs";
import { Authenticated } from "convex/react";

const cards = [
  {
    title: "Start a Chat",
    description: "Ask questions and explore ideas instantly."
  },
  {
    title: "Create Project",
    description: "Organize conversations into projects."
  },
  {
    title: "Browse History",
    description: "Revisit previous chats anytime."
  },
  {
    title: "Manage Settings",
    description: "Customize your experience."
  }
];

export default function DashboardWelcomePage() {
  const { user, isLoaded } = useUser();

  if (!isLoaded) return null;

  const name =
    user?.firstName || user?.username || user?.emailAddresses[0]?.emailAddress;

  return (
    <Authenticated>
      <div className="flex h-full items-center justify-center p-6">
        <div className="w-full max-w-5xl space-y-8">
          {/* Welcome */}
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-semibold">
              Welcome{name ? `, ${name}` : ""} 👋
            </h1>
            <p className="text-sm text-muted-foreground">
              Select a project or start a new chat from the sidebar.
            </p>
          </div>

          {/* Cards */}
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
      </div>
    </Authenticated>
  );
}
