import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";

type SubscriptionStatus =
  | "active"
  | "canceled"
  | "past_due"
  | "trialing"
  | "incomplete"
  | "incomplete_expired"
  | "unpaid"
  | "paused";

const statusValidator = v.union(
  v.literal("active"),
  v.literal("canceled"),
  v.literal("past_due"),
  v.literal("trialing"),
  v.literal("incomplete"),
  v.literal("incomplete_expired"),
  v.literal("unpaid"),
  v.literal("paused")
);

const ACTIVE_STATUSES: SubscriptionStatus[] = [
  "active",
  "trialing",
  "past_due"
];

function isActiveStatus(status: SubscriptionStatus) {
  return ACTIVE_STATUSES.includes(status);
}

async function getOrCreateUserByIdentity(
  ctx: any,
  input: {
    userId?: Id<"users">;
    clerkUserId?: string;
    stripeCustomerId?: string;
  }
) {
  if (input.userId) {
    const existing = await ctx.db.get(input.userId);
    if (existing) return existing;
  }

  if (input.clerkUserId) {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q: any) => q.eq("clerkId", input.clerkUserId))
      .first();

    if (existing) return existing;

    const inserted = await ctx.db.insert("users", {
      clerkId: input.clerkUserId,
      email: "unknown@example.com",
      name: "User",
      role: "user",
      stripeCustomerId: input.stripeCustomerId,
      subscription: undefined,
      subscriptionIds: [],
      aiCredits: 10,
      aiCreditsResetAt: undefined,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });

    return await ctx.db.get(inserted);
  }

  return null;
}

async function resolvePackageFromStripe(
  ctx: any,
  productId?: string,
  priceId?: string
) {
  if (productId) {
    const pkg = await ctx.db
      .query("packages")
      .withIndex("by_stripeProductId", (q: any) =>
        q.eq("stripeProductId", productId)
      )
      .first();
    if (pkg) return pkg;
  }

  if (priceId) {
    const pkg = await ctx.db
      .query("packages")
      .withIndex("by_stripePriceId", (q: any) => q.eq("stripePriceId", priceId))
      .first();
    if (pkg) return pkg;
  }

  return null;
}

async function deriveSubscriptionGptIds(ctx: any, packageId?: Id<"packages">) {
  if (!packageId) return [] as string[];
  const gpts = await ctx.db
    .query("gpts")
    .withIndex("by_packageId", (q: any) => q.eq("packageId", packageId))
    .collect();
  return gpts.map((g: any) => g.gptId);
}

async function syncUserSubscriptionCache(ctx: any, userId: Id<"users">) {
  const subs = await ctx.db
    .query("subscriptions")
    .withIndex("by_user_id", (q: any) => q.eq("userId", userId))
    .collect();

  const activeSubs = subs
    .filter((sub: any) => isActiveStatus(sub.status as SubscriptionStatus))
    .sort(
      (a: any, b: any) =>
        (b.created ?? b._creationTime) - (a.created ?? a._creationTime)
    );

  const subscriptionIds = activeSubs.slice(0, 6).map((sub: any) => sub._id);
  const top = activeSubs[0];

  const legacySubscription = top
    ? {
        status: top.status,
        stripeSubscriptionId: top.stripeSubscriptionId,
        plan: top.planType,
        productId: top.productId,
        priceId: top.priceId,
        productName: top.productName,
        currentPeriodStart: top.currentPeriodStart,
        currentPeriodEnd: top.currentPeriodEnd,
        cancelAtPeriodEnd: top.cancelAtPeriodEnd,
        canceledAt: top.canceledAt,
        trialEndDate: top.trialEndDate,
        paymentFailureGracePeriodEnd: top.paymentFailureGracePeriodEnd,
        lastPaymentFailedAt: top.lastPaymentFailedAt,
        maxGpts: top.maxGpts,
        gptIds: top.gptIds ?? []
      }
    : undefined;

  await ctx.db.patch(userId, {
    subscriptionIds,
    subscription: legacySubscription,
    updatedAt: Date.now()
  });
}

