// // "use client";

// // import * as React from "react";
// // import { useContext, useMemo, useCallback, useReducer, useState } from "react";
// // import Link from "next/link";
// // import { useRouter, usePathname } from "next/navigation";
// // import { cn } from "../lib/utils";

// // import { useMutation, useQuery } from "convex/react";
// // import { api } from "@/convex/_generated/api";
// // import ChatRow from "./ChatRow";
// // import ProjectItem from "./ProjectItem";
// // import NewProjectModal from "./modals/NewProjectModal";
// // import DeleteProjectModal from "./modals/DeleteProjectModal";
// // import RenameProjectModal from "./modals/RenameProjectModal";
// // import Logo from "./Logo";
// // import { NavigationContext } from "../lib/NavigationProvider";
// // import { Id } from "@/convex/_generated/dataModel";
// // import { Search } from "lucide-react";
// // import { NewProjectItem } from "./NewProjectItem";
// // import { NewChatItem } from "./NewChatItem";
// // import SidebarGpts from "./SidebarGpts";
// // import SearchInput from "./SearchInput";
// // type ProjectId = Id<"projects">;
// // type ChatId = Id<"chats">;

// // // Modal state reducer
// // type ModalState = {
// //   newProject: { isOpen: boolean; name: string };

// //   deleteProject: {
// //     isOpen: boolean;
// //     project: { id: ProjectId; name: string } | null;
// //   };

// //   renameProject: {
// //     isOpen: boolean;
// //     project: { id: ProjectId; name: string } | null;
// //     name: string;
// //   };
// // };

// // type ModalAction =
// //   | { type: "OPEN_NEW_PROJECT" }
// //   | { type: "CLOSE_NEW_PROJECT" }
// //   | { type: "SET_PROJECT_NAME"; name: string }
// //   | { type: "OPEN_DELETE_PROJECT"; project: { id: ProjectId; name: string } }
// //   | { type: "CLOSE_DELETE_PROJECT" }
// //   | { type: "OPEN_RENAME_PROJECT"; project: { id: ProjectId; name: string } }
// //   | { type: "SET_RENAME_PROJECT_NAME"; name: string }
// //   | { type: "CLOSE_RENAME_PROJECT" };

// // function modalReducer(state: ModalState, action: ModalAction): ModalState {
// //   switch (action.type) {
// //     case "OPEN_NEW_PROJECT":
// //       return { ...state, newProject: { isOpen: true, name: "" } };

// //     case "CLOSE_NEW_PROJECT":
// //       return { ...state, newProject: { isOpen: false, name: "" } };

// //     case "SET_PROJECT_NAME":
// //       return {
// //         ...state,
// //         newProject: { ...state.newProject, name: action.name }
// //       };

// //     case "OPEN_DELETE_PROJECT":
// //       return {
// //         ...state,
// //         deleteProject: { isOpen: true, project: action.project }
// //       };

// //     case "CLOSE_DELETE_PROJECT":
// //       return {
// //         ...state,
// //         deleteProject: { isOpen: false, project: null }
// //       };

// //     case "OPEN_RENAME_PROJECT":
// //       return {
// //         ...state,
// //         renameProject: {
// //           isOpen: true,
// //           project: action.project,
// //           name: action.project.name
// //         }
// //       };

// //     case "SET_RENAME_PROJECT_NAME":
// //       return {
// //         ...state,
// //         renameProject: {
// //           ...state.renameProject,
// //           name: action.name
// //         }
// //       };

// //     case "CLOSE_RENAME_PROJECT":
// //       return {
// //         ...state,
// //         renameProject: { isOpen: false, project: null, name: "" }
// //       };

// //     default:
// //       return state;
// //   }
// // }

// // // Hook to parse dynamic pathname
// // function usePathParsing(pathname: string) {
// //   return useMemo(() => {
// //     const segments = pathname.split("/").filter(Boolean);

// //     // const basePath = `/${segments[0]}`; // /gpt5
// //     const basePath = `/${segments[0]}`; // /gpt5

// //     let gptId: string | undefined;
// //     let projectId: string | undefined;
// //     let chatId: string | undefined;

// //     if (segments[1] && segments[1] !== "chat" && segments[1] !== "project") {
// //       gptId = segments[1];
// //     }

// //     if (segments.includes("project")) {
// //       const projectIndex = segments.indexOf("project");
// //       projectId = segments[projectIndex + 1];
// //     }

// //     if (segments.includes("chat")) {
// //       const chatIndex = segments.indexOf("chat");
// //       chatId = segments[chatIndex + 1];
// //     }

// //     return { basePath, gptId, projectId, chatId };
// //   }, [pathname]);
// // }

// // export default function Sidebar() {
// //   const router = useRouter();
// //   const pathname = usePathname();
// //   const { closeMobileNav, isMobileNavOpen } = useContext(NavigationContext);

