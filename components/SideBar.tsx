// "use client";

// import * as React from "react";
// import Link from "next/link";
// import { use } from "react";
// import { NavigationContext } from "../lib/NavigationProvider";
// import { useRouter, usePathname } from "next/navigation";
// import { cn } from "../lib/utils";
// import { Button } from "../components/ui/button";
// import { PlusIcon } from "@radix-ui/react-icons";

// import { useMutation, useQuery } from "convex/react";
// import { api } from "@/convex/_generated/api";
// import ChatRow from "./ChatRow";
// import { Id, Doc } from "@/convex/_generated/dataModel";
// import ProjectItem from "./ProjectItem";
// import NewProjectModal from "./modals/NewProjectModal";
// import DeleteProjectModal from "./modals/DeleteProjectModal";
// import Logo from "./Logo";

// type ProjectId = Id<"projects">;
// type ChatId = Id<"chats">;

// // Main Sidebar Component
// export default function Sidebar() {
//   const router = useRouter();
//   const pathname = usePathname();
//   const basePath = "/" + pathname.split("/")[1];
//   const { closeMobileNav, isMobileNavOpen } = use(NavigationContext);

//   // Extract IDs from URL
//   const projectIdFromPath = pathname?.match(
//     new RegExp(`${basePath}/project/([^/]+)`)
//   )?.[1] as ProjectId | undefined;

//   const chatIdFromPath = pathname?.match(
//     new RegExp(`${basePath}/chat/([^/]+)`)
//   )?.[1] as ChatId | undefined;

//   // State
//   const [selectedProjectId, setSelectedProjectId] =
//     React.useState<ProjectId | null>(projectIdFromPath || null);
//   const [isNewProjectModalOpen, setIsNewProjectModalOpen] =
//     React.useState(false);
//   const [newProjectName, setNewProjectName] = React.useState("");
//   const [isDeleteProjectModalOpen, setIsDeleteProjectModalOpen] =
//     React.useState(false);
//   const [projectToDelete, setProjectToDelete] = React.useState<{
//     id: ProjectId;
//     name: string;
//   } | null>(null);

//   // Queries
//   const projects =
//     (useQuery(api.project.listProjects) as Doc<"projects">[]) ?? [];
//   const projectChats =
//     (useQuery(
//       api.chats.listChats,
//       selectedProjectId ? { projectId: selectedProjectId } : "skip"
//     ) as Doc<"chats">[]) ?? [];
//   const globalChats =
//     (useQuery(api.chats.listChats, {}) as Doc<"chats">[]) ?? [];

//   // Find current chat to determine which project it belongs to
//   const allChats = [...projectChats, ...globalChats];
//   const currentChat = chatIdFromPath
//     ? allChats.find((chat) => chat._id === chatIdFromPath)
//     : null;

//   // Mutations
//   const createProject = useMutation(api.project.createProject);
//   const deleteProject = useMutation(api.project.deleteProject);
//   const createChat = useMutation(api.chats.createChat);
//   const deleteChat = useMutation(api.chats.deleteChat);

//   // Sync selected project with URL and current chat
//   React.useEffect(() => {
//     if (projectIdFromPath) {
//       // On a project page
//       setSelectedProjectId(projectIdFromPath);
//     } else if (currentChat?.projectId) {
//       // On a chat page that belongs to a project
//       setSelectedProjectId(currentChat.projectId);
//     } else if (chatIdFromPath && currentChat && !currentChat.projectId) {
//       // On a global chat page (chat with no project)
//       setSelectedProjectId(null);
//     } else if (!chatIdFromPath && !projectIdFromPath) {
//       // On dashboard or other page
//       setSelectedProjectId(null);
//     }
//   }, [projectIdFromPath, chatIdFromPath, currentChat]);

//   // Handlers
//   const handleNewProject = () => {
//     setIsNewProjectModalOpen(true);
//   };

//   const handleCreateProject = async (e: React.FormEvent) => {
//     e.preventDefault();
//     if (!newProjectName.trim()) return;

//     try {
//       const projectId = await createProject({ name: newProjectName.trim() });
//       setSelectedProjectId(projectId);
//       setIsNewProjectModalOpen(false);
//       setNewProjectName("");
//       router.push(`${basePath}/project/${projectId}`);
//     } catch (err) {
//       console.error("Failed to create project:", err);
//     }
//   };

