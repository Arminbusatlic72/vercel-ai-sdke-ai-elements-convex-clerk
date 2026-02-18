// "use client";

// import { memo, useMemo } from "react";
// import { CopyIcon, RefreshCcwIcon } from "lucide-react";
// import {
//   ConversationContent,
//   ConversationScrollButton
// } from "@/components/ai-elements/conversation";
// import {
//   Message,
//   MessageContent,
//   MessageResponse,
//   MessageActions,
//   MessageAction
// } from "@/components/ai-elements/message";
// import { Loader } from "@/components/ai-elements/loader";
// import { processMessageContent, extractMessageText } from "@/lib/message";

// interface AiMessageListProps {
//   initialMessages?: Array<{
//     _id: string | number;
//     role: "user" | "assistant";
//     content: string;
//   }>;
//   displayMessages: Array<any>;
//   handleCopy: (text: string) => void;
//   handleRetry: () => void;
//   status: "idle" | "submitting" | "submitted" | "streaming" | "ready" | "error";
// }

// // Memoized individual message component
// const MessageItem = memo(
//   ({
//     message,
//     handleCopy,
//     handleRetry
//   }: {
//     message: any;
//     handleCopy: (text: string) => void;
//     handleRetry: () => void;
//   }) => {
//     const fullText = useMemo(
//       () => extractMessageText(message.parts),
//       [message.parts]
//     );
//     const processedText = useMemo(
//       () =>
//         message.role === "user" ? processMessageContent(fullText) : fullText,
//       [fullText, message.role]
//     );

//     if (!fullText) return null;

//     return (
//       <Message from={message.role}>
//         <MessageContent className="py-6">
//           <MessageResponse className="prose prose-sm max-w-none [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-gray-900 [&_pre]:p-4 [&_code]:text-sm [&_code]:font-mono [&_p]:leading-7 [&_p]:mb-4 overflow-x-auto whitespace-pre-wrap">
//             {processedText}
//           </MessageResponse>
//         </MessageContent>

//         {message.role === "assistant" && (
//           <MessageActions className="mt-2">
//             <MessageAction onClick={handleRetry} label="Retry">
//               <RefreshCcwIcon className="size-4" />
//             </MessageAction>
//             <MessageAction onClick={() => handleCopy(fullText)} label="Copy">
//               <CopyIcon className="size-4" />
//             </MessageAction>
//           </MessageActions>
//         )}
//       </Message>
//     );
//   }
// );

// MessageItem.displayName = "MessageItem";

// // Memoized initial message component
// const InitialMessageItem = memo(
//   ({
//     message
//   }: {
//     message: {
//       _id: string | number;
//       role: "user" | "assistant";
//       content: string;
//     };
//   }) => {
//     const processedContent = useMemo(
//       () =>
//         message.role === "user"
//           ? processMessageContent(message.content)
//           : message.content,
//       [message.content, message.role]
//     );

//     return (
//       <Message from={message.role}>
//         <MessageContent className="py-6">
//           <MessageResponse className="prose prose-sm max-w-none overflow-y-auto [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-gray-900 [&_pre]:p-4 [&_code]:text-sm [&_code]:font-mono [&_p]:leading-7 [&_p]:mb-4 overflow-x-auto">
//             {processedContent}
//           </MessageResponse>
//         </MessageContent>
//       </Message>
//     );
//   }
// );

// InitialMessageItem.displayName = "InitialMessageItem";

// export const AiMessageList = memo(function AiMessageList({
//   initialMessages = [],
//   displayMessages,
//   handleCopy,
//   handleRetry,
//   status
// }: AiMessageListProps) {
//   const showLoader = status === "submitted";

//   return (
//     <>
//       <ConversationContent className="max-w-3xl mx-auto w-full px-4 sm:px-6">
//         {initialMessages.map((m) => (
//           <InitialMessageItem key={m._id} message={m} />
//         ))}

//         {displayMessages.map((message) => (
//           <MessageItem
//             key={message.id}
//             message={message}
//             handleCopy={handleCopy}
//             handleRetry={handleRetry}
//           />
//         ))}

//         {showLoader && (
//           <div className="flex justify-center py-8 min-h-20">
//             <Loader />
//           </div>
//         )}
//       </ConversationContent>
//       <ConversationScrollButton />
//     </>
//   );
// });

"use client";

import { memo, useMemo } from "react";
import {
  CopyIcon,
  RefreshCcwIcon,
  SearchIcon,
  Loader2Icon,
  CheckIcon
} from "lucide-react";
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

