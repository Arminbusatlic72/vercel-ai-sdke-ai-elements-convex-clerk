// import Link from "next/link";
// import {
//   DropdownMenu,
//   DropdownMenuTrigger,
//   DropdownMenuContent,
//   DropdownMenuItem
// } from "@/components/ui/dropdown-menu";
// import {
//   MoreHorizontal,
//   Folder,
//   FolderOpen,
//   Trash2 as Trash2Icon,
//   Pencil
// } from "lucide-react";
// import { cn } from "../lib/utils";
// import { Id, Doc } from "@/convex/_generated/dataModel";
// import ChatRow from "./ChatRow";

// type ProjectId = Id<"projects">;
// type ChatId = Id<"chats">;

// interface ProjectItemProps {
//   project: Doc<"projects">;
//   isSelected: boolean;
//   projectChats: Doc<"chats">[];
//   onSelect: (id: ProjectId) => void;
//   onDelete: (id: ProjectId) => void;
//   onDeleteChat: (id: ChatId) => void;
//   onRename: (project: { id: ProjectId; name: string }) => void;
//   basePath: string;
//   gptId?: string;
// }

// export default function ProjectItem({
//   project,
//   isSelected,
//   projectChats,
//   gptId,
//   onSelect,
//   onDelete,
//   onDeleteChat,
//   onRename
// }: ProjectItemProps) {
//   console.log(gptId, "ProjectItem gptId");
//   const projectUrl = project.gptId
//     ? `/gpt5/${project.gptId}/project/${project._id}`
//     : `/gpt5/project/${project._id}`;

//   return (
//     <div className="space-y-1">
//       <div className="flex items-center justify-between group">
//         <Link
//           href={projectUrl}
//           onClick={() => onSelect(project._id)}
//           className={cn(
//             "flex items-center gap-2 flex-1 p-2 rounded transition-colors",
//             isSelected ? "bg-gray-200" : "hover:bg-gray-100"
//           )}
//         >
//           <span
//             className={cn(
//               "transition-transform duration-200 ease-out",
//               isSelected ? "rotate-0 scale-110" : "-rotate-6 scale-100"
//             )}
//           >
//             {isSelected ? (
//               <FolderOpen className="w-4 h-4" />
//             ) : (
//               <Folder className="w-4 h-4" />
//             )}
//           </span>

//           <span className="truncate">{project.name}</span>
//         </Link>

//         <div className="opacity-0 group-hover:opacity-100 transition-opacity">
//           <DropdownMenu>
//             <DropdownMenuTrigger asChild>
//               <button
//                 onClick={(e) => e.stopPropagation()}
//                 className="p-1 rounded hover:bg-gray-100"
//               >
//                 <MoreHorizontal className="w-4 h-4 text-gray-400" />
//               </button>
//             </DropdownMenuTrigger>

//             <DropdownMenuContent align="end" className="w-36">
//               <DropdownMenuItem
//                 onClick={(e) => {
//                   e.stopPropagation();
//                   onRename({ id: project._id, name: project.name });
//                 }}
//               >
//                 <Pencil className="w-4 h-4 mr-2" />
//                 Rename
//               </DropdownMenuItem>

//               <DropdownMenuItem
//                 onClick={(e) => {
//                   e.stopPropagation();
//                   onDelete(project._id);
//                 }}
//                 className="text-red-600 focus:text-red-600"
//               >
//                 <Trash2Icon className="w-4 h-4 mr-2" />
//                 Delete
//               </DropdownMenuItem>
//             </DropdownMenuContent>
//           </DropdownMenu>
//         </div>
//       </div>

//       {isSelected && projectChats.length > 0 && (
//         <div className="ml-6 space-y-1">
//           {projectChats.map((chat) => (
//             <ChatRow
//               key={chat._id}
//               chat={chat}
//               gptId={gptId}
//               projectId={project._id}
//               onDelete={(id) => onDeleteChat(id as ChatId)}
//             />
//           ))}
//         </div>
//       )}
//     </div>
//   );
// }