async function upsertSubscriptionCore(
  ctx: any,
  input: {
    enforceMaxSubscriptions?: boolean;
    userId?: Id<"users">;
    clerkUserId?: string;
    stripeData: {
      stripeSubscriptionId: string;
      stripeCustomerId: string;
      status: SubscriptionStatus;
      productId?: string;
      priceId?: string;
      currentPeriodStart: number;
      currentPeriodEnd: number;
      cancelAtPeriodEnd?: boolean;
      canceledAt?: number;
      trialEndDate?: number;
      paymentFailureGracePeriodEnd?: number;
      lastPaymentFailedAt?: number;
    };
    packageData?: {
      packageId?: Id<"packages">;
      packageName?: string;
      planType?: string;
      maxGpts?: number;
      gptIds?: string[];
      productName?: string;
    };
  }
) {
  const user = await getOrCreateUserByIdentity(ctx, {
    userId: input.userId,
    clerkUserId: input.clerkUserId,
    stripeCustomerId: input.stripeData.stripeCustomerId
  });

  if (!user) {
    throw new ConvexError({
      code: "USER_NOT_FOUND",
      message: "Unable to resolve user"
    });
  }

  const resolvedPackage =
    (input.packageData?.packageId
      ? await ctx.db.get(input.packageData.packageId)
      : null) ??
    (await resolvePackageFromStripe(
      ctx,
      input.stripeData.productId,
      input.stripeData.priceId
    ));

  const gptIds =
    input.packageData?.gptIds ??
    (await deriveSubscriptionGptIds(ctx, resolvedPackage?._id));

  const maxGpts = input.packageData?.maxGpts ?? resolvedPackage?.maxGpts;
  const planType =
    input.packageData?.planType ??
    resolvedPackage?.key ??
    user.subscription?.plan ??
    "sandbox";

  const existing = await ctx.db
    .query("subscriptions")
    .withIndex("by_stripe_subscription_id", (q: any) =>
      q.eq("stripeSubscriptionId", input.stripeData.stripeSubscriptionId)
    )
    .first();

  const enforceMaxSubscriptions = input.enforceMaxSubscriptions ?? true;

  if (
    enforceMaxSubscriptions &&
    !existing &&
    isActiveStatus(input.stripeData.status)
  ) {
    const activeCount = (
      await ctx.db
        .query("subscriptions")
        .withIndex("by_user_id", (q: any) => q.eq("userId", user._id))
        .collect()
    ).filter((sub: any) =>
      isActiveStatus(sub.status as SubscriptionStatus)
    ).length;

    if (activeCount >= 6) {
      throw new ConvexError({
        code: "MAX_SUBSCRIPTIONS_REACHED",
        message: "Maximum of 6 active subscriptions reached",
        current: activeCount,
        max: 6
      });
    }
  }

  const nextRow = {
    clerkUserId: user.clerkId,
    userId: user._id,
    stripeSubscriptionId: input.stripeData.stripeSubscriptionId,
    stripeCustomerId: input.stripeData.stripeCustomerId,
    status: input.stripeData.status,
    productId: input.stripeData.productId,
    priceId: input.stripeData.priceId ?? "",
    planType,
    productName:
      input.packageData?.productName ??
      input.packageData?.packageName ??
      resolvedPackage?.name,
    currentPeriodStart: input.stripeData.currentPeriodStart,
    currentPeriodEnd: input.stripeData.currentPeriodEnd,
    cancelAtPeriodEnd: input.stripeData.cancelAtPeriodEnd,
    gptIds,
    maxGpts,
    trialEndDate: input.stripeData.trialEndDate,
    paymentFailureGracePeriodEnd: input.stripeData.paymentFailureGracePeriodEnd,
    lastPaymentFailedAt: input.stripeData.lastPaymentFailedAt,
    canceledAt: input.stripeData.canceledAt,
    created: Math.floor(Date.now() / 1000)
  };

  let subscriptionId: Id<"subscriptions">;

  if (existing) {
    await ctx.db.patch(existing._id, {
      ...nextRow,
      created: existing.created
    });
    subscriptionId = existing._id;
  } else {
    subscriptionId = await ctx.db.insert("subscriptions", nextRow as any);
  }

  await syncUserSubscriptionCache(ctx, user._id);

  return {
    success: true,
    subscriptionId,
    userId: user._id
  };
}