/* ----------------------------- Message Item ----------------------------- */
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
    const fullText = useMemo(() => {
      const fromParts = extractMessageText(message.parts);
      if (fromParts) return fromParts;
      if (typeof message.content === "string") return message.content;
      if (Array.isArray(message.content)) {
        return message.content
          .filter((part: any) => part.type === "text")
          .map((part: any) => part.text)
          .join("\n")
          .trim();
      }
      return "";
    }, [message.parts, message.content]);

    const normalizedAssistantText = useMemo(() => {
      const trimmed = fullText.trim();
      const fenceMatch = trimmed.match(/^```(\w+)?\n([\s\S]*?)\n```$/);
      if (!fenceMatch) return fullText;

      const fenceLang = fenceMatch[1] || "";
      const fenceBody = fenceMatch[2]?.trim() || "";

      // Always unwrap txt/text/plaintext fences - they're just prose, not code
      const proseLanguages = ["txt", "text", "plaintext", "plain"];
      if (proseLanguages.includes(fenceLang.toLowerCase())) {
        return fenceBody;
      }

      const looksLikeCode =
        /\b(import|export|const|let|var|function|class|interface|type)\b/.test(
          fenceBody
        ) ||
        /[{};=<>]/.test(fenceBody) ||
        /\(.*\)\s*=>/.test(fenceBody);

      if (fenceLang && !looksLikeCode) {
        return fenceBody;
      }

      if (fenceLang || looksLikeCode) {
        return fullText;
      }

      return fenceBody;
    }, [fullText]);

    const assistantWithCodeFence = useMemo(() => {
      const text = normalizedAssistantText.trim();
      if (!text) return normalizedAssistantText;
      if (text.startsWith("```")) return normalizedAssistantText;

      const lines = text.split("\n").map((line) => line.trim());
      const nonEmptyLines = lines.filter(Boolean);
      const codeLikeLines = nonEmptyLines.filter((line) =>
        /\b(import|export|const|let|var|function|class|interface|type)\b/.test(
          line
        ) ||
        /[{};=<>]/.test(line) ||
        /\(.*\)\s*=>/.test(line) ||
        /\breturn\b/.test(line)
      );
      const hasMarkdownStructure = nonEmptyLines.some(
        (line) =>
          /^(#{1,6})\s+/.test(line) ||
          /^[-*+]\s+/.test(line) ||
          /^\d+\.\s+/.test(line)
      );

      const codeRatio =
        nonEmptyLines.length > 0
          ? codeLikeLines.length / nonEmptyLines.length
          : 0;

      if (hasMarkdownStructure || codeLikeLines.length < 2 || codeRatio < 0.6) {
        return normalizedAssistantText;
      }

      return `\
\
\`\`\`ts\n${text}\n\`\`\``.trim();
    }, [normalizedAssistantText]);

    const processedText = useMemo(() => {
      if (message.role === "user") {
        return processMessageContent(fullText);
      }
      return assistantWithCodeFence;
    }, [fullText, normalizedAssistantText, assistantWithCodeFence, message.role]);

    if (!fullText) return null;

    return (
      <Message from={message.role}>
        <MessageContent className="py-4 sm:py-6">
          <MessageResponse
            className="prose prose-sm dark:prose-invert max-w-none 
              [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-muted [&_pre]:p-4 
              [&_code]:text-sm [&_code]:font-mono [&_code]:before:content-none [&_code]:after:content-none
              [&_p]:leading-7 [&_p]:mb-4 [&_p:last-child]:mb-0
              [&_ul]:my-4 [&_ol]:my-4 [&_li]:my-1
              [&_ul]:list-disc [&_ol]:list-decimal [&_ul]:pl-6 [&_ol]:pl-6
              [&_h1]:text-2xl [&_h2]:text-xl [&_h3]:text-lg
              [&_h1]:font-semibold [&_h2]:font-semibold [&_h3]:font-semibold
              [&_h1]:mt-6 [&_h2]:mt-5 [&_h3]:mt-4
              [&_h1]:mb-4 [&_h2]:mb-3 [&_h3]:mb-2
              overflow-x-auto break-words"
          >
            {processedText}
          </MessageResponse>
        </MessageContent>
        {message.role === "assistant" && (
          <MessageActions className="mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <MessageAction
              onClick={handleRetry}
              label="Retry"
              className="hover:bg-muted/50"
            >
              <RefreshCcwIcon className="size-4" />
            </MessageAction>

            <MessageAction
              onClick={() => handleCopy(fullText)}
              label="Copy"
              className="hover:bg-muted/50"
            >
              <CopyIcon className="size-4" />
            </MessageAction>
          </MessageActions>
        )}
      </Message>
    );
  },
  (prevProps, nextProps) => {
    if (prevProps.message === nextProps.message) return true;
    if (prevProps.handleCopy !== nextProps.handleCopy) return false;
    if (prevProps.handleRetry !== nextProps.handleRetry) return false;
    if (prevProps.message?.id !== nextProps.message?.id) return false;
    if (prevProps.message?.role !== nextProps.message?.role) return false;
    if (prevProps.message?.parts !== nextProps.message?.parts) return false;
    if (prevProps.message?.content !== nextProps.message?.content) return false;
    return true;
  }
);

