// import { Id } from "@/convex/_generated/dataModel";
// import { api } from "@/convex/_generated/api";
// import { getConvexClient } from "@/lib/convex";
// import { redirect } from "next/navigation";
// import { auth } from "@clerk/nextjs/server";
// import AiChat from "@/components/AiChat";
// import { googleModels } from "@/lib/ai-models";
// import {
//   Folder,
//   MessageSquare,
//   Plus,
//   Search,
//   ChevronRight
// } from "lucide-react";
// import Link from "next/link";
// import ProjectChatCard from "@/components/ProjectChatCard";
// import ConvexClientProvider from "@/components/ConvexClientProvider";

// interface ProjectPageProps {
//   params: { gptId: string; projectId: Id<"projects"> };
//   searchParams?: { chatId?: string; new?: string };
// }

// export default async function ProjectPage({
//   params,
//   searchParams
// }: ProjectPageProps) {
//   const { gptId, projectId } = await params;
//   const resolvedSearchParams = await searchParams;
//   const chatId = resolvedSearchParams?.chatId;
//   const isNewChat = resolvedSearchParams?.new === "true";

//   const { userId } = await auth();
//   if (!userId) redirect("/");

//   const convex = getConvexClient();

//   // Fetch project
//   const project = await convex.query(api.project.getProject, {
//     id: projectId
//   });
//   if (!project) redirect("/dashboard");

//   // Fetch project chats
//   const projectChats =
//     (await convex.query(api.chats.listChats, {
//       projectId
//     })) || [];

//   // If a chat is selected, fetch its messages
//   const selectedChat = chatId
//     ? await convex.query(api.chats.getChat, {
//         id: chatId as Id<"chats">,
//         userId
//       })
//     : null;

//   const messagesForSelectedChat = selectedChat
//     ? await convex.query(api.messages.list, {
//         chatId: chatId as Id<"chats">
//       })
//     : [];

//   return (
//     <ConvexClientProvider>
//       <div className="flex h-screen bg-gray-50">
//         {/* Sidebar - Chat List */}
//         <div className="w-80 border-r border-gray-200 bg-white flex flex-col">
//           {/* Project Header in Sidebar */}
//           <div className="p-6 border-b border-gray-200">
//             <div className="flex items-center gap-3">
//               <div className="p-2 bg-blue-50 rounded-lg">
//                 <Folder className="w-6 h-6 text-blue-600" />
//               </div>
//               <div className="flex-1 min-w-0">
//                 <h1 className="text-lg font-semibold text-gray-900 truncate">
//                   {project.name}
//                 </h1>
//                 <p className="text-sm text-gray-500 mt-1">
//                   {projectChats.length} chat
//                   {projectChats.length !== 1 ? "s" : ""}
//                 </p>
//               </div>
//             </div>

//             {/* New Chat Button */}
//             <Link
//               href={`/gpt5/${gptId}/project/${projectId}?new=true`}
//               className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
//             >
//               <Plus className="w-4 h-4" />
//               New Chat
//             </Link>
//           </div>

//           {/* Search Bar */}
//           <div className="p-4 border-b border-gray-200">
//             <div className="relative">
//               <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
//               <input
//                 type="text"
//                 placeholder="Search chats..."
//                 className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
//               />
//             </div>
//           </div>

//           {/* Chat List */}
//           <div className="flex-1 overflow-y-auto p-4 space-y-2">
//             {projectChats.length === 0 ? (
//               <div className="flex flex-col items-center justify-center h-64 text-center p-4">
//                 <MessageSquare className="w-12 h-12 text-gray-300 mb-3" />
//                 <h3 className="text-sm font-medium text-gray-700 mb-1">
//                   No chats yet
//                 </h3>
//                 <p className="text-xs text-gray-500">
//                   Start your first conversation
//                 </p>
//               </div>
//             ) : (
//               projectChats.map((chat: any) => (
//                 <Link
//                   key={chat._id}
//                   href={`/gpt5/${gptId}/project/${projectId}?chatId=${chat._id}`}
//                   className={`group block p-3 rounded-lg transition-colors ${
//                     chatId === chat._id
//                       ? "bg-blue-50 border border-blue-100"
//                       : "hover:bg-gray-50 border border-transparent"
//                   }`}
//                 >
//                   <div className="flex items-center justify-between">
//                     <div className="flex-1 min-w-0">
//                       <h4 className="text-sm font-medium text-gray-900 truncate">
//                         {chat.title || "Untitled Chat"}
//                       </h4>
//                       <p className="text-xs text-gray-500 mt-1 truncate">
//                         {chat.lastMessage || "No messages yet"}
//                       </p>
//                     </div>
//                     <ChevronRight
//                       className={`w-4 h-4 text-gray-400 ${
//                         chatId === chat._id
//                           ? "text-blue-500"
//                           : "group-hover:text-gray-600"
//                       }`}
//                     />
//                   </div>
//                   <div className="flex items-center justify-between mt-2">
//                     <span className="text-xs text-gray-400">
//                       {new Date(chat._creationTime).toLocaleDateString()}
//                     </span>
//                     {chat.unreadCount > 0 && (
//                       <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
//                         {chat.unreadCount}
//                       </span>
//                     )}
//                   </div>
//                 </Link>
//               ))
//             )}
//           </div>

