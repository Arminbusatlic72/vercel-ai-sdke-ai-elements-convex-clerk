"use client";

import AiChat from "./AiChat";
import { allModels } from "@/lib/ai-models";
import { api } from "@/convex/_generated/api";
import type { Id, TableNames } from "@/convex/_generated/dataModel";

type ChatNamespaces = "chats" | "agent2Chats";
type MessageNamespaces = "messages" | "agent2Messages";

interface AiChatWrapperProps<ChatTableName extends TableNames> {
  chatId: Id<ChatTableName>;
  initialMessages: any[];

  // Namespaces instead of direct function refs
  chatApiNamespace: ChatNamespaces;
  messageApiNamespace: MessageNamespaces;

  models?: typeof allModels;
  showWebSearch?: boolean;
}

export default function AiChatWrapper<ChatTableName extends TableNames>({
  chatId,
  initialMessages,
  chatApiNamespace,
  messageApiNamespace,
  models = allModels,
  showWebSearch = true
}: AiChatWrapperProps<ChatTableName>) {
  return (
    <AiChat
      chatId={chatId}
      initialMessages={initialMessages}
      models={models}
      apiEndpoint="/api/chat"
      showWebSearch={showWebSearch}
      createChatApi={api[chatApiNamespace].createChat}
      storeMessageApi={api[messageApiNamespace].storeMessage}
      updateChatTitleApi={api[chatApiNamespace].updateChatTitle}
    />
  );
}
