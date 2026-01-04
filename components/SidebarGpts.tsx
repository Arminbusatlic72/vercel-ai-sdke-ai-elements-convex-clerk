import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

import Link from "next/link";
import { formatGptTitle } from "@/lib/formatters";

export default function SidebarGpts({
  basePath,
  gptId,
  selectedGptId
}: {
  basePath?: string;
  gptId?: string;
  selectedGptId?: string;
}) {
  // Fetch GPTs dynamically
  const gpts = useQuery(api.gpts.listGpts) ?? [];

  if (gpts.length === 0) return null;

  return (
    <div className="space-y-2">
      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-2">
        GPTs
      </h4>

      {gpts.map((gpt) => {
        const isSelected = gpt.gptId === selectedGptId;

        return (
          <Link
            key={gpt._id}
            href={`${basePath ?? "/gpt5"}/${gpt.gptId}`}
            className={`block px-4 py-2 text-sm rounded-md transition-colors ${
              isSelected
                ? "bg-blue-50 text-blue-700 font-semibold"
                : "text-gray-700 hover:bg-gray-100"
            }`}
          >
            {formatGptTitle(gpt.gptId)}
          </Link>
        );
      })}
    </div>
  );
}