export const upsertSubscription = mutation({
  args: {
    userId: v.optional(v.id("users")),
    clerkUserId: v.optional(v.string()),
    stripeData: v.object({
      stripeSubscriptionId: v.string(),
      stripeCustomerId: v.string(),
      status: statusValidator,
      productId: v.optional(v.string()),
      priceId: v.optional(v.string()),
      currentPeriodStart: v.number(),
      currentPeriodEnd: v.number(),
      cancelAtPeriodEnd: v.optional(v.boolean()),
      canceledAt: v.optional(v.number()),
      trialEndDate: v.optional(v.number()),
      paymentFailureGracePeriodEnd: v.optional(v.number()),
      lastPaymentFailedAt: v.optional(v.number())
    }),
    packageData: v.optional(
      v.object({
        packageId: v.optional(v.id("packages")),
        packageName: v.optional(v.string()),
        planType: v.optional(v.string()),
        maxGpts: v.optional(v.number()),
        gptIds: v.optional(v.array(v.string())),
        productName: v.optional(v.string())
      })
    )
  },
  handler: async (ctx, args) => upsertSubscriptionCore(ctx, args)
});

export const cancelSubscription = mutation({
  args: {
    stripeSubscriptionId: v.string(),
    status: v.optional(statusValidator),
    canceledAt: v.optional(v.number())
  },
  handler: async (ctx, { stripeSubscriptionId, status, canceledAt }) => {
    const existing = await ctx.db
      .query("subscriptions")
      .withIndex("by_stripe_subscription_id", (q: any) =>
        q.eq("stripeSubscriptionId", stripeSubscriptionId)
      )
      .first();

    if (!existing) {
      return { success: true, updated: false };
    }

    await ctx.db.patch(existing._id, {
      status: status ?? "canceled",
      canceledAt: canceledAt ?? Date.now(),
      cancelAtPeriodEnd: false
    });

    await syncUserSubscriptionCache(ctx, existing.userId);

    return { success: true, updated: true };
  }
});

async function getUserSubscriptionsCore(
  ctx: any,
  {
    userId,
    clerkUserId
  }: {
    userId?: Id<"users">;
    clerkUserId?: string;
  }
) {
  let resolvedUserId = userId;

  if (!resolvedUserId) {
    const identity = await ctx.auth.getUserIdentity();
    const lookupClerkId = clerkUserId ?? identity?.subject;
    if (!lookupClerkId) return [];

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q: any) => q.eq("clerkId", lookupClerkId))
      .first();

    if (!user) return [];
    resolvedUserId = user._id;
  }

  const subs = await ctx.db
    .query("subscriptions")
    .withIndex("by_user_id", (q: any) => q.eq("userId", resolvedUserId))
    .collect();

  const activeSubs = subs
    .filter((sub: any) => isActiveStatus(sub.status as SubscriptionStatus))
    .sort(
      (a: any, b: any) =>
        (b.created ?? b._creationTime) - (a.created ?? a._creationTime)
    );

  const enriched = await Promise.all(
    activeSubs.map(async (sub: any) => {
      const pkg = await resolvePackageFromStripe(
        ctx,
        sub.productId,
        sub.priceId
      );
      return {
        ...sub,
        packageName: pkg?.name ?? sub.productName,
        gptIds: sub.gptIds ?? []
      };
    })
  );

  return enriched;
}

