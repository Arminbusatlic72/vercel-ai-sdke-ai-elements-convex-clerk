"use client";

import * as React from "react";
import { BotIcon } from "lucide-react";
import Link from "next/link";
import { use } from "react";
import { NavigationContext } from "../lib/NavigationProvider";
import { useRouter, usePathname } from "next/navigation";
import { cn } from "../lib/utils";
import { Button } from "../components/ui/button";
import { PlusIcon } from "@radix-ui/react-icons";
import { Trash2Icon, Folder, FolderOpen } from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import ChatRow from "./ChatRow";
import { Id, Doc } from "@/convex/_generated/dataModel";

import NewProjectModal from "./modals/NewProjectModal";
import DeleteProjectModal from "./modals/DeleteProjectModal";
import Logo from "./Logo";

type ProjectId = Id<"projects">;
type ChatId = Id<"chats">;

interface SidebarProps {
  basePath: string;
}

// Project Item Component
interface ProjectItemProps {
  project: Doc<"projects">;
  isSelected: boolean;
  projectChats: Doc<"chats">[];
  onSelect: (id: ProjectId) => void;
  onDelete: (id: ProjectId) => void;
  onDeleteChat: (id: ChatId) => void;
}

function ProjectItem({
  project,
  isSelected,
  projectChats,
  onSelect,
  onDelete,
  onDeleteChat
}: ProjectItemProps) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <div
          onClick={() => onSelect(project._id)}
          className={cn(
            "p-2 rounded cursor-pointer flex items-center gap-2 flex-1",
            isSelected ? "bg-gray-200" : "hover:bg-gray-100"
          )}
        >
          {isSelected ? (
            <FolderOpen className="w-4 h-4" />
          ) : (
            <Folder className="w-4 h-4" />
          )}
          <span>{project.name}</span>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(project._id);
          }}
          className="ml-2 text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 transition-colors"
          aria-label="Delete project"
        >
          <Trash2Icon className="w-4 h-4" />
        </button>
      </div>

      {/* Project chats */}
      {isSelected && projectChats.length > 0 && (
        <div className="ml-6 mt-1 space-y-1">
          {projectChats.map((chat) => (
            <ChatRow
              key={chat._id}
              chat={chat}
              basePath="/dashboard/chat"
              onDelete={(id) => onDeleteChat(id as ChatId)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Main Sidebar Component
export default function Sidebar({ basePath }: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { closeMobileNav, isMobileNavOpen } = use(NavigationContext);

  // Extract IDs from URL
  const projectIdFromPath = pathname?.match(
    /\/dashboard\/project\/([^\/]+)/
  )?.[1] as ProjectId | undefined;

  const chatIdFromPath = pathname?.match(/\/chat\/([^\/]+)/)?.[1] as
    | ChatId
    | undefined;

  // State
  const [selectedProjectId, setSelectedProjectId] =
    React.useState<ProjectId | null>(projectIdFromPath || null);
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] =
    React.useState(false);
  const [newProjectName, setNewProjectName] = React.useState("");
  const [isDeleteProjectModalOpen, setIsDeleteProjectModalOpen] =
    React.useState(false);
  const [projectToDelete, setProjectToDelete] = React.useState<{
    id: ProjectId;
    name: string;
  } | null>(null);

  // Queries
  const projects =
    (useQuery(api.project.listProjects) as Doc<"projects">[]) ?? [];
  const projectChats =
    (useQuery(
      api.chats.listChats,
      selectedProjectId ? { projectId: selectedProjectId } : "skip"
    ) as Doc<"chats">[]) ?? [];
  const globalChats =
    (useQuery(api.chats.listChats, {}) as Doc<"chats">[]) ?? [];

  // Find current chat to determine which project it belongs to
  const allChats = [...projectChats, ...globalChats];
  const currentChat = chatIdFromPath
    ? allChats.find((chat) => chat._id === chatIdFromPath)
    : null;

  // Mutations
  const createProject = useMutation(api.project.createProject);
  const deleteProject = useMutation(api.project.deleteProject);
  const createChat = useMutation(api.chats.createChat);
  const deleteChat = useMutation(api.chats.deleteChat);

  // Sync selected project with URL and current chat
  React.useEffect(() => {
    if (projectIdFromPath) {
      // On a project page
      setSelectedProjectId(projectIdFromPath);
    } else if (currentChat?.projectId) {
      // On a chat page that belongs to a project
      setSelectedProjectId(currentChat.projectId);
    } else if (chatIdFromPath && currentChat && !currentChat.projectId) {
      // On a global chat page (chat with no project)
      setSelectedProjectId(null);
    } else if (!chatIdFromPath && !projectIdFromPath) {
      // On dashboard or other page
      setSelectedProjectId(null);
    }
  }, [projectIdFromPath, chatIdFromPath, currentChat]);

  // Handlers
  const handleNewProject = () => {
    setIsNewProjectModalOpen(true);
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;

    try {
      const projectId = await createProject({ name: newProjectName.trim() });
      setSelectedProjectId(projectId);
      setIsNewProjectModalOpen(false);
      setNewProjectName("");
      router.push(`/dashboard/project/${projectId}`);
    } catch (err) {
      console.error("Failed to create project:", err);
    }
  };

  const handleCancelNewProject = () => {
    setIsNewProjectModalOpen(false);
    setNewProjectName("");
  };

  const handleDeleteProject = (id: ProjectId) => {
    const project = projects.find((p) => p._id === id);
    if (!project) return;

    setProjectToDelete({ id, name: project.name });
    setIsDeleteProjectModalOpen(true);
  };

  const handleConfirmDeleteProject = async () => {
    if (!projectToDelete) return;

    try {
      await deleteProject({ id: projectToDelete.id });
      if (selectedProjectId === projectToDelete.id) setSelectedProjectId(null);
      setIsDeleteProjectModalOpen(false);
      setProjectToDelete(null);
      router.push("/dashboard");
    } catch (err) {
      console.error("Failed to delete project:", err);
    }
  };

  const handleCancelDeleteProject = () => {
    setIsDeleteProjectModalOpen(false);
    setProjectToDelete(null);
  };

  const handleSelectProject = (id: ProjectId) => {
    if (selectedProjectId === id) {
      setSelectedProjectId(null);
      router.push("/dashboard");
    } else {
      setSelectedProjectId(id);
      router.push(`/dashboard/project/${id}`);
    }
  };

  const handleNewChat = async () => {
    try {
      const chatId = await createChat({
        title: "",
        projectId: undefined,
        createdAt: Date.now()
      });

      setSelectedProjectId(null);
      router.push(`/dashboard/chat/${chatId}`);
      closeMobileNav();
    } catch (err) {
      console.error("Failed to create chat:", err);
    }
  };

  const handleDeleteChat = async (id: ChatId) => {
    try {
      await deleteChat({ id });
      if (window.location.pathname.includes(id)) {
        router.push(basePath);
      }
    } catch (err) {
      console.error("Failed to delete chat:", err);
    }
  };

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
        isOpen={isNewProjectModalOpen}
        projectName={newProjectName}
        onProjectNameChange={setNewProjectName}
        onSubmit={handleCreateProject}
        onCancel={handleCancelNewProject}
      />

      <DeleteProjectModal
        isOpen={isDeleteProjectModalOpen}
        projectName={projectToDelete?.name ?? ""}
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
            <Link
              href="/dashboard"
              // Add flex container styling here if needed to align the logo and text
              className="flex items-center"
            >
              <Logo className="w-40 h-40 text-gray-600 mr-2" />
            </Link>
          </div>
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