// //   const {
// //     basePath,
// //     gptId,
// //     projectId: projectIdFromPath,
// //     chatId: chatIdFromPath
// //   } = usePathParsing(pathname);

// //   const [selectedProjectId, setSelectedProjectId] =
// //     React.useState<ProjectId | null>(projectIdFromPath || null);
// //   const [modalState, dispatch] = useReducer(modalReducer, {
// //     newProject: { isOpen: false, name: "" },
// //     deleteProject: { isOpen: false, project: null },
// //     renameProject: { isOpen: false, project: null, name: "" }
// //   });

// //   const [error, setError] = React.useState<string | null>(null);

// //   // Queries
// //   const projects = useQuery(api.project.listProjects) ?? [];
// //   const projectChats =
// //     useQuery(
// //       api.chats.listChats,
// //       selectedProjectId ? { projectId: selectedProjectId } : "skip"
// //     ) ?? [];
// //   const globalChats = useQuery(api.chats.listChats, {}) ?? [];

// //   const allChats = useMemo(
// //     () => [...projectChats, ...globalChats],
// //     [projectChats, globalChats]
// //   );

// //   const currentChat = useMemo(
// //     () =>
// //       chatIdFromPath ? allChats.find((c) => c._id === chatIdFromPath) : null,
// //     [chatIdFromPath, allChats]
// //   );

// //   // Mutations
// //   const createProject = useMutation(api.project.createProject);
// //   const deleteProject = useMutation(api.project.deleteProject);
// //   const createChat = useMutation(api.chats.createChat);
// //   const deleteChat = useMutation(api.chats.deleteChat);
// //   const renameProject = useMutation(api.project.renameProject);

// //   React.useEffect(() => {
// //     if (projectIdFromPath) {
// //       setSelectedProjectId(projectIdFromPath as ProjectId); // cast string → ProjectId
// //     } else if (currentChat?.projectId) {
// //       setSelectedProjectId(currentChat.projectId);
// //     } else {
// //       setSelectedProjectId(null); // ensure it’s null, not undefined
// //     }
// //   }, [projectIdFromPath, chatIdFromPath, currentChat]);

// //   // Handlers
// //   const handleNewProject = useCallback(
// //     () => dispatch({ type: "OPEN_NEW_PROJECT" }),
// //     []
// //   );

// //   const handleCreateProject = useCallback(
// //     async (e: React.FormEvent) => {
// //       e.preventDefault();

// //       const trimmedName = modalState.newProject.name.trim();
// //       if (!trimmedName) return;

// //       try {
// //         setError(null);

// //         const projectId = await createProject({
// //           name: trimmedName,
// //           ...(gptId ? { gptId } : {}) // ✅ optional
// //         });

// //         if (!projectId) throw new Error("No project ID returned");

// //         setSelectedProjectId(projectId as ProjectId);
// //         dispatch({ type: "CLOSE_NEW_PROJECT" });

// //         // ✅ route depends on gptId presence
// //         const url = gptId
// //           ? `/gpt5/${gptId}/project/${projectId}`
// //           : `/gpt5/project/${projectId}`;

// //         router.push(url);
// //         closeMobileNav();
// //       } catch (err) {
// //         setError("Failed to create project. Please try again.");
// //         console.error(err);
// //       }
// //     },
// //     [modalState.newProject.name, createProject, router, gptId, closeMobileNav]
// //   );

// //   const handleCancelNewProject = useCallback(
// //     () => dispatch({ type: "CLOSE_NEW_PROJECT" }),
// //     []
// //   );

// //   const handleDeleteProject = useCallback(
// //     (id: ProjectId) => {
// //       const project = projects.find((p) => p._id === id);
// //       if (!project) return;
// //       dispatch({
// //         type: "OPEN_DELETE_PROJECT",
// //         project: { id, name: project.name }
// //       });
// //     },
// //     [projects]
// //   );

// //   const handleConfirmDeleteProject = useCallback(async () => {
// //     const project = modalState.deleteProject.project;
// //     if (!project) return;

// //     try {
// //       setError(null);
// //       await deleteProject({ id: project.id });
// //       if (selectedProjectId === project.id) setSelectedProjectId(null);
// //       dispatch({ type: "CLOSE_DELETE_PROJECT" });
// //       router.push(`${basePath}/${gptId ?? ""}`);
// //       closeMobileNav();
// //     } catch (err) {
// //       setError("Failed to delete project. Please try again.");
// //       console.error(err);
// //     }
// //   }, [
// //     modalState.deleteProject.project,
// //     deleteProject,
// //     selectedProjectId,
// //     router,
// //     basePath,
// //     gptId,
// //     closeMobileNav
// //   ]);

// //   const handleCancelDeleteProject = useCallback(
// //     () => dispatch({ type: "CLOSE_DELETE_PROJECT" }),
// //     []
// //   );