//   const handleCancelNewProject = () => {
//     setIsNewProjectModalOpen(false);
//     setNewProjectName("");
//   };

//   const handleDeleteProject = (id: ProjectId) => {
//     const project = projects.find((p) => p._id === id);
//     if (!project) return;

//     setProjectToDelete({ id, name: project.name });
//     setIsDeleteProjectModalOpen(true);
//   };

//   const handleConfirmDeleteProject = async () => {
//     if (!projectToDelete) return;

//     try {
//       await deleteProject({ id: projectToDelete.id });
//       if (selectedProjectId === projectToDelete.id) setSelectedProjectId(null);
//       setIsDeleteProjectModalOpen(false);
//       setProjectToDelete(null);
//       router.push(basePath);
//     } catch (err) {
//       console.error("Failed to delete project:", err);
//     }
//   };

//   const handleCancelDeleteProject = () => {
//     setIsDeleteProjectModalOpen(false);
//     setProjectToDelete(null);
//   };

//   const handleSelectProject = (id: ProjectId) => {
//     if (selectedProjectId === id) {
//       setSelectedProjectId(null);
//       router.push(basePath);
//     } else {
//       setSelectedProjectId(id);
//       router.push(`/${basePath}/project/${id}`);
//     }
//   };

//   const handleNewChat = async () => {
//     try {
//       const chatId = await createChat({
//         title: "",
//         projectId: undefined,
//         createdAt: Date.now()
//       });

//       setSelectedProjectId(null);
//       router.push(`/${basePath}/chat/${chatId}`);
//       closeMobileNav();
//     } catch (err) {
//       console.error("Failed to create chat:", err);
//     }
//   };

//   const handleDeleteChat = async (id: ChatId) => {
//     try {
//       await deleteChat({ id });
//       if (window.location.pathname.includes(id)) {
//         router.push(basePath);
//       }
//     } catch (err) {
//       console.error("Failed to delete chat:", err);
//     }
//   };

//   return (
//     <>
//       {/* Mobile backdrop */}
//       {isMobileNavOpen && (
//         <div
//           className="fixed inset-0 bg-black/20 z-40 md:hidden"
//           onClick={closeMobileNav}
//         />
//       )}

//       {/* Modals */}
//       <NewProjectModal
//         isOpen={isNewProjectModalOpen}
//         projectName={newProjectName}
//         onProjectNameChange={setNewProjectName}
//         onSubmit={handleCreateProject}
//         onCancel={handleCancelNewProject}
//       />

//       <DeleteProjectModal
//         isOpen={isDeleteProjectModalOpen}
//         projectName={projectToDelete?.name ?? ""}
//         onConfirm={handleConfirmDeleteProject}
//         onCancel={handleCancelDeleteProject}
//       />

//       {/* Sidebar */}
//       <div
//         className={cn(
//           "fixed md:inset-y-0 top-14 bottom-0 left-0 z-50 w-72 bg-gray-50/80 backdrop-blur-xl border-r border-gray-200/50 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 md:top-0 flex flex-col",
//           isMobileNavOpen ? "translate-x-0" : "-translate-x-full"
//         )}
//       >
//         {/* Header */}
//         <div className="p-4 border-b border-gray-200/50">
//           <div className="from-gray-50 to-white rounded-xl p-4 inline-flex justify-center items-center">
//             <Link
//               href="/dashboard"
//               // Add flex container styling here if needed to align the logo and text
//               className="flex items-center"
//             >
//               <Logo className="w-40 h-40 text-gray-600 mr-2" />
//             </Link>
//           </div>
//           <div className="mt-2 space-y-2">
//             <Button
//               onClick={handleNewProject}
//               className="w-full flex items-center justify-center bg-white hover:bg-gray-50 text-gray-700 border border-gray-200/50 shadow-sm hover:shadow transition-all duration-200"
//             >
//               <PlusIcon className="mr-2 h-4 w-4" /> New Project
//             </Button>
//             <Button
//               onClick={handleNewChat}
//               className="w-full flex items-center justify-center bg-white hover:bg-gray-50 text-gray-700 border border-gray-200/50 shadow-sm hover:shadow transition-all duration-200"
//             >
//               <PlusIcon className="mr-2 h-4 w-4" /> New Chat
//             </Button>
//           </div>
//         </div>

