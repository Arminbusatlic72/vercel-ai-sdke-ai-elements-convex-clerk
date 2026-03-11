import { v } from "convex/values";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

type WindowType = "minute" | "hour" | "monthly";

type WindowRecord = {
  _id: Id<"aiUsage">;
  userId: string;
  windowType: WindowType;
  windowStart: number;
  requestCount: number;
  messageCount: number;
  imageCount: number;
};

type UsageSnapshot = {
  minuteRequests: number;
  hourRequests: number;
  monthlyRequests: number;
  monthlyMessages: number;
  monthlyImages: number;
};

type LimitType =
  | "requestsPerMinute"
  | "requestsPerHour"
  | "monthlyMessages"
  | "monthlyImages";

type UsageLimitResult =
  | ({ status: "ok" } & UsageSnapshot)
  | ({
      status: "limit_reached";
      limitType: LimitType;
      message: string;
      retryAfterMs: number;
    } & UsageSnapshot);

export function getUsageWindowStarts(now = Date.now()) {
  const minuteWindowStart = Math.floor(now / 60_000) * 60_000;
  const hourWindowStart = Math.floor(now / 3_600_000) * 3_600_000;
  const monthlyDate = new Date(now);
  monthlyDate.setUTCDate(1);
  monthlyDate.setUTCHours(0, 0, 0, 0);
  const monthlyWindowStart = monthlyDate.getTime();
  return { minuteWindowStart, hourWindowStart, monthlyWindowStart };
}

const fetchWindowRecord = async (
  ctx: MutationCtx | QueryCtx,
  userId: string,
  windowType: WindowType,
  windowStart: number
): Promise<WindowRecord | null> => {
  if (windowStart === undefined || windowStart === null) return null;
  return await ctx.db
    .query("aiUsage")
    .withIndex("by_user_window", (q) =>
      q
        .eq("userId", userId)
        .eq("windowType", windowType)
        .eq("windowStart", windowStart)
    )
    .first();
};

const upsertWindowRecord = async (
  ctx: MutationCtx,
  userId: string,
  windowType: WindowType,
  windowStart: number,
  baseRecord: WindowRecord | null,
  increments: {
    requestCount?: number;
    messageCount?: number;
    imageCount?: number;
  },
  now: number
) => {
  const record = baseRecord;
  const nextRequestCount =
    (record?.requestCount ?? 0) + (increments.requestCount ?? 0);
  const nextMessageCount =
    (record?.messageCount ?? 0) + (increments.messageCount ?? 0);
  const nextImageCount =
    (record?.imageCount ?? 0) + (increments.imageCount ?? 0);

  if (record) {
    await ctx.db.patch(record._id, {
      requestCount: nextRequestCount,
      messageCount: nextMessageCount,
      imageCount: nextImageCount,
      updatedAt: now
    });
    return;
  }

  await ctx.db.insert("aiUsage", {
    userId,
    windowType,
    windowStart,
    requestCount: nextRequestCount,
    messageCount: nextMessageCount,
    imageCount: nextImageCount,
    createdAt: now,
    updatedAt: now
  });
};

