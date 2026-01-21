// "use client";

// import { useQuery } from "convex/react";
// import { api } from "@/convex/_generated/api";
// import { useRouter } from "next/navigation";
// import { useEffect } from "react";
// import AdminClient from "./AdminClient";

// export default function AdminPage() {
//   const router = useRouter();
//   const convexUser = useQuery(api.users.getCurrentUser);
//   const isAdmin = convexUser?.role === "admin";

//   useEffect(() => {
//     // Once isAdmin query loads, redirect if not admin
//     if (isAdmin !== undefined && !isAdmin) {
//       router.push("/dashboard");
//     }
//   }, [isAdmin, router]);

//   // Loading state while checking permissions
//   if (isAdmin === undefined) {
//     return (
//       <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
//         <div className="text-center">
//           <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-gray-900 mx-auto"></div>
//           <p className="mt-6 text-lg text-gray-600 font-medium">
//             Verifying admin access...
//           </p>
//         </div>
//       </div>
//     );
//   }

//   // Not admin - show denied message briefly before redirect
//   if (!isAdmin) {
//     return (
//       <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-6">
//         <div className="text-center max-w-md bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
//           <div className="text-6xl mb-4">🚫</div>
//           <h1 className="text-2xl font-bold text-red-600 mb-2">
//             Access Denied
//           </h1>
//           <p className="text-gray-600 mb-4">
//             You need admin privileges to access this page.
//           </p>
//           <p className="text-sm text-gray-500">Redirecting to dashboard...</p>
//         </div>
//       </div>
//     );
//   }

//   // User is admin - show the admin interface
//   return <AdminClient />;
// }

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