// //   const handleSelectProject = useCallback(
// //     (id: ProjectId) => {
// //       // Toggle: if already selected, deselect
// //       setSelectedProjectId((prev) => (prev === id ? null : id));
// //       closeMobileNav();
// //     },
// //     [closeMobileNav]
// //   );
// //   const handleRenameProject = useCallback(
// //     (project: { id: ProjectId; name: string }) => {
// //       dispatch({ type: "OPEN_RENAME_PROJECT", project });
// //     },
// //     []
// //   );

// //   const handleConfirmRenameProject = useCallback(async () => {
// //     const { project, name } = modalState.renameProject;
// //     if (!project || !name.trim()) return;

// //     try {
// //       await renameProject({
// //         id: project.id,
// //         name: name.trim()
// //       });

// //       dispatch({ type: "CLOSE_RENAME_PROJECT" });
// //     } catch (err) {
// //       setError("Failed to rename project.");
// //       console.error(err);
// //     }
// //   }, [modalState.renameProject, renameProject]);

// //   const handleNewChat = useCallback(
// //     async (msg?: { text?: string }) => {
// //       try {
// //         setError(null);

// //         // Generate title from msg text if provided, else fallback
// //         const title = msg?.text
// //           ? msg.text.slice(0, 50) + (msg.text.length > 50 ? "..." : "")
// //           : "New chat";

// //         // Create new chat under current gptId & projectId
// //         const newChatId = await createChat({
// //           title, // ✅ title from message or placeholder
// //           projectId: selectedProjectId ?? undefined,
// //           gptId: gptId ?? undefined,
// //           createdAt: Date.now()
// //         });

// //         let chatUrl = "/gpt5";

// //         // Add gptId if it exists
// //         if (gptId) chatUrl += `/${gptId}`;

// //         // Add chatId
// //         chatUrl += `/chat/${newChatId}`;

// //         router.push(chatUrl);
// //         closeMobileNav();
// //       } catch (err) {
// //         setError("Failed to create chat. Please try again.");
// //         console.error(err);
// //       }
// //     },
// //     [createChat, gptId, selectedProjectId, router, closeMobileNav]
// //   );

// //   const handleDeleteChat = useCallback(
// //     async (id: ChatId) => {
// //       try {
// //         setError(null);
// //         await deleteChat({ id });
// //         if (pathname.includes(id)) router.push(`${basePath}/${gptId ?? ""}`);
// //       } catch (err) {
// //         setError("Failed to delete chat. Please try again.");
// //         console.error(err);
// //       }
// //     },
// //     [deleteChat, pathname, router, basePath, gptId]
// //   );
// //   const [searchTerm, setSearchTerm] = useState("");
// //   const [isSearchOpen, setIsSearchOpen] = useState(false);

// //   const filteredChats =
// //     useQuery(
// //       api.chats.searchChats,
// //       { projectId: selectedProjectId ?? undefined, search: searchTerm },
// //       { keepPreviousData: true }
// //     ) ?? [];

// //   return (
// //     <>
// //       {isMobileNavOpen && (
// //         <div
// //           className="fixed inset-0 bg-black/20 z-40 md:hidden"
// //           onClick={closeMobileNav}
// //         />
// //       )}

// //       <NewProjectModal
// //         isOpen={modalState.newProject.isOpen}
// //         projectName={modalState.newProject.name}
// //         onProjectNameChange={(name) =>
// //           dispatch({ type: "SET_PROJECT_NAME", name })
// //         }
// //         onSubmit={handleCreateProject}
// //         onCancel={handleCancelNewProject}
// //       />
// //       <RenameProjectModal
// //         isOpen={modalState.renameProject.isOpen}
// //         name={modalState.renameProject.name}
// //         onNameChange={(name) =>
// //           dispatch({ type: "SET_RENAME_PROJECT_NAME", name })
// //         }
// //         onSubmit={handleConfirmRenameProject}
// //         onCancel={() => dispatch({ type: "CLOSE_RENAME_PROJECT" })}
// //       />

// //       <DeleteProjectModal
// //         isOpen={modalState.deleteProject.isOpen}
// //         projectName={modalState.deleteProject.project?.name ?? ""}
// //         onConfirm={handleConfirmDeleteProject}
// //         onCancel={handleCancelDeleteProject}
// //       />

// //       <div
// //         className={cn(
// //           "fixed md:inset-y-0 top-14 bottom-0 left-0 z-50 w-72 bg-gray-50/80 backdrop-blur-xl border-r border-gray-200/50 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 md:top-0 flex flex-col",
// //           isMobileNavOpen ? "translate-x-0" : "-translate-x-full"
// //         )}
// //       >
// //         {/* Header */}
// //         <div className="p-4 border-b border-gray-200/50">
// //           <div className="from-gray-50 to-white rounded-xl p-4 inline-flex justify-center items-center">
// //             <Link href="/dashboard" className="flex items-center">
// //               <Logo className="w-40 h-40 text-gray-600 mr-2" />
// //             </Link>
// //           </div>

// //           {error && (
// //             <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-red-600 text-sm">
// //               {error}
// //             </div>
// //           )}

