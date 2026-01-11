// import { FolderPlus } from "lucide-react";
// import { cn } from "@/lib/utils";

// export function NewProjectItem({ onCreate }: { onCreate: () => void }) {
//   return (
//     <div className="space-y-1">
//       <div className="flex items-center justify-between">
//         <button
//           onClick={onCreate}
//           className={cn(
//             "flex items-center gap-2 flex-1 p-2 rounded transition-colors",
//             "hover:bg-gray-100 text-gray-700"
//           )}
//         >
//           <span className="transition-transform duration-200 ease-out -rotate-6">
//             <FolderPlus className="w-4 h-4" />
//           </span>

//           <span className="font-medium">New Project</span>
//         </button>
//       </div>
//     </div>
//   );
// }

import { FolderPlus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export function NewProjectItem({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center">
        {/* Placeholder indicator */}
        <div className="w-1 h-6 rounded-r-lg bg-transparent" />

        <button
          onClick={onCreate}
          className={cn(
            "flex items-center gap-2 flex-1 px-3 py-2 rounded-lg transition-all",
            "bg-gradient-to-r from-gray-50 to-white border border-gray-200",
            "hover:from-gray-100 hover:to-gray-50 hover:border-gray-300",
            "text-gray-700 hover:text-gray-900 text-[12px]",
            "group"
          )}
        >
          <span className="transition-all duration-200 group-hover:scale-110 group-hover:rotate-12">
            <FolderPlus className="w-4 h-4" />
          </span>

          <span className="font-medium">New Project</span>

          <span className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
            <Plus className="w-4 h-4 text-gray-400" />
          </span>
        </button>
      </div>
    </div>
  );
}
