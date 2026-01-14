import { QueryCtx, MutationCtx } from "@/convex/_generated/server";

// ✅ Helper to get current user with role
export async function getCurrentUserWithRole(
  ctx: QueryCtx | MutationCtx
): Promise<{ clerkId: string; role: "admin" | "user" } | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    return null;
  }

  const user = await ctx.db
    .query("users")
    .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
    .first();

  if (!user) {
    return null;
  }

  return {
    clerkId: user.clerkId,
    role: user.role
  };
}

// ✅ Helper to require admin access
export async function requireAdmin(ctx: QueryCtx | MutationCtx) {
  const user = await getCurrentUserWithRole(ctx);

  if (!user) {
    throw new Error("Authentication required");
  }

  if (user.role !== "admin") {
    throw new Error("Admin access required");
  }

  return user;
}

// ✅ Helper to require authentication
export async function requireAuth(ctx: QueryCtx | MutationCtx) {
  const user = await getCurrentUserWithRole(ctx);

  if (!user) {
    throw new Error("Authentication required");
  }

  return user;
}
