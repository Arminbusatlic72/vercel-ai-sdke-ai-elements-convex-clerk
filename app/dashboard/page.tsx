"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useUser } from "@clerk/nextjs";
import AiChat from "@/components/AiChat";
import { googleModels } from "@/lib/ai-models";

export default function ChatPage({ params }: { params: { chatId: string } }) {
  const { user } = useUser();

  const chatId = params.chatId as Id<"chats">;

  // 🔥 Only run if chatId exists
  const messages = useQuery(api.messages.list, chatId ? { chatId } : "skip");

  // 🔥 Only run if BOTH exist
  const chat = useQuery(
    api.chats.getChat,
    user?.id && chatId ? { id: chatId, userId: user.id } : "skip"
  );

  //

  return (
    <AiChat
      chatId={chatId}
      initialMessages={messages}
      models={googleModels}
      createChatApi={api.chats.createChat}
      storeMessageApi={api.messages.storeMessage}
      updateChatTitleApi={api.chats.updateChatTitle}
      showWebSearch={true}
      defaultModel="gemini-2.0-flash-exp"
      apiEndpoint="/api/chat"
    />
  );
}
