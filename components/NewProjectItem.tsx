import { FolderPlus } from "lucide-react";
import { cn } from "@/lib/utils";

export function NewProjectItem({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <button
          onClick={onCreate}
          className={cn(
            "flex items-center gap-2 flex-1 p-2 rounded transition-colors",
            "hover:bg-gray-100 text-gray-700"
          )}
        >
          <span className="transition-transform duration-200 ease-out -rotate-6">
            <FolderPlus className="w-4 h-4" />
          </span>

          <span className="font-medium">New Project</span>
        </button>
      </div>
    </div>
  );
}
