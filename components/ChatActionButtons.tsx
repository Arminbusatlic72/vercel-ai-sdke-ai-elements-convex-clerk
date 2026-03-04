"use client";

import { Folder, MoreHorizontal, Trash2, Pencil } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger
} from "@/components/ui/dropdown-menu";
import { Id } from "@/convex/_generated/dataModel";

type ProjectOption = {
  _id: Id<"projects">;
  name: string;
};

interface ChatActionButtonsProps {
  onRename: () => void;
  onDelete: () => void;
  onMoveToProject: (projectId: Id<"projects"> | null) => void;
  projectOptions: ProjectOption[];
  currentProjectId?: Id<"projects">;
}

export function ChatActionButtons({
  onRename,
  onDelete,
  onMoveToProject,
  projectOptions,
  currentProjectId
}: ChatActionButtonsProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
          <MoreHorizontal className="w-4 h-4 text-gray-500" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuItem
          onClick={onRename}
          className="flex items-center gap-2 cursor-pointer hover:bg-gray-50"
        >
          <Pencil className="w-4 h-4 text-gray-600" />
          <span>Rename</span>
        </DropdownMenuItem>

        <DropdownMenuSub>
          <DropdownMenuSubTrigger className="flex items-center gap-2 cursor-pointer hover:bg-gray-50">
            <Folder className="w-4 h-4 text-gray-600" />
            <span>Move to Project</span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-56">
            <DropdownMenuItem
              onClick={() => onMoveToProject(null)}
              disabled={!currentProjectId}
              className="cursor-pointer"
            >
              Remove from project
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {projectOptions.length === 0 ? (
              <DropdownMenuItem disabled>
                No projects available
              </DropdownMenuItem>
            ) : (
              projectOptions.map((project) => (
                <DropdownMenuItem
                  key={project._id}
                  onClick={() => onMoveToProject(project._id)}
                  disabled={project._id === currentProjectId}
                  className="cursor-pointer"
                >
                  {project.name}
                </DropdownMenuItem>
              ))
            )}
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={onDelete}
          className="flex items-center gap-2 cursor-pointer text-red-600 hover:bg-red-50"
        >
          <Trash2 className="w-4 h-4" />
          <span>Delete</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
