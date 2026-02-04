"use client";

import React, {
  use,
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
import { Home, Plus } from "lucide-react";
import SidebarGpts from "./SidebarGpts";
import SidebarChats from "./SidebarChats";
import SidebarProjects from "./SidebarProjects";

type ProjectId = Id<"projects">;
type ChatId = Id<"chats">;
type Project = {
  _id: ProjectId;
  name: string;
  // add fields you use elsewhere
};
export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useUser();
  const { closeMobileNav, isMobileNavOpen } = use(NavigationContext);
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

  // Queries
  const userData = useQuery(api.users.getCurrentUser);
  const isAdmin = userData?.role === "admin";

  const projects = (useQuery(api.project.listProjects) ?? []) as Project[];
  const projectChats =
    useQuery(
      api.chats.listChats,
      selectedProjectId ? { projectId: selectedProjectId } : "skip"
    ) ?? [];
  const globalChats = useQuery(api.chats.listChats, {}) ?? [];

  // Get all GPTs for admin, otherwise get subscription GPTs
  const subscriptionGpts = useQuery(api.packages.getSubscriptionGpts) ?? [];
  const allGpts = useQuery(api.gpts.listGpts) ?? [];
  const gpts = isAdmin ? allGpts : subscriptionGpts;

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

  // Stats for empty state
  const totalItems = projects.length + globalChats.length;

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
          "fixed md:inset-y-0 top-14 bottom-0 left-0 z-50 w-72 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 md:top-0 flex flex-col shadow-sm",
          isMobileNavOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            >
              <Logo className="w-45 h-25 text-blue-600" />
            </Link>

            {/* Quick Actions */}
            <div className="flex items-center gap-1">
              <Link
                href="/dashboard"
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                title="Dashboard"
              >
                <Home className="w-4 h-4 text-gray-600" />
              </Link>
              <button
                onClick={handleNewChat}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                title="New Chat"
              >
                <Plus className="w-4 h-4 text-gray-600" />
              </button>
            </div>
          </div>

          {error && (
            <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
              {error}
            </div>
          )}
        </div>

        {/* Content area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* New Chat Button */}
          <button
            onClick={handleNewChat}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white text-gray-800 rounded-lg border border-gray-200 hover:bg-gray-50 transition-all shadow-sm hover:shadow-md"
          >
            <Plus className="w-4 h-4" />
            <span className="font-medium">New Chat</span>
          </button>

          {/* GPTs Section */}
          <SidebarGpts
            basePath={basePath}
            gptId={gptId}
            selectedGptId={gptId}
            gpts={gpts}
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
          />

          {/* Chats Section - Now handles search internally */}
          <SidebarChats onDeleteChat={handleDeleteChat} />

          {/* Empty State */}
          {totalItems === 0 && (
            <div className="text-center p-6 border border-gray-200 rounded-lg bg-gray-50">
              <div className="w-12 h-12 mx-auto mb-3 text-gray-300">
                <Plus className="w-full h-full" />
              </div>
              <p className="text-gray-600 font-medium mb-2">Get Started</p>
              <p className="text-sm text-gray-500">
                Create your first project or chat to begin
              </p>
            </div>
          )}

          {/* Stats Footer */}
          <div className="pt-4 border-t border-gray-200">
            <div className="flex justify-between text-xs text-gray-500">
              <span>{projects.length} projects</span>
              <span>{globalChats.length} chats</span>
              <span>{gpts.length} GPTs</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
