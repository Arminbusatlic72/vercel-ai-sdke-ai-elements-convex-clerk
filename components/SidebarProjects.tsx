"use client";

import { useState } from "react";
import { Id } from "@/convex/_generated/dataModel";
import { ChevronDown, Folder } from "lucide-react";
import ProjectItem from "./ProjectItem";
import { NewProjectItem } from "./NewProjectItem";
import { cn } from "@/lib/utils";

type ProjectId = Id<"projects">;

interface SidebarProjectsProps {
  projects: any[];
  projectChats: any[];
  basePath: string;
  gptId?: string;
  selectedProjectId: ProjectId | null;
  onSelectProject: (id: ProjectId) => void;
  onNewProject: () => void;
  onDeleteProject: (id: ProjectId) => void;
  onRenameProject: (project: { id: ProjectId; name: string }) => void;
}

export default function SidebarProjects({
  projects,
  projectChats,
  basePath,
  gptId,
  selectedProjectId,
  onSelectProject,
  onNewProject,
  onDeleteProject,
  onRenameProject
}: SidebarProjectsProps) {
  const [isOpen, setIsOpen] = useState(true);

  // if (projects.length === 0) return null;

  return (
    <div className="space-y-2">
      {/* Header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full px-2 py-2 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-2 text-xs font-semibold text-gray-700 uppercase tracking-wider">
          <Folder className="w-4 h-4" />
          <span>Projects ({projects.length})</span>
        </div>
        <ChevronDown
          className={cn(
            "w-4 h-4 text-gray-400 transition-transform duration-200",
            !isOpen && "rotate-180"
          )}
        />
      </button>

      {/* Projects List */}
      {isOpen && (
        <div className="space-y-1">
          <NewProjectItem onCreate={onNewProject} />

          <div className="space-y-1">
            {projects.map((project) => {
              const chatsForThisProject = projectChats.filter(
                (chat) => chat.projectId === project._id
              );

              return (
                <ProjectItem
                  key={project._id}
                  basePath={basePath}
                  gptId={gptId}
                  project={project}
                  isSelected={selectedProjectId === project._id}
                  projectChats={chatsForThisProject}
                  onSelect={onSelectProject}
                  onDelete={onDeleteProject}
                  onRename={onRenameProject}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
