import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem
} from "@/components/ui/dropdown-menu";
import {
  MoreHorizontal,
  Folder,
  FolderOpen,
  Trash2 as Trash2Icon,
  Pencil
} from "lucide-react";
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
  onRename: (project: { id: ProjectId; name: string }) => void;
  basePath: string;
  gptId?: string;
}

export default function ProjectItem({
  project,
  isSelected,
  projectChats,
  gptId,
  onSelect,
  onDelete,
  onDeleteChat,
  onRename
}: ProjectItemProps) {
  console.log(gptId, "ProjectItem gptId");
  const projectUrl = project.gptId
    ? `/gpt5/${project.gptId}/project/${project._id}`
    : `/gpt5/project/${project._id}`;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between group">
        <Link
          href={projectUrl}
          onClick={() => onSelect(project._id)}
          className={cn(
            "flex items-center gap-2 flex-1 p-2 rounded transition-colors",
            isSelected ? "bg-gray-200" : "hover:bg-gray-100"
          )}
        >
          <span
            className={cn(
              "transition-transform duration-200 ease-out",
              isSelected ? "rotate-0 scale-110" : "-rotate-6 scale-100"
            )}
          >
            {isSelected ? (
              <FolderOpen className="w-4 h-4" />
            ) : (
              <Folder className="w-4 h-4" />
            )}
          </span>

          <span className="truncate">{project.name}</span>
        </Link>

        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                onClick={(e) => e.stopPropagation()}
                className="p-1 rounded hover:bg-gray-100"
              >
                <MoreHorizontal className="w-4 h-4 text-gray-400" />
              </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-36">
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onRename({ id: project._id, name: project.name });
                }}
              >
                <Pencil className="w-4 h-4 mr-2" />
                Rename
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(project._id);
                }}
                className="text-red-600 focus:text-red-600"
              >
                <Trash2Icon className="w-4 h-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {isSelected && projectChats.length > 0 && (
        <div className="ml-6 space-y-1">
          {projectChats.map((chat) => (
            <ChatRow
              key={chat._id}
              chat={chat}
              gptId={gptId}
              projectId={project._id}
              onDelete={(id) => onDeleteChat(id as ChatId)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
