"use client";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useChat } from "@ai-sdk/react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id, TableNames } from "@/convex/_generated/dataModel";
import { extractMessageText } from "@/lib/message";

export interface ModelConfig {
  name: string;
  value: string;
  provider: string;
}

export interface UseAiChatProps<
  ChatTableName extends TableNames,
  MessageTableName extends TableNames
> {
  chatId?: Id<ChatTableName>;
  projectId?: Id<"projects">;
  initialMessages?: Array<{
    _id: Id<MessageTableName>;
    role: "user" | "assistant";
    content: string;
  }>;
  models: readonly ModelConfig[];
  defaultModel?: string;
}

export function useAiChat<
  ChatTableName extends TableNames,
  MessageTableName extends TableNames
>({
  chatId: initialChatId,
  projectId,
  initialMessages = [],
  models,
  defaultModel
}: UseAiChatProps<ChatTableName, MessageTableName>) {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const conversationRef = useRef<HTMLDivElement>(null);

  const [chatId, setChatId] = useState<Id<ChatTableName> | undefined>(
    initialChatId
  );
  const [input, setInput] = useState("");
  const [model, setModel] = useState<string>(
    () => defaultModel || models[0]?.value || ""
  );
  const [webSearch, setWebSearch] = useState(false);

  // ✅ FIX: Convert Convex messages to AI SDK UIMessage format
  const formattedInitialMessages = useMemo(() => {
    return initialMessages.map((msg) => ({
      id: msg._id,
      role: msg.role,
      parts: [{ type: "text", text: msg.content }]
    }));
  }, [initialMessages]);

  const { messages, sendMessage, status } = useChat({
    api: "/api/chat",
    id: chatId,
    initialMessages: formattedInitialMessages, // ← Seed with history
    body: { model, webSearch }
  });

  const savedMessageKeys = useRef(new Set<string>());
  const isSavingRef = useRef(false);
  const isInitializedRef = useRef(false);
  const hasUpdatedTitleRef = useRef(false);

  const createChat = useMutation(api.chats.createChat);
  const storeMessage = useMutation(api.messages.storeMessage);
  const updateChatTitle = useMutation(api.chats.updateChatTitle);

  const modelMap = useMemo(
    () => new Map(models.map((m) => [m.value, m])),
    [models]
  );

  const groupedModels = useMemo(() => {
    const groups: Record<string, ModelConfig[]> = {};
    models.forEach((m) => {
      if (!groups[m.provider]) groups[m.provider] = [];
      groups[m.provider].push(m);
    });
    return groups;
  }, [models]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [chatId]);

  // ✅ Initialize saved message keys from history
  useEffect(() => {
    if (isInitializedRef.current) return;
    isInitializedRef.current = true;
    initialMessages.forEach((m) =>
      savedMessageKeys.current.add(`${m.role}-${m.content.trim()}`)
    );
  }, [initialMessages]);

  // Auto-update chat title
  useEffect(() => {
    if (!updateChatTitle || hasUpdatedTitleRef.current || !chatId) return;

    const updateTitle = async () => {
      const firstUserMessage = messages.find((msg) => {
        const fullText = extractMessageText(msg.parts);
        return (
          msg.role === "user" &&
          fullText &&
          !savedMessageKeys.current.has(`user-${fullText}`)
        );
      });
      if (!firstUserMessage) return;

      const content = extractMessageText(firstUserMessage.parts).trim();
      const newTitle =
        content.length > 50 ? content.slice(0, 50) + "..." : content;

      try {
        await updateChatTitle({ id: chatId, title: newTitle });
        hasUpdatedTitleRef.current = true;
      } catch (err) {
        console.error("Failed to update chat title:", err);
      }
    };

    updateTitle();
  }, [messages, chatId, updateChatTitle]);

  // Save new messages to Convex
  useEffect(() => {
    if (!messages.length || isSavingRef.current) return;

    const saveMessages = async () => {
      isSavingRef.current = true;
      try {
        const unsaved = messages.filter((msg) => {
          const fullText = extractMessageText(msg.parts);
          if (!fullText) return false;
          return !savedMessageKeys.current.has(`${msg.role}-${fullText}`);
        });
        if (!unsaved.length) return;

        let activeChatId = chatId;

        for (const msg of unsaved) {
          const fullText = extractMessageText(msg.parts);
          if (!fullText) continue;
          const key = `${msg.role}-${fullText}`;

          // Create chat on first user message if needed
          if (!activeChatId && msg.role === "user") {
            const title =
              fullText.slice(0, 50) + (fullText.length > 50 ? "..." : "");

            const newChatId = await createChat({
              title,
              projectId: projectId ?? undefined,
              createdAt: Date.now()
            });

            activeChatId = newChatId as Id<ChatTableName>;
            setChatId(activeChatId);
            hasUpdatedTitleRef.current = true;
          }

          if (!activeChatId) continue;

          try {
            await storeMessage({
              chatId: activeChatId,
              content: fullText,
              role: msg.role
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
  }, [messages, chatId, projectId, createChat, storeMessage]);

  // Auto-scroll
  useEffect(() => {
    const scrollContainer = conversationRef.current;
    if (!scrollContainer) return;
    const { scrollHeight, clientHeight, scrollTop } = scrollContainer;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
    if (isNearBottom || status === "submitted" || status === "streaming") {
      requestAnimationFrame(() => {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      });
    }
  }, [messages, status]);

  const handleSubmit = useCallback(
    (msg: { text: string; files?: any[] }) => {
      if (!msg.text && !msg.files?.length) return;

      const provider = webSearch
        ? "google"
        : modelMap.get(model)?.provider || "google";

      // ✅ Pass model and provider in body
      sendMessage(
        { text: msg.text, files: msg.files },
        {
          body: {
            chatId,
            model,
            provider,
            webSearch
          }
        }
      );
      setInput("");
    },
    [sendMessage, chatId, model, modelMap, webSearch]
  );

  const handleCopy = useCallback(
    (text: string) => navigator.clipboard.writeText(text),
    []
  );

  const toggleWebSearch = useCallback(() => setWebSearch((prev) => !prev), []);

  const handleRetry = useCallback(() => {
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    if (!lastUser) return;
    const provider = modelMap.get(model)?.provider || "google";
    sendMessage(
      { text: extractMessageText(lastUser.parts) },
      { body: { chatId, model, provider, webSearch } }
    );
  }, [messages, sendMessage, chatId, model, modelMap, webSearch]);

  // ✅ Only display messages NOT in initialMessages (avoid duplicates in UI)
  const displayMessages = useMemo(() => {
    return messages.filter((msg) => {
      const fullText = extractMessageText(msg.parts);
      if (!fullText) return false;
      return !initialMessages.some(
        (m) => m.role === msg.role && m.content.trim() === fullText
      );
    });
  }, [messages, initialMessages]);

  return {
    chatId,
    input,
    setInput,
    model,
    setModel,
    webSearch,
    toggleWebSearch,
    handleSubmit,
    handleCopy,
    handleRetry,
    displayMessages,
    groupedModels,
    inputRef,
    conversationRef,
    messages,
    status
  };
}
