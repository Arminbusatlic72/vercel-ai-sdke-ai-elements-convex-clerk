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
  gptId?: string;
}

export default function ProjectItem({
  project,
  isSelected,
  projectChats,
  gptId,
  onSelect,
  onDelete,
  onDeleteChat
}: ProjectItemProps) {
  console.log(gptId, "ProjectItem gptId");
  const projectUrl = project.gptId
    ? `/gpt5/${project.gptId}/project/${project._id}`
    : `/gpt5/project/${project._id}`;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <Link
          href={projectUrl}
          onClick={() => onSelect(project._id)} // state sync only
          className={cn(
            "flex items-center gap-2 flex-1 p-2 rounded transition-colors",
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
          className="ml-2 p-1 rounded text-red-500 hover:bg-red-50"
        >
          <Trash2Icon className="w-4 h-4" />
        </button>
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