// //           <div className="mt-2 space-y-2"></div>
// //         </div>

// //         {/* Content area */}
// //         <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
// //           <div className="">
// //             <SidebarGpts
// //               basePath={basePath}
// //               gptId={gptId}
// //               selectedGptId={gptId}
// //             />
// //           </div>
// //           {projects.length > 0 && (
// //             <div className="space-y-2">
// //               <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-2">
// //                 Projects
// //               </h4>

// //               <NewProjectItem onCreate={handleNewProject} />

// //               {projects.map((project) => (
// //                 <ProjectItem
// //                   key={project._id}
// //                   basePath={basePath}
// //                   gptId={gptId}
// //                   project={project}
// //                   isSelected={selectedProjectId === project._id}
// //                   projectChats={projectChats}
// //                   onSelect={handleSelectProject}
// //                   onDelete={handleDeleteProject}
// //                   onDeleteChat={handleDeleteChat}
// //                   onRename={handleRenameProject}
// //                 />
// //               ))}
// //             </div>
// //           )}

// //           {globalChats.length > 0 && (
// //             <div className="space-y-2">
// //               <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-2">
// //                 Chats
// //               </h4>

// //               <NewChatItem onCreate={handleNewChat} />
// //               <div className="p-4 space-y-2">
// //                 <div className="flex items-center gap-2">
// //                   <div className="mr-auto">
// //                     <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
// //                       Chats
// //                     </span>
// //                   </div>

// //                   <div className="ml-auto">
// //                     {isSearchOpen ? (
// //                       <input
// //                         autoFocus
// //                         value={searchTerm}
// //                         onChange={(e) => setSearchTerm(e.target.value)}
// //                         onKeyDown={(e) =>
// //                           e.key === "Escape" && setIsSearchOpen(false)
// //                         }
// //                         onBlur={() => setIsSearchOpen(false)}
// //                         placeholder="Search chats..."
// //                         className="px-2 py-1 text-sm border rounded bg-white outline-none"
// //                       />
// //                     ) : (
// //                       <button
// //                         onClick={() => setIsSearchOpen(true)}
// //                         className="p-1 rounded hover:bg-gray-100"
// //                       >
// //                         <Search className="w-4 h-4 text-gray-500" />
// //                       </button>
// //                     )}
// //                   </div>
// //                 </div>

// //                 {isSearchOpen
// //                   ? filteredChats.map((chat) => (
// //                       <ChatRow
// //                         key={chat._id}
// //                         chat={chat}
// //                         onDelete={(id) => handleDeleteChat(id as Id<"chats">)}
// //                         // gptId={gptId}
// //                         // projectId={selectedProjectId ?? undefined}
// //                       />
// //                     ))
// //                   : globalChats.map((chat) => (
// //                       <ChatRow
// //                         key={chat._id}
// //                         chat={chat}
// //                         onDelete={(id) => handleDeleteChat(id as Id<"chats">)}
// //                       />
// //                     ))}
// //               </div>
// //             </div>
// //           )}

// //           {projects.length === 0 && globalChats.length === 0 && (
// //             <div className="text-center text-gray-400 text-sm py-8">
// //               No projects or chats yet. <br />
// //               Create one to get started!
// //             </div>
// //           )}
// //         </div>
// //       </div>
// //     </>
// //   );
// // }

// "use client";

// import React, {
//   useContext,
//   useMemo,
//   useCallback,
//   useState,
//   useTransition
// } from "react";
// import Link from "next/link";
// import { useRouter, usePathname } from "next/navigation";
// import { cn } from "../lib/utils";
// import { useMutation, useQuery } from "convex/react";
// import { api } from "@/convex/_generated/api";
// import { usePathParsing } from "@/lib/hooks/usePathParsing";
// import { useProjectModals } from "@/lib/hooks/useProjectModals";
// import ChatRow from "./ChatRow";
// import ProjectItem from "./ProjectItem";
// import NewProjectModal from "./modals/NewProjectModal";
// import DeleteProjectModal from "./modals/DeleteProjectModal";
// import RenameProjectModal from "./modals/RenameProjectModal";
// import Logo from "./Logo";
// import { NavigationContext } from "../lib/NavigationProvider";
// import { Id } from "@/convex/_generated/dataModel";
// import { Search } from "lucide-react";
// // import { NewProjectItem } from "./NewProjectItem";
// import { NewChatItem } from "./NewChatItem";
// import SidebarGpts from "./SidebarGpts";
// import SidebarChats from "./SidebarChats";
// import SidebarProjects from "./SidebarProjects";
// type ProjectId = Id<"projects">;
// type ChatId = Id<"chats">;

// // Custom hook for path parsing

// // Debounce hook for search
// function useDebounce<T>(value: T, delay: number): T {
//   const [debouncedValue, setDebouncedValue] = useState(value);

