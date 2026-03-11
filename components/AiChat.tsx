"use client";

import { memo, useCallback, useEffect, useRef, useState } from "react";
import { GlobeIcon } from "lucide-react";
import { Conversation } from "@/components/ai-elements/conversation";
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputSubmit,
  PromptInputActionAddAttachments,
  PromptInputActionMenu,
  PromptInputActionMenuContent,
  PromptInputActionMenuTrigger,
  PromptInputAttachment,
  PromptInputAttachments,
  PromptInputBody,
  PromptInputButton,
  PromptInputHeader,
  PromptInputFooter,
  PromptInputTools
} from "@/components/ai-elements/prompt-input";
import { useAiChat } from "@/lib/hooks/useAiChat";
import { AiMessageList } from "@/components/AiMessageList";
import type { Id, TableNames } from "@/convex/_generated/dataModel";
import {
  MONTHLY_IMAGE_LIMIT,
  MONTHLY_MESSAGE_LIMIT,
  REQUESTS_PER_HOUR_LIMIT,
  REQUESTS_PER_MINUTE_LIMIT
} from "@/app/api/chat/usage-guard";
import { UsageSummary } from "@/types/usage";

export interface ModelConfig {
  name: string;
  value: string;
  provider: string;
}

export interface AiChatProps<
  ChatTableName extends TableNames,
  MessageTableName extends TableNames
> {
  chatId?: Id<"chats">;
  gptId?: string;
  projectId?: Id<"projects">;
  initialMessages?: Array<{
    _id: Id<"messages">;
    role: "user" | "assistant";
    content: string;
  }>;
  models: readonly ModelConfig[];
  apiEndpoint?: string;
  showWebSearch?: boolean;
  defaultModel?: string;
}

const AttachmentRenderer = memo(({ attachment }: { attachment: any }) => (
  <PromptInputAttachment data={attachment} />
));
AttachmentRenderer.displayName = "AttachmentRenderer";

function AiChat<
  ChatTableName extends TableNames,
  MessageTableName extends TableNames
>(props: AiChatProps<ChatTableName, MessageTableName>) {
  const [usageSummary, setUsageSummary] = useState<UsageSummary | null>(null);
  const isMountedRef = useRef(true);

  const {
    input,
    setInput,
    model,
    webSearch,
    toggleWebSearch,
    handleSubmit,
    handleCopy,
    handleRetry,
    displayMessages,
    inputRef,
    conversationRef,
    status
  } = useAiChat({
    chatId: props.chatId,
    gptId: props.gptId,
    projectId: props.projectId,
    initialMessages: props.initialMessages,
    models: props.models,
    defaultModel: props.defaultModel,
    onUsageSummary: setUsageSummary
  });

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setInput(e.target.value);
    },
    [setInput]
  );

  const renderAttachment = useCallback(
    (attachment: any) => <AttachmentRenderer attachment={attachment} />,
    []
  );

  const currentModelName =
    props.models.find((m) => m.value === model)?.name || model;

  const refreshUsageSummary = useCallback(async () => {
    try {
      const res = await fetch("/api/usage-summary", { cache: "no-store" });
      if (!res.ok) return;
      const data: UsageSummary = await res.json();
      if (!isMountedRef.current) return;
      setUsageSummary(data);
    } catch (error) {
      console.error("Failed to refresh usage summary", error);
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    void refreshUsageSummary();
    const interval = setInterval(() => {
      void refreshUsageSummary();
    }, 60_000);
    return () => {
      clearInterval(interval);
    };
  }, [refreshUsageSummary]);

  const handleSubmitWithUsageRefresh = useCallback(
    async (msg: { text: string; files?: any[] }) => {
      await handleSubmit(msg);
      void refreshUsageSummary();
    },
    [handleSubmit, refreshUsageSummary]
  );

  const usageRows = [
    {
      label: "Requests / min",
      used: usageSummary?.minuteRequests,
      limit: REQUESTS_PER_MINUTE_LIMIT
    },
    {
      label: "Requests / hr",
      used: usageSummary?.hourRequests,
      limit: REQUESTS_PER_HOUR_LIMIT
    },
    {
      label: "Messages / mo",
      used: usageSummary?.monthlyMessages,
      limit: MONTHLY_MESSAGE_LIMIT
    },
    {
      label: "Images / mo",
      used: usageSummary?.monthlyImages,
      limit: MONTHLY_IMAGE_LIMIT
    }
  ];

  const UsageLimitsIndicator = () => (
    <div className="absolute top-4 right-4 z-10 min-w-[190px] rounded-2xl border border-gray-200 bg-white/80 p-3 text-xs font-medium shadow-lg backdrop-blur">
      <div className="text-[0.65rem] font-semibold text-gray-500 uppercase tracking-wide">
        Current Limits
      </div>
      <div className="mt-1 space-y-1">
        {usageRows.map((row) => (
          <div
            key={row.label}
            className="flex items-center justify-between text-[0.75rem]"
          >
            <span className="text-gray-600">{row.label}</span>
            <span className="text-gray-900">
              {typeof row.used === "number"
                ? `${row.used.toLocaleString()} / ${row.limit.toLocaleString()}`
                : `-- / ${row.limit.toLocaleString()}`}
            </span>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="relative flex flex-col h-full overflow-hidden">
      <UsageLimitsIndicator />
      <div
        ref={conversationRef}
        className="flex-1 overflow-y-auto overflow-x-hidden min-h-0"
      >
        <Conversation>
          <AiMessageList
            displayMessages={displayMessages}
            handleCopy={handleCopy}
            handleRetry={handleRetry}
            status={status}
          />
        </Conversation>
      </div>

      <div className="border-t bg-white/80 backdrop-blur-sm py-4 px-4 sm:px-6 shrink-0">
        <div className="max-w-3xl mx-auto w-full">
          <PromptInput
            onSubmit={handleSubmitWithUsageRefresh}
            className="shadow-sm"
            globalDrop
            multiple
          >
            <PromptInputHeader>
              <PromptInputAttachments>
                {renderAttachment}
              </PromptInputAttachments>
            </PromptInputHeader>
            <PromptInputBody>
              <PromptInputTextarea
                value={input}
                onChange={handleInputChange}
                ref={inputRef}
                placeholder="Type your message here..."
                className="min-h-[60px] max-h-[200px] resize-none"
              />
            </PromptInputBody>
            <PromptInputFooter>
              <PromptInputTools>
                <PromptInputActionMenu>
                  <PromptInputActionMenuTrigger />
                  <PromptInputActionMenuContent>
                    <PromptInputActionAddAttachments />
                  </PromptInputActionMenuContent>
                </PromptInputActionMenu>

                {props.showWebSearch && (
                  <PromptInputButton
                    variant={webSearch ? "default" : "ghost"}
                    onClick={toggleWebSearch}
                    className="gap-2"
                  >
                    <GlobeIcon size={16} />
                    <span>Search</span>
                  </PromptInputButton>
                )}

                <div className="px-3 py-2 text-sm text-muted-foreground bg-muted/50 rounded-md">
                  {currentModelName}
                </div>
              </PromptInputTools>

              <PromptInputSubmit
                status={status}
                disabled={status === "streaming"}
              />
            </PromptInputFooter>
          </PromptInput>
        </div>
      </div>
    </div>
  );
}

export default memo(AiChat) as typeof AiChat;