// import Link from "next/link";
// import {
//   DropdownMenu,
//   DropdownMenuTrigger,
//   DropdownMenuContent,
//   DropdownMenuItem
// } from "@/components/ui/dropdown-menu";
// import {
//   MoreHorizontal,
//   Folder,
//   FolderOpen,
//   Trash2 as Trash2Icon,
//   Pencil,
//   ChevronRight,
//   MessageSquare
// } from "lucide-react";
// import { cn } from "../lib/utils";
// import { Id, Doc } from "@/convex/_generated/dataModel";
// import ChatRow from "./ChatRow";

// type ProjectId = Id<"projects">;
// type ChatId = Id<"chats">;

// interface ProjectItemProps {
//   project: Doc<"projects">;
//   isSelected: boolean;
//   projectChats: Doc<"chats">[];
//   onSelect: (id: ProjectId) => void;
//   onDelete: (id: ProjectId) => void;
//   onDeleteChat: (id: ChatId) => void;
//   onRename: (project: { id: ProjectId; name: string }) => void;
//   basePath: string;
//   gptId?: string;
// }

// export default function ProjectItem({
//   project,
//   isSelected,
//   projectChats,
//   gptId,
//   onSelect,
//   onDelete,
//   onDeleteChat,
//   onRename
// }: ProjectItemProps) {
//   const projectUrl = project.gptId
//     ? `/gpt5/${project.gptId}/project/${project._id}`
//     : `/gpt5/project/${project._id}`;

//   return (
//     <div className="space-y-1">
//       {/* Project Header */}
//       <div className="flex items-center group">
//         {/* Selection indicator */}
//         <div
//           className={cn(
//             "w-1 h-6 rounded-r-lg transition-all duration-200",
//             isSelected ? "bg-blue-500" : "group-hover:bg-gray-300"
//           )}
//         />

//         <Link
//           href={projectUrl}
//           onClick={() => onSelect(project._id)}
//           className={cn(
//             "flex items-center gap-2 flex-1 px-3 py-2 rounded-lg transition-all duration-200 text-[12px]",
//             isSelected
//               ? "bg-blue-50 text-blue-700 border border-blue-100"
//               : "hover:bg-gray-100 text-gray-700"
//           )}
//         >
//           <span
//             className={cn(
//               "transition-transform duration-200",
//               isSelected ? "rotate-0" : "group-hover:rotate-12"
//             )}
//           >
//             {isSelected ? (
//               <FolderOpen className="w-4 h-4" />
//             ) : (
//               <Folder className="w-4 h-4" />
//             )}
//           </span>

//           <span className="truncate">{project.name}</span>

//           {/* Project stats */}
//           <div className="ml-auto flex items-center gap-2">
//             {projectChats.length > 0 && (
//               <span className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
//                 {projectChats.length}
//               </span>
//             )}
//             {isSelected && (
//               <ChevronRight className="w-3 h-3 text-blue-500 transform rotate-90" />
//             )}
//           </div>
//         </Link>

//         {/* Dropdown Menu */}
//         <div className="opacity-0 group-hover:opacity-100 transition-opacity pl-1">
//           <DropdownMenu>
//             <DropdownMenuTrigger asChild>
//               <button
//                 onClick={(e) => e.stopPropagation()}
//                 className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
//               >
//                 <MoreHorizontal className="w-4 h-4 text-gray-500" />
//               </button>
//             </DropdownMenuTrigger>

//             <DropdownMenuContent
//               align="end"
//               className="w-40 bg-white border border-gray-200 rounded-lg shadow-lg"
//             >
//               <DropdownMenuItem
//                 onClick={(e) => {
//                   e.stopPropagation();
//                   onRename({ id: project._id, name: project.name });
//                 }}
//                 className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-gray-50"
//               >
//                 <Pencil className="w-4 h-4 text-gray-600" />
//                 <span>Rename</span>
//               </DropdownMenuItem>