export const claimUsage = mutation({
  args: {
    userId: v.string(),
    minuteWindow: v.number(),
    hourWindow: v.number(),
    monthlyWindow: v.number(),
    requestedMessageCount: v.number(),
    requestedImageCount: v.number(),
    requestedRequestCount: v.number(),
    limits: v.object({
      requestsPerMinute: v.number(),
      requestsPerHour: v.number(),
      monthlyMessages: v.number(),
      monthlyImages: v.number()
    })
  },
  handler: async (
    ctx,
    {
      userId,
      minuteWindow,
      hourWindow,
      monthlyWindow,
      requestedImageCount,
      requestedMessageCount,
      requestedRequestCount,
      limits
    }
  ) => {
    const now = Date.now();

    const [minuteRecord, hourRecord, monthlyRecord] = await Promise.all([
      fetchWindowRecord(ctx, userId, "minute", minuteWindow),
      fetchWindowRecord(ctx, userId, "hour", hourWindow),
      fetchWindowRecord(ctx, userId, "monthly", monthlyWindow)
    ]);

    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", userId))
      .first();
    const isAdminUser = currentUser?.role === "admin";

    const snapshot: UsageSnapshot = {
      minuteRequests: minuteRecord?.requestCount ?? 0,
      hourRequests: hourRecord?.requestCount ?? 0,
      monthlyRequests: monthlyRecord?.requestCount ?? 0,
      monthlyMessages: monthlyRecord?.messageCount ?? 0,
      monthlyImages: monthlyRecord?.imageCount ?? 0
    };

    const nextMinuteWindowStart = minuteWindow + 60_000;
    const nextHourWindowStart = hourWindow + 3_600_000;
    const nextMonthlyWindowStart = (() => {
      const next = new Date(monthlyWindow);
      next.setUTCMonth(next.getUTCMonth() + 1);
      return next.getTime();
    })();

    const buildLimitResponse = (
      limitType: LimitType,
      message: string,
      retryAfterMs: number
    ): UsageLimitResult => ({
      status: "limit_reached",
      limitType,
      message,
      retryAfterMs,
      ...snapshot
    });

    if (
      !isAdminUser &&
      minuteRecord &&
      minuteRecord.requestCount + requestedRequestCount >
        limits.requestsPerMinute
    ) {
      return buildLimitResponse(
        "requestsPerMinute",
        `Requests per minute limit reached (${limits.requestsPerMinute} requests/minute)`,
        Math.max(0, nextMinuteWindowStart - now)
      );
    }

    if (
      !isAdminUser &&
      hourRecord &&
      hourRecord.requestCount + requestedRequestCount > limits.requestsPerHour
    ) {
      return buildLimitResponse(
        "requestsPerHour",
        `Requests per hour limit reached (${limits.requestsPerHour} requests/hour)`,
        Math.max(0, nextHourWindowStart - now)
      );
    }

    const monthlyMessages = monthlyRecord?.messageCount ?? 0;
    if (
      !isAdminUser &&
      monthlyMessages + requestedMessageCount > limits.monthlyMessages
    ) {
      return buildLimitResponse(
        "monthlyMessages",
        `Monthly message limit reached (${limits.monthlyMessages} messages/month)`,
        Math.max(0, nextMonthlyWindowStart - now)
      );
    }

    const monthlyImages = monthlyRecord?.imageCount ?? 0;
    if (
      !isAdminUser &&
      monthlyImages + requestedImageCount > limits.monthlyImages
    ) {
      return buildLimitResponse(
        "monthlyImages",
        `Monthly image limit reached (${limits.monthlyImages} images/month)`,
        Math.max(0, nextMonthlyWindowStart - now)
      );
    }

    await Promise.all([
      upsertWindowRecord(
        ctx,
        userId,
        "minute",
        minuteWindow,
        minuteRecord,
        { requestCount: requestedRequestCount },
        now
      ),
      upsertWindowRecord(
        ctx,
        userId,
        "hour",
        hourWindow,
        hourRecord,
        { requestCount: requestedRequestCount },
        now
      ),
      upsertWindowRecord(
        ctx,
        userId,
        "monthly",
        monthlyWindow,
        monthlyRecord,
        {
          requestCount: requestedRequestCount,
          messageCount: requestedMessageCount,
          imageCount: requestedImageCount
        },
        now
      )
    ]);
    return { status: "ok", ...snapshot } as const;
  }
});

export const getUsageSummary = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const { minuteWindowStart, hourWindowStart, monthlyWindowStart } =
      getUsageWindowStarts();

    const [minuteRecord, hourRecord, monthlyRecord] = await Promise.all([
      fetchWindowRecord(ctx, identity.subject, "minute", minuteWindowStart),
      fetchWindowRecord(ctx, identity.subject, "hour", hourWindowStart),
      fetchWindowRecord(ctx, identity.subject, "monthly", monthlyWindowStart)
    ]);

    return {
      minuteWindowStart,
      hourWindowStart,
      monthlyWindowStart,
      minuteRequests: minuteRecord?.requestCount ?? 0,
      hourRequests: hourRecord?.requestCount ?? 0,
      monthlyRequests: monthlyRecord?.requestCount ?? 0,
      monthlyMessages: monthlyRecord?.messageCount ?? 0,
      monthlyImages: monthlyRecord?.imageCount ?? 0
    };
  }
});
