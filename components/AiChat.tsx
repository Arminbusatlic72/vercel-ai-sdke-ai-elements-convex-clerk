"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useChat } from "@ai-sdk/react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

import {
  Conversation,
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
  PromptInputSelect,
  PromptInputSelectContent,
  PromptInputSelectItem,
  PromptInputSelectTrigger,
  PromptInputSelectValue,
  PromptInputFooter,
  PromptInputTools
} from "@/components/ai-elements/prompt-input";

import { Loader } from "@/components/ai-elements/loader";
import { CopyIcon, RefreshCcwIcon, GlobeIcon } from "lucide-react";

const models = [
  { name: "Gemini 2.5 Flash", value: "gemini-2.5-flash" },
  { name: "Gemini 2.0 Pro", value: "gemini-2.0-pro" }
] as const;

export interface AiChatProps {
  chatId?: Id<"chats">;
  initialMessages?: Array<{
    _id: Id<"messages">;
    role: "user" | "assistant";
    content: string;
  }>;
}

const extractMessageText = (parts: any[]): string =>
  parts
    .filter((p) => p.type === "text")
    .map((p) => p.text)
    .join("\n")
    .trim();

export default function AiChat({
  chatId: initialChatId,
  initialMessages = []
}: AiChatProps) {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [chatId, setChatId] = useState<Id<"chats"> | undefined>(initialChatId);
  const [input, setInput] = useState("");
  const [model, setModel] = useState<string>(models[0].value);
  const [webSearch, setWebSearch] = useState(false);

  const { messages, sendMessage, status, regenerate } = useChat();
  const createChat = useMutation(api.chats.createChat);
  const storeMessage = useMutation(api.messages.storeMessage);

  const savedMessageKeys = useRef(new Set<string>());
  const isSavingRef = useRef(false);
  const isInitialized = useRef(false);

  // Focus input on mount and when chatId changes
  useEffect(() => {
    inputRef.current?.focus();
  }, [chatId]);

  // Initialize saved message keys once
  useEffect(() => {
    if (isInitialized.current) return;
    isInitialized.current = true;
    initialMessages.forEach((m) => {
      savedMessageKeys.current.add(`${m.role}-${m.content.trim()}`);
    });
  }, [initialMessages]);

  // Save new messages to database
  useEffect(() => {
    if (!messages.length || isSavingRef.current) return;

    const saveMessages = async () => {
      isSavingRef.current = true;

      try {
        for (const msg of messages) {
          const fullText = extractMessageText(msg.parts);
          if (!fullText) continue;

          const key = `${msg.role}-${fullText}`;
          if (savedMessageKeys.current.has(key)) continue;

          let activeChatId = chatId;

          if (!activeChatId && msg.role === "user") {
            try {
              activeChatId = await createChat({
                title: fullText.slice(0, 100)
              });
              setChatId(activeChatId);
            } catch (err) {
              console.error("Failed to create chat:", err);
              continue;
            }
          }

          if (!activeChatId) continue;

          try {
            await storeMessage({
              chatId: activeChatId,
              content: fullText,
              role: msg.role as "user" | "assistant"
            });
            savedMessageKeys.current.add(key);
          } catch (err) {
            console.error("Failed to store message:", err);
          }
        }
      } finally {
        isSavingRef.current = false;
      }
    };

    saveMessages();
  }, [messages, chatId, createChat, storeMessage]);

  const handleSubmit = useCallback(
    (msg: { text: string; files?: any[] }) => {
      if (!msg.text && !msg.files?.length) return;

      sendMessage(
        { text: msg.text, files: msg.files },
        { body: { chatId, model, webSearch } }
      );
      setInput("");
    },
    [sendMessage, chatId, model, webSearch]
  );

  const handleCopy = useCallback((text: string) => {
    navigator.clipboard.writeText(text);
  }, []);

  const toggleWebSearch = useCallback(() => {
    setWebSearch((prev) => !prev);
  }, []);

  // Memoize filtered messages to avoid recalculating on every render
  const displayMessages = useMemo(() => {
    return messages.filter((message) => {
      const fullText = extractMessageText(message.parts);
      if (!fullText) return false;
      return !initialMessages.some(
        (m) => m.role === message.role && m.content.trim() === fullText
      );
    });
  }, [messages, initialMessages]);

  // Memoize attachment renderer
  const renderAttachment = useCallback(
    (attachment: any) => <PromptInputAttachment data={attachment} />,
    []
  );

  return (
    <div className="flex flex-col h-full w-full">
      <div className="flex-1 overflow-y-auto px-6">
        <Conversation className="flex flex-col h-full w-full">
          <ConversationContent>
            {initialMessages.map((m) => (
              <Message key={m._id} from={m.role}>
                <MessageContent>
                  <MessageResponse>{m.content}</MessageResponse>
                </MessageContent>
              </Message>
            ))}

            {displayMessages.map((message) => {
              const fullText = extractMessageText(message.parts);
              if (!fullText) return null;
              return (
                <Message key={message.id} from={message.role}>
                  <MessageContent>
                    <MessageResponse>{fullText}</MessageResponse>
                  </MessageContent>
                  {message.role === "assistant" && (
                    <MessageActions>
                      <MessageAction
                        onClick={() => {
                          const lastUserMessage = messages
                            .slice()
                            .reverse()
                            .find((msg) => msg.role === "user");

                          if (lastUserMessage) {
                            sendMessage(
                              {
                                text: extractMessageText(lastUserMessage.parts)
                              },
                              { body: { chatId, model } }
                            );
                          }
                        }}
                        label="Retry"
                      >
                        <RefreshCcwIcon className="size-3" />
                      </MessageAction>
                      <MessageAction
                        onClick={() => handleCopy(fullText)}
                        label="Copy"
                      >
                        <CopyIcon className="size-3" />
                      </MessageAction>
                    </MessageActions>
                  )}
                </Message>
              );
            })}

            {status === "submitted" && <Loader />}
          </ConversationContent>

          <ConversationScrollButton />
        </Conversation>
      </div>

      <div className="border-t bg-white py-4 px-6">
        <div className="max-w-4xl mx-auto">
          <PromptInput
            onSubmit={handleSubmit}
            className="mt-4"
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
                onChange={(e) => setInput(e.target.value)}
                value={input}
                ref={inputRef}
                placeholder="Type your message here..."
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
                <PromptInputButton
                  variant={webSearch ? "default" : "ghost"}
                  onClick={toggleWebSearch}
                >
                  <GlobeIcon size={16} />
                  <span>Search</span>
                </PromptInputButton>
                <PromptInputSelect onValueChange={setModel} value={model}>
                  <PromptInputSelectTrigger>
                    <PromptInputSelectValue />
                  </PromptInputSelectTrigger>
                  <PromptInputSelectContent>
                    {models.map((m) => (
                      <PromptInputSelectItem key={m.value} value={m.value}>
                        {m.name}
                      </PromptInputSelectItem>
                    ))}
                  </PromptInputSelectContent>
                </PromptInputSelect>
              </PromptInputTools>
              <PromptInputSubmit disabled={!input && !status} status={status} />
            </PromptInputFooter>
          </PromptInput>
        </div>
      </div>
    </div>
  );
}
