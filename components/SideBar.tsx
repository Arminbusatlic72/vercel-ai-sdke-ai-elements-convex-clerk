"use client";

import * as React from "react";
import { useContext, useMemo, useCallback, useReducer } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { cn } from "../lib/utils";
import { Button } from "../components/ui/button";
import { PlusIcon } from "@radix-ui/react-icons";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import ChatRow from "./ChatRow";
import ProjectItem from "./ProjectItem";
import NewProjectModal from "./modals/NewProjectModal";
import DeleteProjectModal from "./modals/DeleteProjectModal";
import Logo from "./Logo";
import { NavigationContext } from "../lib/NavigationProvider";
import { Id } from "@/convex/_generated/dataModel";

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

// Hook to parse dynamic pathname
function usePathParsing(pathname: string) {
  return useMemo(() => {
    const segments = pathname.split("/").filter(Boolean);

    // const basePath = `/${segments[0]}`; // /gpt5
    const basePath = `/${segments[0]}`; // /gpt5

    let gptId: string | undefined;
    let projectId: string | undefined;
    let chatId: string | undefined;

    if (segments[1] && segments[1] !== "chat" && segments[1] !== "project") {
      gptId = segments[1];
    }

    if (segments.includes("project")) {
      const projectIndex = segments.indexOf("project");
      projectId = segments[projectIndex + 1];
    }

    if (segments.includes("chat")) {
      const chatIndex = segments.indexOf("chat");
      chatId = segments[chatIndex + 1];
    }

    return { basePath, gptId, projectId, chatId };
  }, [pathname]);
}

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { closeMobileNav, isMobileNavOpen } = useContext(NavigationContext);

  const {
    basePath,
    gptId,
    projectId: projectIdFromPath,
    chatId: chatIdFromPath
  } = usePathParsing(pathname);

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

  const allChats = useMemo(
    () => [...projectChats, ...globalChats],
    [projectChats, globalChats]
  );

  const currentChat = useMemo(
    () =>
      chatIdFromPath ? allChats.find((c) => c._id === chatIdFromPath) : null,
    [chatIdFromPath, allChats]
  );

  // Mutations
  const createProject = useMutation(api.project.createProject);
  const deleteProject = useMutation(api.project.deleteProject);
  const createChat = useMutation(api.chats.createChat);
  const deleteChat = useMutation(api.chats.deleteChat);

  // Sync selected project
  // React.useEffect(() => {
  //   if (projectIdFromPath) setSelectedProjectId(projectIdFromPath);
  //   else if (currentChat?.projectId)
  //     setSelectedProjectId(currentChat.projectId);
  //   else setSelectedProjectId(null);
  // }, [projectIdFromPath, chatIdFromPath, currentChat]);
  React.useEffect(() => {
    if (projectIdFromPath) {
      setSelectedProjectId(projectIdFromPath as ProjectId); // cast string → ProjectId
    } else if (currentChat?.projectId) {
      setSelectedProjectId(currentChat.projectId);
    } else {
      setSelectedProjectId(null); // ensure it’s null, not undefined
    }
  }, [projectIdFromPath, chatIdFromPath, currentChat]);

  // Handlers
  const handleNewProject = useCallback(
    () => dispatch({ type: "OPEN_NEW_PROJECT" }),
    []
  );

  // const handleCreateProject = useCallback(
  //   async (e: React.FormEvent) => {
  //     e.preventDefault();
  //     const trimmedName = modalState.newProject.name.trim();
  //     if (!trimmedName) return;

  //     try {
  //       setError(null);
  //       const projectId = await createProject({
  //         name: trimmedName,
  //         gptId: gptId ?? ""
  //       });
  //       if (!projectId) throw new Error("No project ID returned");

  //       setSelectedProjectId(projectId as ProjectId);
  //       dispatch({ type: "CLOSE_NEW_PROJECT" });

  //       router.push(
  //         `${basePath}/${gptId ? gptId + "/" : ""}project/${projectId}`
  //       );
  //       closeMobileNav();
  //     } catch (err) {
  //       setError("Failed to create project. Please try again.");
  //       console.error(err);
  //     }
  //   },
  //   [
  //     modalState.newProject.name,
  //     createProject,
  //     router,
  //     basePath,
  //     gptId,
  //     closeMobileNav
  //   ]
  // );

  const handleCreateProject = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      const trimmedName = modalState.newProject.name.trim();
      if (!trimmedName) return;

      try {
        setError(null);

        const projectId = await createProject({
          name: trimmedName,
          ...(gptId ? { gptId } : {}) // ✅ optional
        });

        if (!projectId) throw new Error("No project ID returned");

        setSelectedProjectId(projectId as ProjectId);
        dispatch({ type: "CLOSE_NEW_PROJECT" });

        // ✅ route depends on gptId presence
        const url = gptId
          ? `/gpt5/${gptId}/project/${projectId}`
          : `/gpt5/project/${projectId}`;

        router.push(url);
        closeMobileNav();
      } catch (err) {
        setError("Failed to create project. Please try again.");
        console.error(err);
      }
    },
    [modalState.newProject.name, createProject, router, gptId, closeMobileNav]
  );

  const handleCancelNewProject = useCallback(
    () => dispatch({ type: "CLOSE_NEW_PROJECT" }),
    []
  );

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
      if (selectedProjectId === project.id) setSelectedProjectId(null);
      dispatch({ type: "CLOSE_DELETE_PROJECT" });
      router.push(`${basePath}/${gptId ?? ""}`);
      closeMobileNav();
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
    closeMobileNav
  ]);

  const handleCancelDeleteProject = useCallback(
    () => dispatch({ type: "CLOSE_DELETE_PROJECT" }),
    []
  );

  const handleSelectProject = useCallback(
    (id: ProjectId) => {
      setSelectedProjectId(id);
      closeMobileNav();
    },
    [closeMobileNav]
  );

  // const handleNewChat = useCallback(async () => {
  //   try {
  //     setError(null);

  //     // Create new chat under current gptId & projectId
  //     const newChatId = await createChat({
  //       title: "", // can update later
  //       projectId: selectedProjectId ?? undefined,
  //       gptId: gptId ?? undefined,
  //       createdAt: Date.now()
  //     });

  //     let chatUrl = "/gpt5";

  //     // Add gptId if it exists
  //     if (gptId) chatUrl += `/${gptId}`;

  //     // Add chatId
  //     chatUrl += `/chat/${newChatId}`;

  //     router.push(chatUrl);
  //     closeMobileNav();
  //   } catch (err) {
  //     setError("Failed to create chat. Please try again.");
  //     console.error(err);
  //   }
  // }, [createChat, gptId, selectedProjectId, router, closeMobileNav]);

  const handleNewChat = useCallback(
    async (msg?: { text?: string }) => {
      try {
        setError(null);

        // Generate title from msg text if provided, else fallback
        const title = msg?.text
          ? msg.text.slice(0, 50) + (msg.text.length > 50 ? "..." : "")
          : "New chat";

        // Create new chat under current gptId & projectId
        const newChatId = await createChat({
          title, // ✅ title from message or placeholder
          projectId: selectedProjectId ?? undefined,
          gptId: gptId ?? undefined,
          createdAt: Date.now()
        });

        let chatUrl = "/gpt5";

        // Add gptId if it exists
        if (gptId) chatUrl += `/${gptId}`;

        // Add chatId
        chatUrl += `/chat/${newChatId}`;

        router.push(chatUrl);
        closeMobileNav();
      } catch (err) {
        setError("Failed to create chat. Please try again.");
        console.error(err);
      }
    },
    [createChat, gptId, selectedProjectId, router, closeMobileNav]
  );

  const handleDeleteChat = useCallback(
    async (id: ChatId) => {
      try {
        setError(null);
        await deleteChat({ id });
        if (pathname.includes(id)) router.push(`${basePath}/${gptId ?? ""}`);
      } catch (err) {
        setError("Failed to delete chat. Please try again.");
        console.error(err);
      }
    },
    [deleteChat, pathname, router, basePath, gptId]
  );

  return (
    <>
      {isMobileNavOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-40 md:hidden"
          onClick={closeMobileNav}
        />
      )}

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
          {projects.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-2">
                Projects
              </h4>
              {projects.map((project) => (
                <ProjectItem
                  basePath={basePath}
                  gptId={gptId}
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

          {globalChats.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-2">
                Chats
              </h4>
              {globalChats.map((chat) => (
                <ChatRow
                  key={chat._id}
                  chat={chat}
                  onDelete={(id) => handleDeleteChat(id as ChatId)}
                />
              ))}
            </div>
          )}

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
