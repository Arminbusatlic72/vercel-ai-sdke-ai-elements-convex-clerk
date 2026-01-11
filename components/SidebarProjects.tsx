// "use client";

// import { Id } from "@/convex/_generated/dataModel";
// import ProjectItem from "./ProjectItem";
// import { NewProjectItem } from "./NewProjectItem";

// type ProjectId = Id<"projects">;
// type ChatId = Id<"chats">;

// interface SidebarProjectsProps {
//   projects: any[];
//   projectChats: any[];
//   basePath: string;
//   gptId?: string;
//   selectedProjectId: ProjectId | null;
//   onSelectProject: (id: ProjectId) => void;
//   onNewProject: () => void;
//   onDeleteProject: (id: ProjectId) => void;
//   onRenameProject: (project: { id: ProjectId; name: string }) => void;
//   onDeleteChat: (id: ChatId) => void;
// }

// export default function SidebarProjects({
//   projects,
//   projectChats,
//   basePath,
//   gptId,
//   selectedProjectId,
//   onSelectProject,
//   onNewProject,
//   onDeleteProject,
//   onRenameProject,
//   onDeleteChat
// }: SidebarProjectsProps) {
//   if (projects.length === 0) return null;

//   return (
//     <div className="space-y-2">
//       <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-2">
//         Projects
//       </h4>

//       <NewProjectItem onCreate={onNewProject} />

//       {projects.map((project) => (
//         <ProjectItem
//           key={project._id}
//           basePath={basePath}
//           gptId={gptId}
//           project={project}
//           isSelected={selectedProjectId === project._id}
//           projectChats={projectChats}
//           onSelect={onSelectProject}
//           onDelete={onDeleteProject}
//           onDeleteChat={onDeleteChat}
//           onRename={onRenameProject}
//         />
//       ))}
//     </div>
//   );
// }

// "use client";

// import { useState } from "react";
// import { Id } from "@/convex/_generated/dataModel";
// import { ChevronDown } from "lucide-react";
// import ProjectItem from "./ProjectItem";
// import { NewProjectItem } from "./NewProjectItem";
// import { cn } from "@/lib/utils";

// type ProjectId = Id<"projects">;
// type ChatId = Id<"chats">;

// interface SidebarProjectsProps {
//   projects: any[];
//   projectChats: any[];
//   basePath: string;
//   gptId?: string;
//   selectedProjectId: ProjectId | null;
//   onSelectProject: (id: ProjectId) => void;
//   onNewProject: () => void;
//   onDeleteProject: (id: ProjectId) => void;
//   onRenameProject: (project: { id: ProjectId; name: string }) => void;
//   onDeleteChat: (id: ChatId) => void;
// }

// export default function SidebarProjects({
//   projects,
//   projectChats,
//   basePath,
//   gptId,
//   selectedProjectId,
//   onSelectProject,
//   onNewProject,
//   onDeleteProject,
//   onRenameProject,
//   onDeleteChat
// }: SidebarProjectsProps) {
//   const [isOpen, setIsOpen] = useState(false);

//   if (projects.length === 0) return null;

//   const handleToggleDropdown = () => {
//     setIsOpen((prev) => !prev);
//   };

//   return (
//     <div className="space-y-2">
//       {/* Header */}
//       <div className="flex items-center justify-between px-2">
//         <button
//           onClick={handleToggleDropdown}
//           className="flex items-center gap-1 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-700 transition-colors"
//         >
//           Projects
//           <ChevronDown
//             className={cn(
//               "w-4 h-4 transition-transform duration-200",
//               isOpen && "rotate-180"
//             )}
//           />
//         </button>
//       </div>

//       {/* Dropdown */}
//       {isOpen && (
//         <div className="space-y-2">
//           <NewProjectItem onCreate={onNewProject} />

//           {projects.map((project) => (
//             <ProjectItem
//               key={project._id}
//               basePath={basePath}
//               gptId={gptId}
//               project={project}
//               isSelected={selectedProjectId === project._id}
//               projectChats={projectChats}
//               onSelect={onSelectProject}
//               onDelete={onDeleteProject}
//               onDeleteChat={onDeleteChat}
//               onRename={onRenameProject}
//             />
//           ))}
//         </div>
//       )}
//     </div>
//   );
// }

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

  if (projects.length === 0) return null;

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
