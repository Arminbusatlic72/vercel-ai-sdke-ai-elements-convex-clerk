// import { Id } from "@/convex/_generated/dataModel";
// import { api } from "@/convex/_generated/api";
// import { getConvexClient } from "@/lib/convex";
// import { redirect } from "next/navigation";
// import { auth } from "@clerk/nextjs/server";

// // 1. Change import from 'allModels' to 'openaiModels'
// import { openaiModels } from "@/lib/ai-models";

// import AiChatWrapper from "@/components/AiChatWrapper";
// interface ChatPageProps {
//   params: { chatId: Id<"chats"> };
// }

// export default async function ChatPage({ params }: ChatPageProps) {
//   const { chatId } = await params;

//   // Get user authentication
//   const { userId } = await auth();
//   if (!userId) {
//     redirect("/");
//   }

//   try {
//     // Get Convex client and fetch chat and messages
//     const convex = getConvexClient();

//     // Check if chat exists & user is authorized
//     const chat = await convex.query(api.chats.getChat, { id: chatId, userId });
//     if (!chat) {
//       console.log(
//         "⚠️ Chat not found or unauthorized, redirecting to dashboard"
//       );
//       redirect("/dashboard");
//     }

//     // Get initial messages
//     const messages = await convex.query(api.messages.list, { chatId });

//     return (
//       <AiChatWrapper
//         chatId={chatId}
//         initialMessages={messages || []}
//         models={openaiModels} // 2. Pass 'openaiModels' instead of 'allModels'
//         showWebSearch={true}
//         chatApiNamespace="chats"
//         messageApiNamespace="messages"
//       />
//     );
//   } catch (error) {
//     console.error("🔥 Error loading chat:", error);
//     redirect("/dashboard");
//   }
// }
import { auth } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import { fetchQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import AiChat from "@/components/AiChat";
import { openaiModels } from "@/lib/ai-models";

interface ChatPageProps {
  params: Promise<{ chatId: string }>;
}

export default async function ChatIdPage({ params }: ChatPageProps) {
  const { userId } = await auth();

  // 1. Ensure user is logged in
  if (!userId) {
    redirect("/");
  }

  const { chatId } = await params;

  // 2. Fetch Chat Metadata
  // Note: Your getChat query explicitly requires the userId string
  const chat = await fetchQuery(api.chats.getChat, {
    id: chatId as Id<"chats">,
    userId: userId
  });

  // 3. If chat doesn't exist or unauthorized
  if (!chat) {
    notFound(); // or redirect("/gpt5")
  }

  // 4. Fetch Messages (Using your 'list' query)
  const messages = await fetchQuery(api.messages.list, {
    chatId: chatId as Id<"chats">
  });

  // 5. Format for useAiChat hook
  const initialMessages = messages.map((msg) => ({
    _id: msg._id,
    role: msg.role as "user" | "assistant",
    content: msg.content
  }));

  return (
    <AiChat
      chatId={chatId as Id<"chats">}
      projectId={chat.projectId}
      initialMessages={initialMessages}
      models={openaiModels}
      showWebSearch
      defaultModel="gpt-4o-mini"
    />
  );
}
