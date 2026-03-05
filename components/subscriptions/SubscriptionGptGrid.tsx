"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";

interface SubscriptionGptGridProps {
  gpts?: Array<{
    gptId: string;
    name: string;
    avatarUrl?: string;
    packageNames: string[];
  }>;
}

export function SubscriptionGptGrid({ gpts = [] }: SubscriptionGptGridProps) {
  if (!gpts.length) {
    return (
      <p className="text-sm text-muted-foreground">
        No GPT access attached yet.
      </p>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {gpts.map((gpt) => (
        <Card key={gpt.gptId}>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              {gpt.avatarUrl ? (
                <img
                  src={gpt.avatarUrl}
                  alt={gpt.name}
                  className="h-8 w-8 rounded-full object-cover"
                />
              ) : (
                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-semibold">
                  {gpt.name.slice(0, 1).toUpperCase()}
                </div>
              )}
              <p className="text-sm font-medium truncate">{gpt.name}</p>
            </div>

            <p className="text-xs text-muted-foreground line-clamp-2">
              From: {gpt.packageNames.join(", ")}
            </p>

            <Link
              href={`/gpt5/${gpt.gptId}`}
              className="inline-flex rounded-md border px-2 py-1 text-xs hover:bg-muted"
            >
              Open
            </Link>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
