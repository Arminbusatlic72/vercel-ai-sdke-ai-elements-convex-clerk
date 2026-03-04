"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import AdminClient from "./AdminClient";

export default function AdminPage() {
  const router = useRouter();
  const convexUser = useQuery(api.users.getCurrentUser);

  // 1️⃣ Convex still loading
  if (convexUser === undefined) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-gray-900 mx-auto" />
          <p className="mt-6 text-lg text-gray-600 font-medium">
            Verifying admin access...
          </p>
        </div>
      </div>
    );
  }

  // 2️⃣ Loaded but not admin (or no user)
  if (!convexUser || convexUser.role !== "admin") {
    router.replace("/dashboard");
    return null;
  }

  // 3️⃣ Admin confirmed
  return <AdminClient />;
}