//   React.useEffect(() => {
//     const timer = setTimeout(() => setDebouncedValue(value), delay);
//     return () => clearTimeout(timer);
//   }, [value, delay]);

//   return debouncedValue;
// }

// export default function Sidebar() {
//   const router = useRouter();
//   const pathname = usePathname();
//   const { closeMobileNav, isMobileNavOpen } = useContext(NavigationContext);
//   const [isPending, startTransition] = useTransition();

//   const {
//     basePath,
//     gptId,
//     projectId: projectIdFromPath,
//     chatId: chatIdFromPath
//   } = usePathParsing(pathname);

//   const [selectedProjectId, setSelectedProjectId] = useState<ProjectId | null>(
//     (projectIdFromPath as ProjectId) || null
//   );

//   const { state: modalState, actions: modals } = useProjectModals();

//   const [error, setError] = useState<string | null>(null);
//   const [searchTerm, setSearchTerm] = useState("");
//   const [isSearchOpen, setIsSearchOpen] = useState(false);

//   // Debounce search for better performance
//   const debouncedSearch = useDebounce(searchTerm, 300);

//   // Queries
//   const projects = useQuery(api.project.listProjects) ?? [];
//   const projectChats =
//     useQuery(
//       api.chats.listChats,
//       selectedProjectId ? { projectId: selectedProjectId } : "skip"
//     ) ?? [];
//   const globalChats = useQuery(api.chats.listChats, {}) ?? [];

//   const filteredChats =
//     useQuery(
//       api.chats.searchChats,
//       isSearchOpen && debouncedSearch
//         ? { projectId: selectedProjectId ?? undefined, search: debouncedSearch }
//         : "skip"
//     ) ?? [];

//   // Mutations
//   const createProject = useMutation(api.project.createProject);
//   const deleteProject = useMutation(api.project.deleteProject);
//   const deleteChat = useMutation(api.chats.deleteChat);
//   const renameProject = useMutation(api.project.renameProject);

//   // Memoized current chat
//   const allChats = useMemo(
//     () => [...projectChats, ...globalChats],
//     [projectChats, globalChats]
//   );

//   const currentChat = useMemo(
//     () =>
//       chatIdFromPath ? allChats.find((c) => c._id === chatIdFromPath) : null,
//     [chatIdFromPath, allChats]
//   );

//   // Sync selected project from URL
//   React.useEffect(() => {
//     if (projectIdFromPath) {
//       setSelectedProjectId(projectIdFromPath as ProjectId);
//     } else if (currentChat?.projectId) {
//       setSelectedProjectId(currentChat.projectId);
//     } else {
//       setSelectedProjectId(null);
//     }
//   }, [projectIdFromPath, chatIdFromPath, currentChat]);

//   // Clear error after 5 seconds
//   React.useEffect(() => {
//     if (error) {
//       const timer = setTimeout(() => setError(null), 5000);
//       return () => clearTimeout(timer);
//     }
//   }, [error]);

//   const handleSelectProject = useCallback(
//     (id: ProjectId) => {
//       setSelectedProjectId((prev) => (prev === id ? null : id));
//       closeMobileNav();
//     },
//     [closeMobileNav]
//   );

//   const handleNewProject = useCallback(() => {
//     modals.openNewProject();
//   }, [modals]);

//   const handleCreateProject = useCallback(
//     async (e: React.FormEvent) => {
//       e.preventDefault();

//       const trimmedName = modalState.newProject.name.trim();
//       if (!trimmedName) return;

//       try {
//         setError(null);

//         const projectId = await createProject({
//           name: trimmedName,
//           ...(gptId ? { gptId } : {})
//         });

//         if (!projectId) throw new Error("No project ID returned");

//         setSelectedProjectId(projectId as ProjectId);
//         modals.closeNewProject();

//         const url = gptId
//           ? `/gpt5/${gptId}/project/${projectId}`
//           : `/gpt5/project/${projectId}`;

//         startTransition(() => {
//           router.push(url);
//           closeMobileNav();
//         });
//       } catch (err) {
//         setError("Failed to create project. Please try again.");
//         console.error(err);
//       }
//     },
//     [
//       modalState.newProject.name,
//       createProject,
//       gptId,
//       router,
//       closeMobileNav,
//       modals
//     ]
//   );

//   const handleCancelNewProject = useCallback(() => {
//     modals.closeNewProject();
//   }, [modals]);
//   const handleDeleteProject = useCallback(
//     (id: ProjectId) => {
//       const project = projects.find((p) => p._id === id);
//       if (!project) return;

//       modals.openDeleteProject({
//         id,
//         name: project.name
//       });
//     },
//     [projects, modals]
//   );

//   const handleConfirmDeleteProject = useCallback(async () => {
//     const project = modalState.deleteProject.project;
//     if (!project) return;

//     try {
//       setError(null);
//       await deleteProject({ id: project.id });

//       if (selectedProjectId === project.id) {
//         setSelectedProjectId(null);
//       }

//       modals.closeDeleteProject();

