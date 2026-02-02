"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export default function GPTGrid() {
  // ✅ use the correct query
  const gpts = useQuery(api.packages.getSubscriptionGpts);

  if (gpts === undefined) return null;
  if (!gpts.length) return null;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Your Available GPTs</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {gpts.map((gpt: any) => (
          <div
            key={gpt.gptId}
            className="rounded-xl border p-4 hover:bg-muted transition"
          >
            <h3 className="font-medium">{gpt.name ?? gpt.gptId}</h3>

            {gpt.description && (
              <p className="text-xs text-muted-foreground mt-1">
                {gpt.description}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