//         {/* Content area */}
//         <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
//           {/* Projects Section */}
//           {projects.length > 0 && (
//             <div className="space-y-2">
//               <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-2">
//                 Projects
//               </h4>
//               {projects.map((project) => (
//                 <ProjectItem
//                   basePath={basePath}
//                   key={project._id}
//                   project={project}
//                   isSelected={selectedProjectId === project._id}
//                   projectChats={projectChats}
//                   onSelect={handleSelectProject}
//                   onDelete={handleDeleteProject}
//                   onDeleteChat={handleDeleteChat}
//                 />
//               ))}
//             </div>
//           )}

//           {/* Global Chats Section */}
//           {globalChats.length > 0 && (
//             <div className="space-y-2">
//               <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-2">
//                 Chats
//               </h4>
//               {globalChats.map((chat) => (
//                 <ChatRow
//                   key={chat._id}
//                   chat={chat}
//                   basePath={basePath}
//                   onDelete={(id) => handleDeleteChat(id as ChatId)}
//                 />
//               ))}
//             </div>
//           )}

//           {/* Empty state */}
//           {projects.length === 0 && globalChats.length === 0 && (
//             <div className="text-center text-gray-400 text-sm py-8">
//               No projects or chats yet. <br />
//               Create one to get started!
//             </div>
//           )}
//         </div>
//       </div>
//     </>
//   );
// }

"use client";

import * as React from "react";
import { useContext, useMemo, useCallback, useReducer } from "react";
import Link from "next/link";
import { NavigationContext } from "../lib/NavigationProvider";
import { useRouter, usePathname } from "next/navigation";
import { cn } from "../lib/utils";
import { Button } from "../components/ui/button";
import { PlusIcon } from "@radix-ui/react-icons";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import ChatRow from "./ChatRow";
import { Id, Doc } from "@/convex/_generated/dataModel";
import ProjectItem from "./ProjectItem";
import NewProjectModal from "./modals/NewProjectModal";
import DeleteProjectModal from "./modals/DeleteProjectModal";
import Logo from "./Logo";

type ProjectId = Id<"projects">;
type ChatId = Id<"chats">;

// Modal state reducer
type ModalState = {
  newProject: { isOpen: boolean; name: string };
  deleteProject: {
    isOpen: boolean;
    project: { id: ProjectId; name: string } | null;
  };
};

type ModalAction =
  | { type: "OPEN_NEW_PROJECT" }
  | { type: "CLOSE_NEW_PROJECT" }
  | { type: "SET_PROJECT_NAME"; name: string }
  | { type: "OPEN_DELETE_PROJECT"; project: { id: ProjectId; name: string } }
  | { type: "CLOSE_DELETE_PROJECT" };

function modalReducer(state: ModalState, action: ModalAction): ModalState {
  switch (action.type) {
    case "OPEN_NEW_PROJECT":
      return { ...state, newProject: { isOpen: true, name: "" } };
    case "CLOSE_NEW_PROJECT":
      return { ...state, newProject: { isOpen: false, name: "" } };
    case "SET_PROJECT_NAME":
      return {
        ...state,
        newProject: { ...state.newProject, name: action.name }
      };
    case "OPEN_DELETE_PROJECT":
      return {
        ...state,
        deleteProject: { isOpen: true, project: action.project }
      };
    case "CLOSE_DELETE_PROJECT":
      return { ...state, deleteProject: { isOpen: false, project: null } };
    default:
      return state;
  }
}

// Parse pathname hook
function usePathParsing(pathname: string) {
  return useMemo(() => {
    const segments = pathname.split("/");
    return {
      basePath: `/${segments[1]}`,
      projectId:
        segments[2] === "project" ? (segments[3] as ProjectId) : undefined,
      chatId: segments[2] === "chat" ? (segments[3] as ChatId) : undefined
    };
  }, [pathname]);
}

