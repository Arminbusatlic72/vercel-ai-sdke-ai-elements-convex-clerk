"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { MessageSquare, Plus } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import ProjectChatCard from "@/components/ProjectChatCard";

interface ProjectChatListProps {
  projectId: Id<"projects">;
  userId: string;
  projectName: string;
  newChatHref: string;
  routeGptId?: string;
  projectGptId?: string;
}

export default function ProjectChatList({
  projectId,
  userId,
  projectName,
  newChatHref,
  routeGptId,
  projectGptId
}: ProjectChatListProps) {
  const projectChats = useQuery(api.chats.listChats, { projectId }) ?? [];

  if (projectChats.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <MessageSquare className="w-16 h-16 text-gray-300 mb-4" />
        <h2 className="text-xl font-semibold text-gray-700 mb-2">
          No chats yet in this project
        </h2>
        <p className="text-gray-500 mb-6">
          Start a new conversation to organize it under "{projectName}"
        </p>
        <Link
          href={newChatHref}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span className="font-medium">Create First Chat</span>
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <p className="text-sm text-gray-500 mt-1">
          Click on any chat to continue the conversation
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {projectChats.map((chat: any) => (
          <ProjectChatCard
            key={chat._id}
            chat={chat}
            gptId={routeGptId || chat.gptId || projectGptId || ""}
            projectId={projectId}
            userId={userId}
          />
        ))}
      </div>
    </div>
  );
}
