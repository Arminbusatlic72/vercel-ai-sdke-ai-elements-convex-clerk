"use client";

import { useMemo } from "react";
import { useQuery } from "convex/react";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { api } from "@/convex/_generated/api";
import { SubscriptionList } from "@/components/subscriptions/SubscriptionList";
import { SubscriptionLimitBadge } from "@/components/subscriptions/SubscriptionLimitBadge";
import { SubscriptionGptGrid } from "@/components/subscriptions/SubscriptionGptGrid";
import { Card, CardContent } from "@/components/ui/card";

export default function DashboardSubscriptionsPage() {
  const { user } = useUser();
  const clerkUserId = user?.id;

  const subscriptions = useQuery(
    api.subscriptions.getUserSubscriptions,
    clerkUserId ? { clerkUserId } : "skip"
  );
  const mergedGptIds = useQuery(
    api.subscriptions.getUserGpts,
    clerkUserId ? { clerkUserId } : "skip"
  );
  const gpts = useQuery(api.gpts.listGpts, {});
  const packages = useQuery(api.packages.getAllPackages);

  const packageTierByProductId = useMemo(() => {
    if (!packages) return {} as Record<string, string>;
    return packages.reduce(
      (acc: Record<string, string>, pkg: any) => {
        acc[pkg.stripeProductId] = pkg.tier;
        return acc;
      },
      {} as Record<string, string>
    );
  }, [packages]);

  const mergedGridItems = useMemo(() => {
    if (!subscriptions || !gpts || !mergedGptIds)
      return [] as Array<{
        gptId: string;
        name: string;
        avatarUrl?: string;
        packageNames: string[];
      }>;

    const gptById = new Map(gpts.map((gpt: any) => [gpt.gptId, gpt]));
    const packageNamesByGpt = new Map<string, Set<string>>();

    for (const sub of subscriptions as any[]) {
      const packageLabel = sub.packageName || sub.productName || "Package";
      for (const gptId of sub.gptIds || []) {
        if (!packageNamesByGpt.has(gptId)) {
          packageNamesByGpt.set(gptId, new Set());
        }
        packageNamesByGpt.get(gptId)!.add(packageLabel);
      }
    }

    return (mergedGptIds as string[]).map((gptId) => {
      const gpt = gptById.get(gptId);
      return {
        gptId,
        name: gpt?.name || gptId,
        avatarUrl: gpt?.avatarUrl,
        packageNames: Array.from(packageNamesByGpt.get(gptId) || [])
      };
    });
  }, [subscriptions, gpts, mergedGptIds]);

  if (
    subscriptions === undefined ||
    mergedGptIds === undefined ||
    gpts === undefined ||
    packages === undefined
  ) {
    return (
      <div className="p-6 space-y-6">
        <div className="h-10 w-72 rounded bg-muted animate-pulse" />
        <div className="space-y-4">
          {[1, 2].map((item) => (
            <div
              key={item}
              className="h-52 rounded-xl bg-muted animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  if (subscriptions === null || subscriptions.length === 0) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6 space-y-3">
            <p className="text-sm text-muted-foreground">
              You don't have any active subscriptions yet.
            </p>
            <Link href="/pricing" className="text-sm underline">
              Browse Plans
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isAtLimit = subscriptions.length >= 6;

  return (
    <div className="p-6 space-y-8">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">My Subscriptions</h1>
          <p className="text-sm text-muted-foreground">
            Manage your active package access and included GPTs.
          </p>
        </div>
        <SubscriptionLimitBadge activeCount={subscriptions.length} max={6} />
      </div>

      {isAtLimit && (
        <p className="text-sm text-red-600">
          Subscription limit reached (6 active). Cancel one before adding a new
          package.
        </p>
      )}

      <SubscriptionList
        subscriptions={subscriptions.map((sub: any) => ({
          _id: sub._id,
          stripeSubscriptionId: sub.stripeSubscriptionId,
          stripeCustomerId: sub.stripeCustomerId,
          productId: sub.productId,
          status: sub.status,
          productName: sub.productName,
          packageName: sub.packageName,
          currentPeriodEnd: sub.currentPeriodEnd,
          cancelAtPeriodEnd: sub.cancelAtPeriodEnd
        }))}
        packageTierByProductId={packageTierByProductId}
      />

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">
          All My GPTs ({mergedGridItems.length} total)
        </h2>
        <SubscriptionGptGrid gpts={mergedGridItems} />
      </section>
    </div>
  );
}
