// import { Id } from "@/convex/_generated/dataModel";
// import { api } from "@/convex/_generated/api";
// import { getConvexClient } from "@/lib/convex";
// import { redirect } from "next/navigation";
// import { auth } from "@clerk/nextjs/server";
// import AiChat from "@/components/AiChat";
// import { googleModels } from "@/lib/ai-models";
// import { Folder } from "lucide-react";
// interface ProjectPageProps {
//   params: { projectId: Id<"projects"> };
// }

// export default async function ProjectPage({ params }: ProjectPageProps) {
//   const { projectId } = await params;

//   const { userId } = await auth();
//   if (!userId) redirect("/");

//   const convex = getConvexClient();

//   // Fetch the project details
//   const project = await convex.query(api.project.getProject, {
//     id: projectId
//   });

//   // If project doesn't exist or user doesn't have access, redirect
//   if (!project) {
//     redirect("/dashboard");
//   }

//   return (
//     <div className="flex flex-col h-full">
//       {/* Project Header */}
//       <div className="flex justify-center items-center bg-white border-b border-gray-200 px-6 py-4">
//         <Folder className="w-8 h-8 mr-2" />
//         <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
//       </div>

//       {/* Chat Interface - Empty by default */}
//       <div className="flex-1">
//         <AiChat
//           projectId={projectId}
//           chatId={undefined} // No chat selected - empty state
//           initialMessages={[]} // Empty messages
//           models={googleModels}
//           showWebSearch={true}
//           defaultModel="gemini-2.5-flash"
//           // apiEndpoint="/api/chat"
//         />
//       </div>
//     </div>
//   );
// }

// import { Id } from "@/convex/_generated/dataModel";
// import { api } from "@/convex/_generated/api";
// import { getConvexClient } from "@/lib/convex";
// import { redirect } from "next/navigation";
// import { auth } from "@clerk/nextjs/server";
// import AiChat from "@/components/AiChat";
// import { googleModels } from "@/lib/ai-models";
// import { Folder } from "lucide-react";

// interface ProjectPageProps {
//   params: {
//     gptId: string; // ✅ NOW EXISTS
//     projectId: Id<"projects">;
//   };
// }

// export default async function ProjectPage({ params }: ProjectPageProps) {
//   const { gptId, projectId } = await params;

//   const { userId } = await auth();
//   if (!userId) redirect("/");

//   const convex = getConvexClient();

//   const project = await convex.query(api.project.getProject, {
//     id: projectId
//   });

//   if (!project) redirect("/dashboard");

//   return (
//     <div className="flex flex-col h-full">
//       {/* Project Header */}
//       <div className="flex items-center gap-2 border-b px-6 py-4">
//         <Folder className="w-7 h-7" />
//         <h1 className="text-2xl font-bold">{project.name}</h1>
//       </div>

//       {/* Chat */}
//       <div className="flex-1">
//         <AiChat
//           gptId={gptId} // ✅ FIXED
//           projectId={projectId} // ✅ FIXED
//           chatId={undefined}
//           initialMessages={[]}
//           models={googleModels}
//           showWebSearch
//           defaultModel="gemini-2.5-flash"
//         />
//       </div>
//     </div>
//   );
// }

// app/gpt5/[gptId]/project/[projectId]/page.tsx (SERVER COMPONENT)
import { Id } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";
import { getConvexClient } from "@/lib/convex";

import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import AiChat from "@/components/AiChat";
import { openaiModels } from "@/lib/ai-models";
import { Folder, MessageSquare, Plus } from "lucide-react";
import Link from "next/link";
import ProjectChatCard from "@/components/ProjectChatCard";

interface ProjectPageProps {
  params: {
    gptId: string;
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
  const { gptId, projectId } = await params;
  const resolvedSearchParams = await searchParams;
  const chatId = resolvedSearchParams?.chatId;
  const isNewChat = resolvedSearchParams?.new === "true";

  const { userId } = await auth();
  if (!userId) redirect("/");

  const convex = getConvexClient();

  // Fetch project
  const project = await convex.query(api.project.getProject, { id: projectId });
  if (!project) redirect("/dashboard");

  // Fetch GPT configuration for this project
  let gptConfig = null;
  try {
    // Try to get GPT config from the gptId in the URL
    gptConfig = await convex.query(api.gpts.getGpt, { gptId });
  } catch (error) {
    console.error("Failed to fetch GPT configuration:", error);
    // If URL gptId doesn't exist, try project.gptId if it exists
    if (project.gptId && project.gptId !== gptId) {
      try {
        gptConfig = await convex.query(api.gpts.getGpt, {
          gptId: project.gptId
        });
      } catch (secondError) {
        console.error("Failed to fetch GPT from project.gptId:", secondError);
      }
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
  const resolvedDefaultModel =
    selectedChat?.model ?? gptConfig?.model ?? "gpt-4o-mini";
  return (
    <div className="flex flex-col h-full">
      {/* Project Header */}
      <div className="p-6 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Folder className="w-8 h-8 text-blue-500" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {project.name}
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                {projectChats.length} chat
                {projectChats.length !== 1 ? "s" : ""} in this project
              </p>
            </div>
          </div>

          {/* New Chat Button */}
          <Link
            href={`/gpt5/${gptId}/project/${projectId}?new=true`}
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
                  href={`/gpt5/${gptId}/project/${projectId}?new=true`}
                  className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-5 h-5" />
                  <span className="font-medium">Create First Chat</span>
                </Link>
              </div>
            ) : (
              <div>
                <div className="mb-6">
                  <h2 className="text-lg font-semibold text-gray-900">
                    All Chats in "{project.name}"
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    Click on any chat to continue the conversation
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {projectChats.map((chat: any) => (
                    <ProjectChatCard
                      key={chat._id}
                      chat={chat}
                      gptId={gptId}
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
                  href={`/gpt5/${gptId}/project/${projectId}`}
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
                gptId={gptId}
                projectId={projectId}
                chatId={isNewChat ? undefined : (chatId as Id<"chats">)}
                initialMessages={isNewChat ? [] : messagesForSelectedChat}
                models={openaiModels}
                showWebSearch={true}
                defaultModel={resolvedDefaultModel}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