MessageItem.displayName = "MessageItem";

/* -------------------------- Initial Message Item ------------------------- */
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
        <MessageContent className="py-4 sm:py-6">
          <MessageResponse
            className="prose prose-sm dark:prose-invert max-w-none 
              [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-muted [&_pre]:p-4 
              [&_code]:text-sm [&_code]:font-mono [&_code]:before:content-none [&_code]:after:content-none
              [&_p]:leading-7 [&_p]:mb-4 [&_p:last-child]:mb-0
              [&_ul]:my-4 [&_ol]:my-4 [&_li]:my-1
              [&_ul]:list-disc [&_ol]:list-decimal [&_ul]:pl-6 [&_ol]:pl-6
              [&_h1]:text-2xl [&_h2]:text-xl [&_h3]:text-lg
              [&_h1]:font-semibold [&_h2]:font-semibold [&_h3]:font-semibold
              [&_h1]:mt-6 [&_h2]:mt-5 [&_h3]:mt-4
              [&_h1]:mb-4 [&_h2]:mb-3 [&_h3]:mb-2
              overflow-x-auto break-words"
          >
            {processedContent}
          </MessageResponse>
        </MessageContent>
      </Message>
    );
  }
);

InitialMessageItem.displayName = "InitialMessageItem";

/* ------------------------- Status Message Component ----------------------- */
const StatusMessage = memo(({ status }: { status: string }) => {
  const statusConfig = {
    submitted: {
      icon: <SearchIcon className="size-4 animate-pulse text-blue-500" />,
      text: "Searching knowledge base",
      subtext: "Analyzing relevant files...",
      bgColor:
        "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800"
    },
    streaming: {
      icon: <Loader2Icon className="size-4 animate-spin text-purple-500" />,
      text: "Generating response",
      subtext: "Composing answer...",
      bgColor:
        "bg-purple-50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800"
    }
  };

  const config = statusConfig[status as keyof typeof statusConfig];
  if (!config) return null;

  return (
    <Message from="assistant">
      <MessageContent className="py-4 sm:py-6">
        <div
          className={`flex items-start gap-3 p-4 rounded-lg border ${config.bgColor} transition-colors`}
        >
          <div className="mt-0.5 shrink-0">{config.icon}</div>
          <div className="flex-1 min-w-0 space-y-1">
            <p className="text-sm font-medium text-foreground">{config.text}</p>
            {config.subtext && (
              <p className="text-xs text-muted-foreground">{config.subtext}</p>
            )}
          </div>
        </div>
      </MessageContent>
    </Message>
  );
});

StatusMessage.displayName = "StatusMessage";

/* ------------------------------ Main List ------------------------------ */
export const AiMessageList = memo(function AiMessageList({
  initialMessages = [],
  displayMessages,
  handleCopy,
  handleRetry,
  status
}: AiMessageListProps) {
  const isStreaming = status === "submitted" || status === "streaming";
  const showStatusMessage = isStreaming;
  const stableMessages = useMemo(
    () => (isStreaming ? displayMessages.slice(0, -1) : displayMessages),
    [displayMessages, isStreaming]
  );
  const streamingMessage = isStreaming
    ? displayMessages[displayMessages.length - 1]
    : undefined;

  return (
    <>
      <ConversationContent className="max-w-3xl mx-auto w-full px-4 sm:px-6 pb-8">
        {/* Initial messages */}
        {initialMessages.map((m) => (
          <InitialMessageItem key={m._id} message={m} />
        ))}

        {/* Real messages */}
        {stableMessages.map((message) => (
          <MessageItem
            key={message.id}
            message={message}
            handleCopy={handleCopy}
            handleRetry={handleRetry}
          />
        ))}

        {streamingMessage && (
          <MessageItem
            key={streamingMessage.id ?? "streaming-message"}
            message={streamingMessage}
            handleCopy={handleCopy}
            handleRetry={handleRetry}
          />
        )}

        {/* Status indicator */}
        {showStatusMessage && <StatusMessage status={status} />}
      </ConversationContent>

      <ConversationScrollButton />
    </>
  );
});