//       startTransition(() => {
//         router.push(`${basePath}/${gptId ?? ""}`);
//         closeMobileNav();
//       });
//     } catch (err) {
//       setError("Failed to delete project. Please try again.");
//       console.error(err);
//     }
//   }, [
//     modalState.deleteProject.project,
//     deleteProject,
//     selectedProjectId,
//     router,
//     basePath,
//     gptId,
//     closeMobileNav,
//     modals
//   ]);

//   const handleCancelDeleteProject = useCallback(() => {
//     modals.closeDeleteProject();
//   }, [modals]);
//   const handleRenameProject = useCallback(
//     (project: { id: ProjectId; name: string }) => {
//       modals.openRenameProject(project);
//     },
//     [modals]
//   );

//   const handleConfirmRenameProject = useCallback(async () => {
//     const { project, name } = modalState.renameProject;
//     if (!project || !name.trim()) return;

//     try {
//       setError(null);

//       await renameProject({
//         id: project.id,
//         name: name.trim()
//       });

//       modals.closeRenameProject();
//     } catch (err) {
//       setError("Failed to rename project.");
//       console.error(err);
//     }
//   }, [modalState.renameProject, renameProject, modals]);

//   // ✅ FIX: Don't create chat here - let useAiChat handle it
//   const handleNewChat = useCallback(() => {
//     let chatUrl = "/gpt5";

//     if (gptId) chatUrl += `/${gptId}`;
//     if (selectedProjectId) chatUrl += `/project/${selectedProjectId}`;

//     startTransition(() => {
//       router.push(chatUrl);
//       closeMobileNav();
//     });
//   }, [gptId, selectedProjectId, router, closeMobileNav]);

//   const handleDeleteChat = useCallback(
//     async (id: ChatId) => {
//       try {
//         setError(null);
//         await deleteChat({ id });
//         if (pathname.includes(id)) {
//           startTransition(() => {
//             router.push(`${basePath}/${gptId ?? ""}`);
//           });
//         }
//       } catch (err) {
//         setError("Failed to delete chat. Please try again.");
//         console.error(err);
//       }
//     },
//     [deleteChat, pathname, router, basePath, gptId]
//   );

//   const handleSearchToggle = useCallback(() => {
//     setIsSearchOpen((prev) => !prev);
//     if (!isSearchOpen) {
//       setSearchTerm("");
//     }
//   }, [isSearchOpen]);

//   // Display chats based on search state
//   const displayChats =
//     isSearchOpen && debouncedSearch ? filteredChats : globalChats;

//   return (
//     <>
//       {isMobileNavOpen && (
//         <div
//           className="fixed inset-0 bg-black/20 z-40 md:hidden"
//           onClick={closeMobileNav}
//         />
//       )}

//       {/* Modals */}
//       <NewProjectModal
//         isOpen={modalState.newProject.isOpen}
//         projectName={modalState.newProject.name}
//         onProjectNameChange={modals.setNewProjectName}
//         onSubmit={handleCreateProject}
//         onCancel={modals.closeNewProject}
//       />

//       <RenameProjectModal
//         isOpen={modalState.renameProject.isOpen}
//         name={modalState.renameProject.name}
//         onNameChange={modals.setRenameProjectName}
//         onSubmit={handleConfirmRenameProject}
//         onCancel={modals.closeRenameProject}
//       />
//       <DeleteProjectModal
//         isOpen={modalState.deleteProject.isOpen}
//         projectName={modalState.deleteProject.project?.name ?? ""}
//         onConfirm={handleConfirmDeleteProject}
//         onCancel={modals.closeDeleteProject}
//       />

//       {/* Main Sidebar */}
//       <div
//         className={cn(
//           "fixed md:inset-y-0 top-14 bottom-0 left-0 z-50 w-72 bg-gray-50/80 backdrop-blur-xl border-r border-gray-200/50 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 md:top-0 flex flex-col",
//           isMobileNavOpen ? "translate-x-0" : "-translate-x-full"
//         )}
//       >
//         {/* Header */}
//         <div className="p-4 border-b border-gray-200/50">
//           <div className="from-gray-50 to-white rounded-xl p-4 inline-flex justify-center items-center">
//             <Link href="/dashboard" className="flex items-center">
//               <Logo className="w-40 h-40 text-gray-600 mr-2" />
//             </Link>
//           </div>

//           {error && (
//             <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-red-600 text-sm">
//               {error}
//             </div>
//           )}
//         </div>

//         {/* Content area */}
//         <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
//           <NewChatItem onCreate={onNewChat} />

//           <SidebarGpts
//             basePath={basePath}
//             gptId={gptId}
//             selectedGptId={gptId}
//           />

//           <SidebarProjects
//             projects={projects}
//             projectChats={projectChats}
//             basePath={basePath}
//             gptId={gptId}
//             selectedProjectId={selectedProjectId}
//             onSelectProject={handleSelectProject}
//             onNewProject={handleNewProject}
//             onDeleteProject={handleDeleteProject}
//             onRenameProject={handleRenameProject}
//             onDeleteChat={handleDeleteChat}
//           />

