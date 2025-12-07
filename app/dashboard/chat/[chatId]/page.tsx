import { Id } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";
import { getConvexClient } from "@/lib/convex";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import AiChat from "@/components/AiChat";
import { allModels } from "@/lib/ai-models";

import AiChatWrapper from "@/components/AiChatWrapper"; // <-
interface ChatPageProps {
  params: { chatId: Id<"chats"> };
}

export default async function ChatPage({ params }: ChatPageProps) {
  const { chatId } = await params;

  // Get user authentication
  const { userId } = await auth();
  if (!userId) {
    redirect("/");
  }

  try {
    // Get Convex client and fetch chat and messages
    const convex = getConvexClient();

    // Check if chat exists & user is authorized
    const chat = await convex.query(api.chats.getChat, { id: chatId, userId });
    if (!chat) {
      console.log(
        "⚠️ Chat not found or unauthorized, redirecting to dashboard"
      );
      redirect("/dashboard");
    }

    // Get initial messages
    const messages = await convex.query(api.messages.list, { chatId });

    return (
      <AiChatWrapper
        chatId={chatId}
        initialMessages={messages || []}
        models={allModels}
        showWebSearch={true}
        chatApiNamespace="chats"
        messageApiNamespace="messages"
      />
    );
  } catch (error) {
    console.error("🔥 Error loading chat:", error);
    redirect("/dashboard");
  }
}
