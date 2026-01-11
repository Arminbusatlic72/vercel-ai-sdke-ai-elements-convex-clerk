"use client";

import { MoreHorizontal, Trash2, Pencil } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem
} from "@/components/ui/dropdown-menu";

interface ChatActionButtonsProps {
  onRename: () => void;
  onDelete: () => void;
}

export function ChatActionButtons({
  onRename,
  onDelete
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
