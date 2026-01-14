"use client";

import { useUser } from "@clerk/nextjs";
import { useMutation, Authenticated, Unauthenticated } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useEffect, useRef, useState } from "react";

const cards = [
  {
    title: "Start a Chat",
    description: "Ask questions and explore ideas instantly."
  },
  {
    title: "Create Project",
    description: "Organize conversations into projects."
  },
  { title: "Browse History", description: "Revisit previous chats anytime." },
  { title: "Manage Settings", description: "Customize your experience." }
];

type ConvexUser = {
  role: "admin" | "user";
};

export default function DashboardWelcomePage() {
  const { user, isLoaded } = useUser();
  const syncUser = useMutation(api.users.syncCurrentUser);

  const [convexUser, setConvexUser] = useState<ConvexUser | null>(null);

  // 🔐 Prevent duplicate sync (Strict Mode / rerenders)
  const hasSyncedRef = useRef(false);

  useEffect(() => {
    if (!isLoaded || !user || hasSyncedRef.current) return;

    hasSyncedRef.current = true;

    syncUser()
      .then((updatedUser) => {
        console.log("User synced in Convex:", updatedUser);
        setConvexUser(updatedUser);
      })
      .catch((error) => {
        hasSyncedRef.current = false; // allow retry if failed
        console.error("Failed to sync user:", error);
      });
  }, [isLoaded, user, syncUser]);

  return (
    <>
      <Unauthenticated>
        <div className="flex h-full items-center justify-center p-6">
          <div className="w-full max-w-5xl space-y-8 text-center">
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold">Please Sign In</h1>
              <p className="text-sm text-muted-foreground">
                Sign in to access your dashboard and start chatting.
              </p>
            </div>
          </div>
        </div>
      </Unauthenticated>

      <Authenticated>
        {!isLoaded ? (
          // Loading state while Clerk is initializing
          <div className="flex h-full items-center justify-center p-6">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
              <p className="mt-2 text-sm text-muted-foreground">
                Loading your dashboard...
              </p>
            </div>
          </div>
        ) : user ? (
          // User is guaranteed to exist here
          <div className="flex h-full items-center justify-center p-6">
            <div className="w-full max-w-5xl space-y-8">
              {/* Welcome */}
              <div className="text-center space-y-2">
                <h1 className="text-3xl font-semibold">
                  Welcome, {getUserDisplayName(user)} 👋
                </h1>

                <p className="text-sm text-muted-foreground">
                  {convexUser
                    ? `Role: ${convexUser.role.toUpperCase()}`
                    : "Syncing user..."}
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
        ) : (
          // Fallback in case user is null (shouldn't happen in Authenticated)
          <div className="flex h-full items-center justify-center p-6">
            <div className="text-center">
              <p>Unable to load user data. Please try refreshing.</p>
            </div>
          </div>
        )}
      </Authenticated>
    </>
  );
}

// Helper function to safely get user display name
function getUserDisplayName(user: any): string {
  if (!user) return "User";

  return (
    user.firstName ||
    user.username ||
    user.emailAddresses[0]?.emailAddress ||
    "User"
  );
}
