"use client";

import { Badge } from "@/components/ui/badge";

interface SubscriptionLimitBadgeProps {
  activeCount: number;
  max?: number;
}

export function SubscriptionLimitBadge({
  activeCount,
  max = 6
}: SubscriptionLimitBadgeProps) {
  const isAtLimit = activeCount >= max;
  const isWarning = activeCount === max - 1;

  const label = isAtLimit
    ? `${activeCount} / ${max} — Maximum reached`
    : isWarning
      ? `${activeCount} / ${max} — 1 slot remaining`
      : `${activeCount} / ${max} subscriptions`;

  const className = isAtLimit
    ? "bg-red-100 text-red-700 border-red-200"
    : isWarning
      ? "bg-amber-100 text-amber-800 border-amber-200"
      : "bg-muted text-muted-foreground border-border";

  return (
    <Badge variant="outline" className={className}>
      {label}
    </Badge>
  );
}
