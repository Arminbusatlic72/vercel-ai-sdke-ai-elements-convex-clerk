"use client";

import { useState, useEffect, useRef, useCallback } from "react";
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
  PromptInputSubmit
} from "@/components/ai-elements/prompt-input";

import { Loader } from "@/components/ai-elements/loader";
import { CopyIcon, RefreshCcwIcon } from "lucide-react";

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

// Helper to extract text from message parts
const extractMessageText = (parts: any[]): string => {
  return parts
    .filter((p) => p.type === "text")
    .map((p) => p.text)
    .join("\n")
    .trim();
};

export default function AiChat({
  chatId: initialChatId,
  initialMessages = []
}: AiChatProps) {
  const [chatId, setChatId] = useState<Id<"chats"> | undefined>(initialChatId);
  const [input, setInput] = useState("");
  const [model] = useState(models[0].value);

  const { messages, sendMessage, status, regenerate } = useChat();
  const createChat = useMutation(api.chats.createChat);
  const storeMessage = useMutation(api.messages.storeMessage);

  // Track messages already stored to avoid duplicates
  const savedMessageKeys = useRef(new Set<string>());
  const isSavingRef = useRef(false);
  const isInitialized = useRef(false);

  // Initialize saved keys once
  useEffect(() => {
    if (isInitialized.current) return;
    isInitialized.current = true;

    initialMessages.forEach((m) => {
      savedMessageKeys.current.add(`${m.role}-${m.content.trim()}`);
    });
  }, [initialMessages]);

  // Save new messages
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

          // Create chat on first user message if needed
          if (!activeChatId && msg.role === "user") {
            try {
              activeChatId = await createChat({
                title: fullText.slice(0, 100) // Limit title length
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

  // Memoize submit handler
  const handleSubmit = useCallback(
    (msg: { text: string; files?: any[] }) => {
      if (!msg.text && !msg.files?.length) return;

      sendMessage(
        { text: msg.text, files: msg.files },
        { body: { chatId, model } }
      );
      setInput("");
    },
    [sendMessage, chatId, model]
  );

  // Memoize copy handler
  const handleCopy = useCallback((text: string) => {
    navigator.clipboard.writeText(text);
  }, []);

  // Filter new messages (memoized calculation)
  const displayMessages = messages.filter((message) => {
    const fullText = extractMessageText(message.parts);
    if (!fullText) return false;

    return !initialMessages.some(
      (m) => m.role === message.role && m.content.trim() === fullText
    );
  });

  return (
    <div className="max-w-4xl mx-auto p-6 relative size-full h-screen">
      <div className="flex flex-col h-full">
        <div className="flex-1 overflow-y-auto p-4">
          <Conversation className="h-full">
            <ConversationContent>
              {/* Initial messages */}
              {initialMessages.map((m) => (
                <Message key={m._id} from={m.role}>
                  <MessageContent>
                    <MessageResponse>{m.content}</MessageResponse>
                  </MessageContent>
                </Message>
              ))}

              {/* New messages */}
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
                        <MessageAction onClick={regenerate} label="Retry">
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
      </div>

      <div className="max-w-4xl mx-auto w-full p-6">
        <PromptInput onSubmit={handleSubmit}>
          <PromptInputTextarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message…"
          />
          <PromptInputSubmit
            disabled={!input && status !== "streaming"}
            status={status}
          />
        </PromptInput>
      </div>
    </div>
  );
}