//           <SidebarChats
//             chats={globalChats}
//             displayChats={displayChats}
//             isSearchOpen={isSearchOpen}
//             searchTerm={searchTerm}
//             debouncedSearch={debouncedSearch}
//             onSearchToggle={handleSearchToggle}
//             onSearchChange={setSearchTerm}
//             onCloseSearch={() => {
//               setIsSearchOpen(false);
//               setSearchTerm("");
//             }}
//             onNewChat={handleNewChat}
//             onDeleteChat={handleDeleteChat}
//           />

//           {/* Empty State */}
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

import React, {
  useContext,
  useMemo,
  useCallback,
  useState,
  useTransition
} from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { cn } from "../lib/utils";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { usePathParsing } from "@/lib/hooks/usePathParsing";
import { useProjectModals } from "@/lib/hooks/useProjectModals";
import { useUser } from "@clerk/nextjs";

import NewProjectModal from "./modals/NewProjectModal";
import DeleteProjectModal from "./modals/DeleteProjectModal";
import RenameProjectModal from "./modals/RenameProjectModal";
import Logo from "./Logo";
import { NavigationContext } from "../lib/NavigationProvider";
import { Id } from "@/convex/_generated/dataModel";
import { Search } from "lucide-react";
import { NewChatItem } from "./NewChatItem";
import SidebarGpts from "./SidebarGpts";
import SidebarChats from "./SidebarChats";
import SidebarProjects from "./SidebarProjects";

type ProjectId = Id<"projects">;
type ChatId = Id<"chats">;