export const getUserSubscriptions = query({
  args: {
    userId: v.optional(v.id("users")),
    clerkUserId: v.optional(v.string())
  },
  handler: async (ctx, args) => getUserSubscriptionsCore(ctx, args)
});

export const getUserGpts = query({
  args: {
    userId: v.optional(v.id("users")),
    clerkUserId: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    const subs = await getUserSubscriptionsCore(ctx, args as any);
    const merged = new Set<string>();

    for (const sub of subs as any[]) {
      for (const gptId of sub.gptIds || []) {
        merged.add(gptId);
      }
    }

    return Array.from(merged);
  }
});

export const getSubscriptionWithGpts = query({
  args: {
    stripeSubscriptionId: v.string()
  },
  handler: async (ctx, { stripeSubscriptionId }) => {
    const sub = await ctx.db
      .query("subscriptions")
      .withIndex("by_stripe_subscription_id", (q: any) =>
        q.eq("stripeSubscriptionId", stripeSubscriptionId)
      )
      .first();

    if (!sub) return null;

    const gpts = (
      await Promise.all(
        (sub.gptIds ?? []).map(async (gptId: string) =>
          ctx.db
            .query("gpts")
            .withIndex("by_gptId", (q: any) => q.eq("gptId", gptId))
            .first()
        )
      )
    ).filter(Boolean);

    return {
      subscription: sub,
      gpts
    };
  }
});

export const migrateLegacyUserSubscriptions = mutation({
  args: {
    limit: v.optional(v.number())
  },
  handler: async (ctx, { limit }) => {
    const users = await ctx.db.query("users").collect();
    let migrated = 0;

    for (const user of users.slice(0, limit ?? users.length)) {
      const legacy = user.subscription;
      if (!legacy?.stripeSubscriptionId) continue;

      const existing = await ctx.db
        .query("subscriptions")
        .withIndex("by_stripe_subscription_id", (q: any) =>
          q.eq("stripeSubscriptionId", legacy.stripeSubscriptionId)
        )
        .first();

      if (existing) continue;

      await ctx.db.insert("subscriptions", {
        clerkUserId: user.clerkId,
        userId: user._id,
        stripeSubscriptionId: legacy.stripeSubscriptionId,
        stripeCustomerId: user.stripeCustomerId ?? "",
        status: legacy.status,
        productId: legacy.productId,
        priceId: legacy.priceId ?? "",
        planType: legacy.plan,
        productName: legacy.productName,
        currentPeriodStart: legacy.currentPeriodStart ?? Date.now(),
        currentPeriodEnd: legacy.currentPeriodEnd ?? Date.now(),
        cancelAtPeriodEnd: legacy.cancelAtPeriodEnd,
        gptIds: legacy.gptIds ?? [],
        maxGpts: legacy.maxGpts,
        trialEndDate: legacy.trialEndDate,
        paymentFailureGracePeriodEnd: legacy.paymentFailureGracePeriodEnd,
        lastPaymentFailedAt: legacy.lastPaymentFailedAt,
        canceledAt: legacy.canceledAt,
        created: Math.floor(Date.now() / 1000)
      });

      await syncUserSubscriptionCache(ctx, user._id);
      migrated += 1;
    }

    return { success: true, migrated };
  }
});

