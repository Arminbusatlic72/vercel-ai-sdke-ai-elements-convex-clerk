import Link from "next/link";
import { Folder, FolderOpen, Trash2 as Trash2Icon } from "lucide-react";
import { cn } from "../lib/utils";
import { Id, Doc } from "@/convex/_generated/dataModel";
import ChatRow from "./ChatRow";

type ProjectId = Id<"projects">;
type ChatId = Id<"chats">;

interface ProjectItemProps {
  project: Doc<"projects">;
  isSelected: boolean;
  projectChats: Doc<"chats">[];
  onSelect: (id: ProjectId) => void;
  onDelete: (id: ProjectId) => void;
  onDeleteChat: (id: ChatId) => void;
  basePath: string;
}

export default function ProjectItem({
  project,
  isSelected,
  projectChats,
  basePath,
  onSelect,
  onDelete,
  onDeleteChat
}: ProjectItemProps) {
  return (
    <div className="space-y-1">
      {/* Project row */}
      <div className="flex items-center justify-between">
        <Link
          href={`${basePath}/project/${project._id}`}
          onClick={() => onSelect(project._id)}
          className={cn(
            "flex items-center gap-2 flex-1 p-2 rounded cursor-pointer transition-colors",
            isSelected ? "bg-gray-200" : "hover:bg-gray-100"
          )}
        >
          {isSelected ? (
            <FolderOpen className="w-4 h-4" />
          ) : (
            <Folder className="w-4 h-4" />
          )}
          <span className="truncate">{project.name}</span>
        </Link>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(project._id);
          }}
          className="ml-2 p-1 rounded text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors"
          aria-label="Delete project"
        >
          <Trash2Icon className="w-4 h-4" />
        </button>
      </div>

      {/* Project chats */}
      {isSelected && projectChats.length > 0 && (
        <div className="ml-6 space-y-1">
          {projectChats.map((chat) => (
            <ChatRow
              key={chat._id}
              chat={chat}
              basePath={basePath}
              onDelete={(id) => onDeleteChat(id as ChatId)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
