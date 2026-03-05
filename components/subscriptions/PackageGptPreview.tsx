"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

interface PackageGptPreviewProps {
  packageId: Id<"packages">;
  maxVisible?: number;
}

export function PackageGptPreview({
  packageId,
  maxVisible = 4
}: PackageGptPreviewProps) {
  const [expanded, setExpanded] = useState(false);
  const gpts = useQuery(api.gpts.getGptsByPackageId, { packageId });

  if (gpts === undefined) {
    return (
      <div className="flex items-center gap-2">
        {[1, 2, 3].map((item) => (
          <div
            key={item}
            className="h-7 w-7 rounded-full bg-muted animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (gpts === null || gpts.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">No GPTs assigned yet</p>
    );
  }

  const visible = expanded ? gpts : gpts.slice(0, maxVisible);
  const remaining = gpts.length - maxVisible;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {visible.map((gpt: any) => {
          const label = gpt.name || gpt.gptId;
          return (
            <div
              key={gpt._id}
              className="inline-flex items-center gap-2 rounded-full border px-2 py-1 text-xs"
            >
              <div className="h-5 w-5 rounded-full bg-muted flex items-center justify-center text-[10px] font-semibold">
                {label.slice(0, 1).toUpperCase()}
              </div>
              <span className="max-w-28 truncate">{label}</span>
            </div>
          );
        })}

        {!expanded && remaining > 0 && (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="rounded-full border px-2 py-1 text-xs hover:bg-muted"
          >
            +{remaining} more
          </button>
        )}
      </div>

      {expanded && gpts.length > maxVisible && (
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="text-xs text-muted-foreground hover:underline"
        >
          Show less
        </button>
      )}
    </div>
  );
}