//               <DropdownMenuItem
//                 onClick={(e) => {
//                   e.stopPropagation();
//                   onDelete(project._id);
//                 }}
//                 className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer text-red-600 hover:bg-red-50"
//               >
//                 <Trash2Icon className="w-4 h-4" />
//                 <span>Delete</span>
//               </DropdownMenuItem>
//             </DropdownMenuContent>
//           </DropdownMenu>
//         </div>
//       </div>

//       {/* Project Chats (when selected) */}
//       {isSelected && projectChats.length > 0 && (
//         <div className="ml-0 pl-3 border-l border-gray-200 space-y-1">
//           <div className="mt-2 mb-1 flex items-center gap-1 text-xs text-gray-500 font-medium uppercase tracking-wider">
//             <MessageSquare className="w-3 h-3" />
//             <span>Chats in project</span>
//           </div>

//           {projectChats.map((chat) => (
//             <ChatRow
//               key={chat._id}
//               chat={chat}
//               gptId={gptId}
//               projectId={project._id}
//               onDelete={(id) => onDeleteChat(id as ChatId)}
//               variant="project"
//             />
//           ))}
//         </div>
//       )}
//     </div>
//   );
// }

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
  Pencil,
  ChevronRight
} from "lucide-react";
import { cn } from "../lib/utils";
import { Id, Doc } from "@/convex/_generated/dataModel";

type ProjectId = Id<"projects">;

interface ProjectItemProps {
  project: Doc<"projects">;
  isSelected: boolean;
  projectChats: Doc<"chats">[];
  onSelect: (id: ProjectId) => void;
  onDelete: (id: ProjectId) => void;
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
  onRename
}: ProjectItemProps) {
  const projectUrl = project.gptId
    ? `/gpt5/${project.gptId}/project/${project._id}`
    : `/gpt5/project/${project._id}`;

  return (
    <div className="group">
      <div className="flex items-center">
        {/* Selection indicator */}
        <div
          className={cn(
            "w-1 h-8 rounded-r-lg transition-all duration-200",
            isSelected
              ? "bg-blue-500"
              : "bg-transparent group-hover:bg-gray-300"
          )}
        />

        <Link
          href={projectUrl}
          onClick={() => onSelect(project._id)}
          className={cn(
            "flex items-center gap-2 flex-1 px-3 py-2 rounded-lg transition-all duration-200 cursor-pointer",
            isSelected
              ? "bg-blue-50 text-blue-700 border border-blue-100"
              : "hover:bg-gray-100 text-gray-700"
          )}
        >
          <span className="flex-shrink-0">
            {isSelected ? (
              <FolderOpen className="w-4 h-4 text-blue-600" />
            ) : (
              <Folder className="w-4 h-4 text-gray-500" />
            )}
          </span>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium truncate">
                {project.name}
              </span>

              {/* Chat count badge - always visible */}
              {projectChats.length > 0 && (
                <span className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded ml-2">
                  {projectChats.length}
                </span>
              )}
            </div>
          </div>

          {/* Chevron for selected project */}
          {isSelected && (
            <ChevronRight className="w-4 h-4 text-blue-500 ml-2" />
          )}
        </Link>

        {/* Dropdown Menu */}
        <div
          className={cn(
            "transition-opacity pr-2",
            isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          )}
        >
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                onClick={(e) => e.stopPropagation()}
                className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <MoreHorizontal className="w-4 h-4 text-gray-500" />
              </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent
              align="end"
              className="w-40 bg-white border border-gray-200 rounded-lg shadow-lg"
            >
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onRename({ id: project._id, name: project.name });
                }}
                className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-gray-50"
              >
                <Pencil className="w-4 h-4 text-gray-600" />
                <span>Rename</span>
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(project._id);
                }}
                className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer text-red-600 hover:bg-red-50"
              >
                <Trash2Icon className="w-4 h-4" />
                <span>Delete</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
