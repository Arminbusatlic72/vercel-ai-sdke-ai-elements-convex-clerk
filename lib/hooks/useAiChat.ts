"use client";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useChat } from "@ai-sdk/react";
import { useMutation } from "convex/react";
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
  chatId: Id<ChatTableName>;
  initialMessages?: Array<{
    _id: Id<MessageTableName>;
    role: "user" | "assistant";
    content: string;
  }>;
  models: readonly ModelConfig[];
  defaultModel?: string;
  createChatApi: any;
  storeMessageApi: any;
  updateChatTitleApi?: any;
}

export function useAiChat<
  ChatTableName extends TableNames,
  MessageTableName extends TableNames
>({
  chatId: initialChatId,
  initialMessages = [],
  models,
  defaultModel,
  createChatApi,
  storeMessageApi,
  updateChatTitleApi
}: UseAiChatProps<ChatTableName, MessageTableName>) {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const conversationRef = useRef<HTMLDivElement>(null);

  const [chatId, setChatId] = useState<Id<ChatTableName>>(initialChatId);
  const [input, setInput] = useState("");
  const [model, setModel] = useState<string>(
    () => defaultModel || models[0]?.value || ""
  );
  const [webSearch, setWebSearch] = useState(false);

  const { messages, sendMessage, status } = useChat();

  // Use refs for tracking without causing re-renders
  const savedMessageKeys = useRef(new Set<string>());
  const isSavingRef = useRef(false);
  const isInitializedRef = useRef(false);
  const hasUpdatedTitleRef = useRef(false);

  const createChat = useMutation(createChatApi);
  const storeMessage = useMutation(storeMessageApi);
  const updateChatTitle = updateChatTitleApi
    ? useMutation(updateChatTitleApi)
    : null;

  // Memoize model map - only recreate if models array changes
  const modelMap = useMemo(
    () => new Map(models.map((m) => [m.value, m])),
    [models]
  );

  // Memoize grouped models
  const groupedModels = useMemo(() => {
    const groups: Record<string, ModelConfig[]> = {};
    models.forEach((model) => {
      if (!groups[model.provider]) groups[model.provider] = [];
      groups[model.provider].push(model);
    });
    return groups;
  }, [models]);

  // Focus input on chat change
  useEffect(() => {
    inputRef.current?.focus();
  }, [chatId]);

  // Initialize saved messages once
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
          savedMessageKeys.current.has(`user-${fullText}`)
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

  // Save messages with debouncing
  useEffect(() => {
    if (!messages.length || isSavingRef.current) return;

    const saveMessages = async () => {
      isSavingRef.current = true;
      try {
        const unsavedMessages = messages.filter((msg) => {
          const fullText = extractMessageText(msg.parts);
          if (!fullText) return false;
          const key = `${msg.role}-${fullText}`;
          return !savedMessageKeys.current.has(key);
        });

        if (!unsavedMessages.length) return;

        let activeChatId = chatId;

        for (const msg of unsavedMessages) {
          const fullText = extractMessageText(msg.parts);
          if (!fullText) continue;

          const key = `${msg.role}-${fullText}`;

          // Create chat if needed
          if (!activeChatId && msg.role === "user") {
            try {
              const title =
                fullText.slice(0, 50) + (fullText.length > 50 ? "..." : "");
              activeChatId = await createChat({ title });
              setChatId(activeChatId as Id<ChatTableName>);
              hasUpdatedTitleRef.current = true;
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

  // Auto-scroll when messages arrive
  useEffect(() => {
    const scrollContainer = conversationRef.current;
    if (!scrollContainer) return;

    const { scrollHeight, clientHeight, scrollTop } = scrollContainer;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;

    // Always scroll on new submission or when near bottom
    if (isNearBottom || status === "submitted" || status === "streaming") {
      requestAnimationFrame(() => {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      });
    }
  }, [messages, status]);

  // Memoized callbacks
  const handleSubmit = useCallback(
    (msg: { text: string; files?: any[] }) => {
      if (!msg.text && !msg.files?.length) return;

      const selectedModelConfig = modelMap.get(model);
      const provider = webSearch
        ? "google"
        : selectedModelConfig?.provider || "google";

      sendMessage(
        { text: msg.text, files: msg.files },
        { body: { chatId, model, provider, webSearch } }
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
    const lastUserMessage = [...messages]
      .reverse()
      .find((msg) => msg.role === "user");
    if (!lastUserMessage) return;

    const selectedModelConfig = modelMap.get(model);
    const provider = selectedModelConfig?.provider || "google";

    sendMessage(
      { text: extractMessageText(lastUserMessage.parts) },
      { body: { chatId, model, provider, webSearch } }
    );
  }, [messages, sendMessage, chatId, model, modelMap, webSearch]);

  // Memoize display messages
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