// Debounce hook for search
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useUser();
  const { closeMobileNav, isMobileNavOpen } = useContext(NavigationContext);
  const [isPending, startTransition] = useTransition();

  const {
    basePath,
    gptId,
    projectId: projectIdFromPath,
    chatId: chatIdFromPath
  } = usePathParsing(pathname);

  const [selectedProjectId, setSelectedProjectId] = useState<ProjectId | null>(
    (projectIdFromPath as ProjectId) || null
  );

  const { state: modalState, actions: modals } = useProjectModals();

  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Debounce search for better performance
  const debouncedSearch = useDebounce(searchTerm, 300);

  // Queries
  const projects = useQuery(api.project.listProjects) ?? [];
  const projectChats =
    useQuery(
      api.chats.listChats,
      selectedProjectId ? { projectId: selectedProjectId } : "skip"
    ) ?? [];
  const globalChats = useQuery(api.chats.listChats, {}) ?? [];

  const filteredChats =
    useQuery(
      api.chats.searchChats,
      isSearchOpen && debouncedSearch
        ? { projectId: selectedProjectId ?? undefined, search: debouncedSearch }
        : "skip"
    ) ?? [];

  // Mutations
  const createProject = useMutation(api.project.createProject);
  const deleteProject = useMutation(api.project.deleteProject);
  const deleteChat = useMutation(api.chats.deleteChat);
  const renameProject = useMutation(api.project.renameProject);

  // Memoized current chat
  const allChats = useMemo(
    () => [...projectChats, ...globalChats],
    [projectChats, globalChats]
  );

  const currentChat = useMemo(
    () =>
      chatIdFromPath ? allChats.find((c) => c._id === chatIdFromPath) : null,
    [chatIdFromPath, allChats]
  );

  // Sync selected project from URL
  React.useEffect(() => {
    if (projectIdFromPath) {
      setSelectedProjectId(projectIdFromPath as ProjectId);
    } else if (currentChat?.projectId) {
      setSelectedProjectId(currentChat.projectId);
    } else {
      setSelectedProjectId(null);
    }
  }, [projectIdFromPath, chatIdFromPath, currentChat]);

  // Clear error after 5 seconds
  React.useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const handleSelectProject = useCallback(
    (id: ProjectId) => {
      setSelectedProjectId((prev) => (prev === id ? null : id));
      closeMobileNav();
    },
    [closeMobileNav]
  );

  const handleNewProject = useCallback(() => {
    modals.openNewProject();
  }, [modals]);

  const handleCreateProject = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      const trimmedName = modalState.newProject.name.trim();
      if (!trimmedName) return;

      try {
        setError(null);

        const projectId = await createProject({
          name: trimmedName,
          ...(gptId ? { gptId } : {})
        });

        if (!projectId) throw new Error("No project ID returned");

        setSelectedProjectId(projectId as ProjectId);
        modals.closeNewProject();

        const url = gptId
          ? `/gpt5/${gptId}/project/${projectId}`
          : `/gpt5/project/${projectId}`;

        startTransition(() => {
          router.push(url);
          closeMobileNav();
        });
      } catch (err) {
        setError("Failed to create project. Please try again.");
        console.error(err);
      }
    },
    [
      modalState.newProject.name,
      createProject,
      gptId,
      router,
      closeMobileNav,
      modals
    ]
  );

  const handleCancelNewProject = useCallback(() => {
    modals.closeNewProject();
  }, [modals]);

  const handleDeleteProject = useCallback(
    (id: ProjectId) => {
      const project = projects.find((p) => p._id === id);
      if (!project) return;

      modals.openDeleteProject({
        id,
        name: project.name
      });
    },
    [projects, modals]
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

      modals.closeDeleteProject();

      startTransition(() => {
        router.push(`${basePath}/${gptId ?? ""}`);
        closeMobileNav();
      });
    } catch (err) {
      setError("Failed to delete project. Please try again.");
      console.error(err);
    }
  }, [
    modalState.deleteProject.project,
    deleteProject,
    selectedProjectId,
    router,
    basePath,
    gptId,
    closeMobileNav,
    modals
  ]);

  const handleCancelDeleteProject = useCallback(() => {
    modals.closeDeleteProject();
  }, [modals]);

  const handleRenameProject = useCallback(
    (project: { id: ProjectId; name: string }) => {
      modals.openRenameProject(project);
    },
    [modals]
  );

  const handleConfirmRenameProject = useCallback(async () => {
    const { project, name } = modalState.renameProject;
    if (!project || !name.trim()) return;

    try {
      setError(null);

      await renameProject({
        id: project.id,
        name: name.trim()
      });

      modals.closeRenameProject();
    } catch (err) {
      setError("Failed to rename project.");
      console.error(err);
    }
  }, [modalState.renameProject, renameProject, modals]);

  const handleNewChat = useCallback(() => {
    let chatUrl = "/gpt5";

    if (gptId) chatUrl += `/${gptId}`;
    if (selectedProjectId) chatUrl += `/project/${selectedProjectId}`;

    startTransition(() => {
      router.push(chatUrl);
      closeMobileNav();
    });
  }, [gptId, selectedProjectId, router, closeMobileNav]);

  const handleDeleteChat = useCallback(
    async (id: ChatId) => {
      try {
        setError(null);
        await deleteChat({ id });
        if (pathname.includes(id)) {
          startTransition(() => {
            router.push(`${basePath}/${gptId ?? ""}`);
          });
        }
      } catch (err) {
        setError("Failed to delete chat. Please try again.");
        console.error(err);
      }
    },
    [deleteChat, pathname, router, basePath, gptId]
  );

  const handleSearchToggle = useCallback(() => {
    setIsSearchOpen((prev) => !prev);
    if (!isSearchOpen) {
      setSearchTerm("");
    }
  }, [isSearchOpen]);

  // Display chats based on search state
  const displayChats =
    isSearchOpen && debouncedSearch ? filteredChats : globalChats;

  return (
    <>
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
        onProjectNameChange={modals.setNewProjectName}
        onSubmit={handleCreateProject}
        onCancel={modals.closeNewProject}
      />

      <RenameProjectModal
        isOpen={modalState.renameProject.isOpen}
        name={modalState.renameProject.name}
        onNameChange={modals.setRenameProjectName}
        onSubmit={handleConfirmRenameProject}
        onCancel={modals.closeRenameProject}
      />

      <DeleteProjectModal
        isOpen={modalState.deleteProject.isOpen}
        projectName={modalState.deleteProject.project?.name ?? ""}
        onConfirm={handleConfirmDeleteProject}
        onCancel={modals.closeDeleteProject}
      />

      {/* Main Sidebar */}
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

          {error && (
            <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-red-600 text-sm">
              {error}
            </div>
          )}
        </div>

        {/* Content area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
          {/* New Chat Button - At the top */}
          <NewChatItem onCreate={handleNewChat} />

          {/* Search Input - At the top */}

          {/* GPTs Section */}
          <SidebarGpts
            basePath={basePath}
            gptId={gptId}
            selectedGptId={gptId}
          />

          {/* Projects Section */}
          <SidebarProjects
            projects={projects}
            projectChats={projectChats}
            basePath={basePath}
            gptId={gptId}
            selectedProjectId={selectedProjectId}
            onSelectProject={handleSelectProject}
            onNewProject={handleNewProject}
            onDeleteProject={handleDeleteProject}
            onRenameProject={handleRenameProject}
            onDeleteChat={handleDeleteChat}
          />

          {/* Chats Section - Remove search from here since it's at the top */}
          <SidebarChats
            chats={globalChats}
            displayChats={displayChats}
            isSearchOpen={isSearchOpen}
            searchTerm={searchTerm}
            debouncedSearch={debouncedSearch}
            onSearchToggle={handleSearchToggle}
            onSearchChange={setSearchTerm}
            onCloseSearch={() => {
              setIsSearchOpen(false);
              setSearchTerm("");
            }}
            onNewChat={handleNewChat}
            onDeleteChat={handleDeleteChat}
          />

          {/* Empty State */}
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