export const backfillUsersToSubscriptionsTable = mutation({
  args: {
    dryRun: v.optional(v.boolean()),
    limit: v.optional(v.number())
  },
  handler: async (ctx, { dryRun = true, limit }) => {
    const users = await ctx.db.query("users").collect();

    const usersWithSub = users.filter(
      (user: any) =>
        user.subscription &&
        user.subscription.stripeSubscriptionId &&
        user.subscription.status
    );

    const batch = limit ? usersWithSub.slice(0, limit) : usersWithSub;

    let migrated = 0;
    let skipped = 0;
    let alreadyExists = 0;

    for (const user of batch as any[]) {
      const sub = user.subscription;

      const existing = await ctx.db
        .query("subscriptions")
        .withIndex("by_stripe_subscription_id", (q: any) =>
          q.eq("stripeSubscriptionId", sub.stripeSubscriptionId)
        )
        .first();

      if (existing) {
        alreadyExists += 1;
        continue;
      }

      if (!sub.priceId && !sub.productId) {
        skipped += 1;
        continue;
      }

      if (!dryRun) {
        await ctx.db.insert("subscriptions", {
          clerkUserId: user.clerkId,
          userId: user._id,
          stripeSubscriptionId: sub.stripeSubscriptionId,
          stripeCustomerId: user.stripeCustomerId ?? "",
          status: sub.status,
          productId: sub.productId,
          priceId: sub.priceId ?? sub.productId ?? "",
          planType: sub.plan ?? sub.productName ?? "unknown",
          productName: sub.productName,
          currentPeriodStart: sub.currentPeriodStart ?? Date.now(),
          currentPeriodEnd: sub.currentPeriodEnd ?? Date.now(),
          cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
          canceledAt: sub.canceledAt,
          created: Date.now(),
          gptIds: sub.gptIds ?? [],
          maxGpts: sub.maxGpts,
          trialEndDate: sub.trialEndDate,
          paymentFailureGracePeriodEnd: sub.paymentFailureGracePeriodEnd,
          lastPaymentFailedAt: sub.lastPaymentFailedAt
        });

        await syncUserSubscriptionCache(ctx, user._id);
      }

      migrated += 1;
    }

    return {
      dryRun,
      total: usersWithSub.length,
      migrated,
      alreadyExists,
      skipped
    };
  }
});

// Backward-compatible wrapper used by existing routes
export const syncSubscriptionFromStripe = mutation({
  args: {
    clerkUserId: v.string(),
    stripeSubscriptionId: v.string(),
    stripeCustomerId: v.string(),
    status: statusValidator,
    productId: v.optional(v.string()),
    priceId: v.optional(v.string()),
    planType: v.optional(v.string()),
    currentPeriodStart: v.number(),
    currentPeriodEnd: v.number(),
    cancelAtPeriodEnd: v.boolean(),
    maxGpts: v.optional(v.number()),
    trialEndDate: v.optional(v.number()),
    paymentFailureGracePeriodEnd: v.optional(v.number()),
    lastPaymentFailedAt: v.optional(v.number()),
    canceledAt: v.optional(v.number())
  },
  handler: async (ctx, args) => {
    const pkg = await resolvePackageFromStripe(
      ctx,
      args.productId,
      args.priceId
    );
    const gptIds = await deriveSubscriptionGptIds(ctx, pkg?._id);

    return await upsertSubscriptionCore(ctx, {
      clerkUserId: args.clerkUserId,
      stripeData: {
        stripeSubscriptionId: args.stripeSubscriptionId,
        stripeCustomerId: args.stripeCustomerId,
        status: args.status as SubscriptionStatus,
        productId: args.productId,
        priceId: args.priceId,
        currentPeriodStart: args.currentPeriodStart,
        currentPeriodEnd: args.currentPeriodEnd,
        cancelAtPeriodEnd: args.cancelAtPeriodEnd,
        canceledAt: args.canceledAt,
        trialEndDate: args.trialEndDate,
        paymentFailureGracePeriodEnd: args.paymentFailureGracePeriodEnd,
        lastPaymentFailedAt: args.lastPaymentFailedAt
      },
      packageData: {
        packageId: pkg?._id,
        packageName: pkg?.name,
        planType: args.planType ?? pkg?.key,
        maxGpts: args.maxGpts ?? pkg?.maxGpts,
        gptIds,
        productName: pkg?.name
      }
    });
  }
});

