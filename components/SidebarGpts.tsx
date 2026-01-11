// import { useQuery } from "convex/react";
// import { api } from "@/convex/_generated/api";

// import Link from "next/link";
// import { formatGptTitle } from "@/lib/formatters";

// export default function SidebarGpts({
//   basePath,
//   gptId,
//   selectedGptId
// }: {
//   basePath?: string;
//   gptId?: string;
//   selectedGptId?: string;
// }) {
//   // Fetch GPTs dynamically
//   const gpts = useQuery(api.gpts.listGpts) ?? [];

//   if (gpts.length === 0) return null;

//   return (
//     <div className="space-y-2">
//       <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-2">
//         GPTs
//       </h4>

//       {gpts.map((gpt) => {
//         const isSelected = gpt.gptId === selectedGptId;

//         return (
//           <Link
//             key={gpt._id}
//             href={`${basePath ?? "/gpt5"}/${gpt.gptId}`}
//             className={`block px-4 py-2 text-sm rounded-md transition-colors ${
//               isSelected
//                 ? "bg-blue-50 text-blue-700 font-semibold"
//                 : "text-gray-700 hover:bg-gray-100"
//             }`}
//           >
//             {formatGptTitle(gpt.gptId)}
//           </Link>
//         );
//       })}
//     </div>
//   );
// }

"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import Link from "next/link";
import { formatGptTitle } from "@/lib/formatters";
import { ChevronDown, Bot } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export default function SidebarGpts({
  basePath,
  gptId,
  selectedGptId
}: {
  basePath?: string;
  gptId?: string;
  selectedGptId?: string;
}) {
  const [isOpen, setIsOpen] = useState(true);
  const gpts = useQuery(api.gpts.listGpts) ?? [];

  if (gpts.length === 0) return null;

  return (
    <div className="space-y-2">
      {/* Header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full px-2 py-1 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-2 text-xs font-semibold text-gray-700 uppercase tracking-wider">
          <Bot className="w-4 h-4" />
          AI Assistants
        </div>
        <ChevronDown
          className={cn(
            "w-4 h-4 text-gray-400 transition-transform duration-200",
            !isOpen && "rotate-180"
          )}
        />
      </button>

      {/* GPTs List */}
      {isOpen && (
        <div className="space-y-1 pl-2">
          {gpts.map((gpt) => {
            const isSelected = gpt.gptId === selectedGptId;

            return (
              <Link
                key={gpt._id}
                href={`${basePath ?? "/gpt5"}/${gpt.gptId}`}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-all",
                  isSelected
                    ? "bg-blue-50 text-blue-700 font-medium border border-blue-100"
                    : "text-gray-700 hover:bg-gray-100"
                )}
              >
                <div
                  className={cn(
                    "w-2 h-2 rounded-full",
                    isSelected ? "bg-blue-500" : "bg-gray-300"
                  )}
                />
                <span className="truncate">{formatGptTitle(gpt.gptId)}</span>
                {isSelected && (
                  <div className="ml-auto w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
