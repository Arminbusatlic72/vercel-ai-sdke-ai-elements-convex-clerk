"use client";

import { memo, useMemo } from "react";
import { CopyIcon, RefreshCcwIcon } from "lucide-react";
import {
  ConversationContent,
  ConversationScrollButton
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageContent,
  MessageResponse,
  MessageActions,
  MessageAction
} from "@/components/ai-elements/message";
import { Loader } from "@/components/ai-elements/loader";
import { processMessageContent, extractMessageText } from "@/lib/message";

interface AiMessageListProps {
  initialMessages?: Array<{
    _id: string | number;
    role: "user" | "assistant";
    content: string;
  }>;
  displayMessages: Array<any>;
  handleCopy: (text: string) => void;
  handleRetry: () => void;
  status: "idle" | "submitting" | "submitted" | "streaming" | "ready" | "error";
}

// Memoized individual message component
const MessageItem = memo(
  ({
    message,
    handleCopy,
    handleRetry
  }: {
    message: any;
    handleCopy: (text: string) => void;
    handleRetry: () => void;
  }) => {
    const fullText = useMemo(
      () => extractMessageText(message.parts),
      [message.parts]
    );
    const processedText = useMemo(
      () =>
        message.role === "user" ? processMessageContent(fullText) : fullText,
      [fullText, message.role]
    );

    if (!fullText) return null;

    return (
      <Message from={message.role}>
        <MessageContent className="py-6">
          <MessageResponse className="prose prose-sm max-w-none [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-gray-900 [&_pre]:p-4 [&_code]:text-sm [&_code]:font-mono [&_p]:leading-7 [&_p]:mb-4 overflow-x-auto whitespace-pre-wrap">
            {processedText}
          </MessageResponse>
        </MessageContent>

        {message.role === "assistant" && (
          <MessageActions className="mt-2">
            <MessageAction onClick={handleRetry} label="Retry">
              <RefreshCcwIcon className="size-4" />
            </MessageAction>
            <MessageAction onClick={() => handleCopy(fullText)} label="Copy">
              <CopyIcon className="size-4" />
            </MessageAction>
          </MessageActions>
        )}
      </Message>
    );
  }
);

MessageItem.displayName = "MessageItem";

// Memoized initial message component
const InitialMessageItem = memo(
  ({
    message
  }: {
    message: {
      _id: string | number;
      role: "user" | "assistant";
      content: string;
    };
  }) => {
    const processedContent = useMemo(
      () =>
        message.role === "user"
          ? processMessageContent(message.content)
          : message.content,
      [message.content, message.role]
    );

    return (
      <Message from={message.role}>
        <MessageContent className="py-6">
          <MessageResponse className="prose prose-sm max-w-none overflow-y-auto [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-gray-900 [&_pre]:p-4 [&_code]:text-sm [&_code]:font-mono [&_p]:leading-7 [&_p]:mb-4 overflow-x-auto">
            {processedContent}
          </MessageResponse>
        </MessageContent>
      </Message>
    );
  }
);

InitialMessageItem.displayName = "InitialMessageItem";

export const AiMessageList = memo(function AiMessageList({
  initialMessages = [],
  displayMessages,
  handleCopy,
  handleRetry,
  status
}: AiMessageListProps) {
  const showLoader = status === "submitted";

  return (
    <>
      <ConversationContent className="max-w-3xl mx-auto w-full px-4 sm:px-6">
        {initialMessages.map((m) => (
          <InitialMessageItem key={m._id} message={m} />
        ))}

        {displayMessages.map((message) => (
          <MessageItem
            key={message.id}
            message={message}
            handleCopy={handleCopy}
            handleRetry={handleRetry}
          />
        ))}

        {showLoader && (
          <div className="flex justify-center py-8 min-h-20">
            <Loader />
          </div>
        )}
      </ConversationContent>
      <ConversationScrollButton />
    </>
  );
});