export const cancelSubscriptionAtPeriodEnd = mutation({
  args: {
    stripeSubscriptionId: v.string()
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ code: "UNAUTHORIZED" });

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q: any) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) throw new ConvexError({ code: "USER_NOT_FOUND" });

    const sub = await ctx.db
      .query("subscriptions")
      .withIndex("by_stripe_subscription_id", (q: any) =>
        q.eq("stripeSubscriptionId", args.stripeSubscriptionId)
      )
      .first();

    if (!sub || sub.userId !== user._id) {
      throw new ConvexError({ code: "UNAUTHORIZED" });
    }

    await ctx.db.patch(sub._id, { cancelAtPeriodEnd: true });
    await syncUserSubscriptionCache(ctx, user._id);
    return { success: true };
  }
});

export const reactivateSubscription = mutation({
  args: {
    stripeSubscriptionId: v.string()
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ code: "UNAUTHORIZED" });

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q: any) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) throw new ConvexError({ code: "USER_NOT_FOUND" });

    const sub = await ctx.db
      .query("subscriptions")
      .withIndex("by_stripe_subscription_id", (q: any) =>
        q.eq("stripeSubscriptionId", args.stripeSubscriptionId)
      )
      .first();

    if (!sub || sub.userId !== user._id) {
      throw new ConvexError({ code: "UNAUTHORIZED" });
    }

    await ctx.db.patch(sub._id, { cancelAtPeriodEnd: false });
    await syncUserSubscriptionCache(ctx, user._id);
    return { success: true };
  }
});

export const hasActiveSubscription = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return false;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q: any) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) return false;

    const active = await ctx.db
      .query("subscriptions")
      .withIndex("by_user_id", (q: any) => q.eq("userId", user._id))
      .collect();

    return active.some((sub: any) =>
      isActiveStatus(sub.status as SubscriptionStatus)
    );
  }
});

export const getSubscriptionHealth = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return {
        isActive: false,
        status: "no-subscription" as const,
        daysUntilExpiration: null,
        isInGracePeriod: false,
        isTrialing: false,
        messageKey: "no_subscription"
      };
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q: any) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) {
      return {
        isActive: false,
        status: "no-subscription" as const,
        daysUntilExpiration: null,
        isInGracePeriod: false,
        isTrialing: false,
        messageKey: "no_subscription"
      };
    }

    const activeSubs = await getUserSubscriptionsCore(ctx, {
      userId: user._id
    } as any);
    const primary = (activeSubs as any[])[0];

    if (!primary) {
      return {
        isActive: false,
        status: "no-subscription" as const,
        daysUntilExpiration: null,
        isInGracePeriod: false,
        isTrialing: false,
        messageKey: "no_subscription"
      };
    }

    const now = Date.now();
    const isInGracePeriod =
      primary.status === "past_due" &&
      primary.paymentFailureGracePeriodEnd &&
      primary.paymentFailureGracePeriodEnd > now;

    const expirationTime = isInGracePeriod
      ? primary.paymentFailureGracePeriodEnd
      : primary.currentPeriodEnd;

    const daysUntilExpiration = expirationTime
      ? Math.ceil((expirationTime - now) / (1000 * 60 * 60 * 24))
      : null;

    return {
      isActive: true,
      status: primary.status,
      daysUntilExpiration,
      isInGracePeriod,
      isTrialing: primary.status === "trialing",
      messageKey: primary.status,
      plan: primary.planType,
      currentPeriodEnd: primary.currentPeriodEnd,
      trialEndDate: primary.trialEndDate,
      gracePeriodEndDate: primary.paymentFailureGracePeriodEnd,
      cancelAtPeriodEnd: primary.cancelAtPeriodEnd,
      lastPaymentFailedAt: primary.lastPaymentFailedAt,
      activeSubscriptionCount: (activeSubs as any[]).length
    };
  }
});
