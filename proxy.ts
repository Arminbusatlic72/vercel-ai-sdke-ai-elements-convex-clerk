import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Define which routes require admin access
const isAdminRoute = createRouteMatcher(["/admin(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  // Performance fast-path: chat API uses its own server-side logic,
  // so avoid middleware auth resolution overhead on every streamed request.
  if (req.nextUrl.pathname.startsWith("/api/chat")) {
    return NextResponse.next();
  }

  const { userId } = await auth();

  // Protect all routes starting with `/admin`
  if (isAdminRoute(req)) {
    if (!userId) {
      // Not logged in - redirect to sign in
      const signInUrl = new URL("/sign-in", req.url);
      return NextResponse.redirect(signInUrl);
    }

    // User is authenticated
    // The actual admin role check will happen in the page component
    // because we can't easily check Convex from middleware
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)"
  ]
};
