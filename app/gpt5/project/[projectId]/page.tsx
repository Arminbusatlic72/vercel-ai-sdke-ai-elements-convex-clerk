import { Id } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";
import { getConvexClient } from "@/lib/convex";

import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import AiChat from "@/components/AiChat";
import { googleModels } from "@/lib/ai-models";
import { Folder, MessageSquare, Plus } from "lucide-react";
import Link from "next/link";
import ProjectChatCard from "@/components/ProjectChatCard";
import ProjectHeader from "@/components/ProjectPageHeader";
interface ProjectPageProps {
  params: {
    projectId: Id<"projects">;
  };
  searchParams?: {
    chatId?: string;
    new?: string;
  };
}

export default async function ProjectPage({
  params,
  searchParams
}: ProjectPageProps) {
  const { projectId } = await params;
  const resolvedSearchParams = await searchParams;
  const chatId = resolvedSearchParams?.chatId;
  const isNewChat = resolvedSearchParams?.new === "true";

  const { userId } = await auth();
  if (!userId) redirect("/");

  const convex = getConvexClient();

  // Fetch project
  const project = await convex.query(api.project.getProject, {
    id: projectId
  });
  if (!project) redirect("/dashboard");

  // Fetch GPT configuration for this project
  let gptConfig = null;
  if (project.gptId) {
    try {
      // The query expects { gptId: string } based on the error
      gptConfig = await convex.query(api.gpts.getGpt, {
        gptId: project.gptId
      });
    } catch (error) {
      console.error("Failed to fetch GPT configuration:", error);
    }
  }

  // Fetch project chats
  const projectChats =
    (await convex.query(api.chats.listChats, { projectId })) ?? [];

  // Determine if we should show chat interface or chat list
  const showChatInterface = chatId || isNewChat;

  // If a chat is selected, fetch its messages
  const selectedChat = chatId
    ? await convex.query(api.chats.getChat, {
        id: chatId as Id<"chats">,
        userId
      })
    : null;

  // Also fetch messages separately if needed
  const messagesForSelectedChat = selectedChat
    ? await convex.query(api.messages.list, {
        chatId: chatId as Id<"chats">
      })
    : [];

  // Determine default model - using Google models
  const resolvedDefaultModel =
    selectedChat?.model ?? gptConfig?.model ?? "gpt-4-mini";

  return (
    <div className="flex flex-col h-full">
      {/* Project Header */}
      <div className="p-6 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ProjectHeader projectId={projectId} />

            <p className="text-sm text-gray-500 mt-1">
              {projectChats.length} chat
              {projectChats.length !== 1 ? "s" : ""} in this project
            </p>
          </div>

          {/* New Chat Button */}
          <Link
            href={`/gpt5/project/${projectId}?new=true`}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span className="font-medium">New Chat</span>
          </Link>
        </div>
      </div>

      <div className="flex-1 flex">
        {/* Show chat list OR chat interface */}
        {!showChatInterface ? (
          /* Chat List - Full width when no chat selected */
          <div className="flex-1 p-6">
            {projectChats.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <MessageSquare className="w-16 h-16 text-gray-300 mb-4" />
                <h2 className="text-xl font-semibold text-gray-700 mb-2">
                  No chats yet in this project
                </h2>
                <p className="text-gray-500 mb-6">
                  Start a new conversation to organize it under "{project.name}"
                </p>
                <Link
                  href={`/gpt5/project/${projectId}?new=true`}
                  className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-5 h-5" />
                  <span className="font-medium">Create First Chat</span>
                </Link>
              </div>
            ) : (
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
                      // Pass either chat.gptId or project.gptId
                      gptId={chat.gptId || project.gptId || ""}
                      projectId={projectId}
                      userId={userId}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Chat Interface - when a chat is selected OR new chat */
          <div className="flex-1 flex flex-col">
            <div className="border-b border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <Link
                  href={`/gpt5/project/${projectId}`}
                  className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
                >
                  ← Back to all chats
                </Link>

                {isNewChat && (
                  <span className="text-sm text-blue-600 font-medium bg-blue-50 px-3 py-1 rounded-full">
                    New Chat
                  </span>
                )}
              </div>
            </div>

            <div className="flex-1">
              <AiChat
                // Pass project.gptId or empty string if not available
                gptId={project.gptId || ""}
                projectId={projectId}
                chatId={isNewChat ? undefined : (chatId as Id<"chats">)}
                initialMessages={isNewChat ? [] : messagesForSelectedChat}
                models={googleModels}
                showWebSearch={true}
                defaultModel={resolvedDefaultModel}
                key={chatId || "new-chat"}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
