"use client";

import AiChat from "./AiChat";
import { api } from "@/convex/_generated/api";
import { useMutation } from "convex/react";

export default function AiChatWrapper(props: any) {
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