// Main Sidebar Component
export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { closeMobileNav, isMobileNavOpen } = useContext(NavigationContext);

  // Parse pathname
  const {
    basePath,
    projectId: projectIdFromPath,
    chatId: chatIdFromPath
  } = usePathParsing(pathname);

  // State
  const [selectedProjectId, setSelectedProjectId] =
    React.useState<ProjectId | null>(projectIdFromPath || null);
  const [modalState, dispatch] = useReducer(modalReducer, {
    newProject: { isOpen: false, name: "" },
    deleteProject: { isOpen: false, project: null }
  });
  const [error, setError] = React.useState<string | null>(null);

  // Queries
  const projects = useQuery(api.project.listProjects) ?? [];
  const projectChats =
    useQuery(
      api.chats.listChats,
      selectedProjectId ? { projectId: selectedProjectId } : "skip"
    ) ?? [];
  const globalChats = useQuery(api.chats.listChats, {}) ?? [];

  // Memoized computed values
  const allChats = useMemo(
    () => [...projectChats, ...globalChats],
    [projectChats, globalChats]
  );

  const currentChat = useMemo(
    () =>
      chatIdFromPath
        ? allChats.find((chat) => chat._id === chatIdFromPath)
        : null,
    [chatIdFromPath, allChats]
  );

  // Mutations
  const createProject = useMutation(api.project.createProject);
  const deleteProject = useMutation(api.project.deleteProject);
  const createChat = useMutation(api.chats.createChat);
  const deleteChat = useMutation(api.chats.deleteChat);

  // Sync selected project with URL and current chat
  React.useEffect(() => {
    if (projectIdFromPath) {
      setSelectedProjectId(projectIdFromPath);
    } else if (currentChat?.projectId) {
      setSelectedProjectId(currentChat.projectId);
    } else if (chatIdFromPath && currentChat && !currentChat.projectId) {
      setSelectedProjectId(null);
    } else if (!chatIdFromPath && !projectIdFromPath) {
      setSelectedProjectId(null);
    }
  }, [projectIdFromPath, chatIdFromPath, currentChat]);

  // Handlers
  const handleNewProject = useCallback(() => {
    dispatch({ type: "OPEN_NEW_PROJECT" });
  }, []);

  const handleCreateProject = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const trimmedName = modalState.newProject.name.trim();
      if (!trimmedName) return;

      try {
        setError(null);
        const projectId = await createProject({ name: trimmedName });

        if (!projectId) {
          throw new Error("No project ID returned");
        }

        setSelectedProjectId(projectId as ProjectId);
        dispatch({ type: "CLOSE_NEW_PROJECT" });
        // Use exact original path construction
        router.push(`${basePath}/project/${projectId}`);
        closeMobileNav();
      } catch (err) {
        setError("Failed to create project. Please try again.");
        console.error("Failed to create project:", err);
      }
    },
    [
      modalState.newProject.name,
      createProject,
      router,
      basePath,
      closeMobileNav
    ]
  );

  const handleCancelNewProject = useCallback(() => {
    dispatch({ type: "CLOSE_NEW_PROJECT" });
  }, []);

  const handleDeleteProject = useCallback(
    (id: ProjectId) => {
      const project = projects.find((p) => p._id === id);
      if (!project) return;

      dispatch({
        type: "OPEN_DELETE_PROJECT",
        project: { id, name: project.name }
      });
    },
    [projects]
  );

  const handleConfirmDeleteProject = useCallback(async () => {
    const project = modalState.deleteProject.project;
    if (!project) return;

    try {
      setError(null);
      await deleteProject({ id: project.id });
      if (selectedProjectId === project.id) {
        setSelectedProjectId(null);
      }
      dispatch({ type: "CLOSE_DELETE_PROJECT" });
      router.push(basePath);
      closeMobileNav();
    } catch (err) {
      setError("Failed to delete project. Please try again.");
      console.error("Failed to delete project:", err);
    }
  }, [
    modalState.deleteProject.project,
    deleteProject,
    selectedProjectId,
    router,
    basePath,
    closeMobileNav
  ]);

  const handleCancelDeleteProject = useCallback(() => {
    dispatch({ type: "CLOSE_DELETE_PROJECT" });
  }, []);

  const handleSelectProject = useCallback(
    (id: ProjectId) => {
      if (selectedProjectId === id) {
        setSelectedProjectId(null);
        router.push(basePath);
      } else {
        setSelectedProjectId(id);
        // Use exact original path construction
        router.push(`${basePath}/project/${id}`);
      }
      closeMobileNav();
    },
    [selectedProjectId, router, basePath, closeMobileNav]
  );

  const handleNewChat = useCallback(async () => {
    try {
      setError(null);
      const chatId = await createChat({
        title: "",
        projectId: undefined,
        createdAt: Date.now()
      });

      setSelectedProjectId(null);
      // Use exact original path construction
      router.push(`${basePath}/chat/${chatId}`);
      closeMobileNav();
    } catch (err) {
      setError("Failed to create chat. Please try again.");
      console.error("Failed to create chat:", err);
    }
  }, [createChat, router, basePath, closeMobileNav]);

  const handleDeleteChat = useCallback(
    async (id: ChatId) => {
      try {
        setError(null);
        await deleteChat({ id });
        if (pathname.includes(id)) {
          router.push(basePath);
        }
      } catch (err) {
        setError("Failed to delete chat. Please try again.");
        console.error("Failed to delete chat:", err);
      }
    },
    [deleteChat, pathname, router, basePath]
  );

  return (
    <>
      {/* Mobile backdrop */}
      {isMobileNavOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-40 md:hidden"
          onClick={closeMobileNav}
        />
      )}

      {/* Modals */}
      <NewProjectModal
        isOpen={modalState.newProject.isOpen}
        projectName={modalState.newProject.name}
        onProjectNameChange={(name) =>
          dispatch({ type: "SET_PROJECT_NAME", name })
        }
        onSubmit={handleCreateProject}
        onCancel={handleCancelNewProject}
      />

      <DeleteProjectModal
        isOpen={modalState.deleteProject.isOpen}
        projectName={modalState.deleteProject.project?.name ?? ""}
        onConfirm={handleConfirmDeleteProject}
        onCancel={handleCancelDeleteProject}
      />

      {/* Sidebar */}
      <div
        className={cn(
          "fixed md:inset-y-0 top-14 bottom-0 left-0 z-50 w-72 bg-gray-50/80 backdrop-blur-xl border-r border-gray-200/50 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 md:top-0 flex flex-col",
          isMobileNavOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-200/50">
          <div className="from-gray-50 to-white rounded-xl p-4 inline-flex justify-center items-center">
            <Link href="/dashboard" className="flex items-center">
              <Logo className="w-40 h-40 text-gray-600 mr-2" />
            </Link>
          </div>

          {/* Error message */}
          {error && (
            <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-red-600 text-sm">
              {error}
            </div>
          )}

          <div className="mt-2 space-y-2">
            <Button
              onClick={handleNewProject}
              className="w-full flex items-center justify-center bg-white hover:bg-gray-50 text-gray-700 border border-gray-200/50 shadow-sm hover:shadow transition-all duration-200"
            >
              <PlusIcon className="mr-2 h-4 w-4" /> New Project
            </Button>
            <Button
              onClick={handleNewChat}
              className="w-full flex items-center justify-center bg-white hover:bg-gray-50 text-gray-700 border border-gray-200/50 shadow-sm hover:shadow transition-all duration-200"
            >
              <PlusIcon className="mr-2 h-4 w-4" /> New Chat
            </Button>
          </div>
        </div>

        {/* Content area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
          {/* Projects Section */}
          {projects.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-2">
                Projects
              </h4>
              {projects.map((project) => (
                <ProjectItem
                  basePath={basePath}
                  key={project._id}
                  project={project}
                  isSelected={selectedProjectId === project._id}
                  projectChats={projectChats}
                  onSelect={handleSelectProject}
                  onDelete={handleDeleteProject}
                  onDeleteChat={handleDeleteChat}
                />
              ))}
            </div>
          )}

          {/* Global Chats Section */}
          {globalChats.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-2">
                Chats
              </h4>
              {globalChats.map((chat) => (
                <ChatRow
                  key={chat._id}
                  chat={chat}
                  basePath={basePath}
                  onDelete={(id) => handleDeleteChat(id as ChatId)}
                />
              ))}
            </div>
          )}

          {/* Empty state */}
          {projects.length === 0 && globalChats.length === 0 && (
            <div className="text-center text-gray-400 text-sm py-8">
              No projects or chats yet. <br />
              Create one to get started!
            </div>
          )}
        </div>
      </div>
    </>
  );
}
