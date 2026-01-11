// import { FilePen } from "lucide-react";
// import { cn } from "@/lib/utils";

// export function NewChatItem({ onCreate }: { onCreate: () => void }) {
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
//             <FilePen className="w-4 h-4" />
//           </span>

//           <span className="font-medium">New Chat</span>
//         </button>
//       </div>
//     </div>
//   );
// }

import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export function NewChatItem({ onCreate }: { onCreate: () => void }) {
  return (
    <button
      onClick={onCreate}
      className={cn(
        "flex items-center justify-center gap-2 w-full px-4 py-3",
        "bg-gradient-to-r from-blue-600 to-blue-700 text-white",
        "rounded-lg hover:from-blue-700 hover:to-blue-800",
        "transition-all shadow-sm hover:shadow-md",
        "font-medium"
      )}
    >
      <Plus className="w-4 h-4" />
      <span>New Chat</span>
    </button>
  );
}