//           {/* Footer */}
//           <div className="p-4 border-t border-gray-200">
//             <Link
//               href="/dashboard"
//               className="flex items-center justify-center gap-2 px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
//             >
//               ← Back to Dashboard
//             </Link>
//           </div>
//         </div>

//         {/* Main Content - Chat Interface */}
//         <div className="flex-1 flex flex-col">
//           {/* Chat Header */}
//           <div className="bg-white border-b border-gray-200 p-4">
//             <div className="flex items-center justify-between">
//               <div className="flex items-center gap-3">
//                 {selectedChat ? (
//                   <>
//                     <div className="w-2 h-2 rounded-full bg-green-500"></div>
//                     <h2 className="text-lg font-semibold text-gray-900">
//                       {selectedChat.title || "Chat"}
//                     </h2>
//                   </>
//                 ) : isNewChat ? (
//                   <>
//                     <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
//                     <h2 className="text-lg font-semibold text-gray-900">
//                       New Chat
//                     </h2>
//                   </>
//                 ) : (
//                   <div className="flex items-center justify-center w-full h-64">
//                     <div className="text-center">
//                       <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
//                       <h3 className="text-lg font-medium text-gray-700 mb-2">
//                         Select a chat to continue
//                       </h3>
//                       <p className="text-sm text-gray-500 mb-6">
//                         Choose from the sidebar or start a new conversation
//                       </p>
//                       <Link
//                         href={`/gpt5/${gptId}/project/${projectId}?new=true`}
//                         className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
//                       >
//                         <Plus className="w-5 h-5" />
//                         Start New Chat
//                       </Link>
//                     </div>
//                   </div>
//                 )}
//               </div>

//               {selectedChat && (
//                 <Link
//                   href={`/gpt5/${gptId}/project/${projectId}?new=true`}
//                   className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
//                 >
//                   <Plus className="w-4 h-4" />
//                   New Chat
//                 </Link>
//               )}
//             </div>
//           </div>

//           {/* Chat Container */}
//           <div className="flex-1 relative">
//             {chatId || isNewChat ? (
//               <AiChat
//                 gptId={gptId}
//                 projectId={projectId}
//                 chatId={isNewChat ? undefined : (chatId as Id<"chats">)}
//                 initialMessages={isNewChat ? [] : messagesForSelectedChat}
//                 models={googleModels}
//                 showWebSearch={true}
//                 defaultModel="gemini-2.5-flash"
//                 key={chatId || "new-chat"} // Force re-render when chat changes
//               />
//             ) : (
//               <div className="absolute inset-0 flex items-center justify-center">
//                 <div className="text-center max-w-md p-8">
//                   <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center">
//                     <MessageSquare className="w-10 h-10 text-blue-400" />
//                   </div>
//                   <h3 className="text-2xl font-bold text-gray-900 mb-3">
//                     Welcome to {project.name}
//                   </h3>
//                   <p className="text-gray-600 mb-8">
//                     Select a conversation from the sidebar or start a new chat
//                     to begin collaborating with your AI assistant.
//                   </p>
//                   <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
//                     <div className="p-4 bg-white border border-gray-200 rounded-lg">
//                       <div className="font-medium text-gray-900 mb-1">
//                         📁 Organize
//                       </div>
//                       <p className="text-gray-600">
//                         Keep related conversations together
//                       </p>
//                     </div>
//                     <div className="p-4 bg-white border border-gray-200 rounded-lg">
//                       <div className="font-medium text-gray-900 mb-1">
//                         🤖 AI-Powered
//                       </div>
//                       <p className="text-gray-600">
//                         Smart responses with context
//                       </p>
//                     </div>
//                   </div>
//                 </div>
//               </div>
//             )}
//           </div>
//         </div>
//       </div>
//     </ConvexClientProvider>
//   );
// }

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
