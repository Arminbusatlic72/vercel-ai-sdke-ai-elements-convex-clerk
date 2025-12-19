"use client";
import AiChat from "@/components/AiChat";
import { api } from "@/convex/_generated/api";
import { useMutation } from "convex/react";
interface AiChatWrapperProps {
  chatId: string;
  projectId: string;
  initialMessages: any[]; // or your Message type
  models: any;
  showWebSearch?: boolean;
  defaultModel?: string;
  apiEndpoint?: string;
}
export default function AiChatWrapper(props: AiChatWrapperProps) {
  // Convex mutations can be used here
  const createChat = useMutation(api.chats.createChat);
  const storeMessage = useMutation(api.messages.storeMessage);
  const updateChatTitle = useMutation(api.chats.updateChatTitle);

  return (
    <AiChat
      {...props}
      createChatMutation={createChat}
      storeMessageMutation={storeMessage}
      updateChatTitleMutation={updateChatTitle}
    />
  );
}
