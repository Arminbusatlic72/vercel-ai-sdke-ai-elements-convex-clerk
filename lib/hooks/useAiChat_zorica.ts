"use client";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useChat } from "@ai-sdk/react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id, TableNames } from "@/convex/_generated/dataModel";
import { extractMessageText } from "@/lib/message";

import { useRouter } from "next/navigation"; // or 'next/router'

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
  // 🚨 ADD THE NEW API PROPS HERE 🚨
  createChatApi: typeof api.chats.createChat;
  storeMessageApi: typeof api.messages.storeMessage;
  updateChatTitleApi: typeof api.chats.updateChatTitle;
}

export function useAiChat<
  ChatTableName extends "chats",
  MessageTableName extends TableNames
>({
  chatId: initialChatId,
  createChatApi,
  storeMessageApi,
  updateChatTitleApi,
  projectId,
  initialMessages = [],
  models,
  defaultModel
}: UseAiChatProps<ChatTableName, MessageTableName>) {
  // Initialize router for redirection
  const router = useRouter();

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const conversationRef = useRef<HTMLDivElement>(null);

  // const [chatId, setChatId] = useState<Id<ChatTableName> | undefined>(
  //   initialChatId
  // );
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
    id: initialChatId,
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
  }, [initialChatId]);

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
    if (!updateChatTitle || hasUpdatedTitleRef.current || !initialChatId)
      return;

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
        await updateChatTitle({ id: initialChatId, title: newTitle });
        hasUpdatedTitleRef.current = true;
      } catch (err) {
        console.error("Failed to update chat title:", err);
      }
    };

    updateTitle();
  }, [messages, initialChatId, updateChatTitle]);

  // Save new messages to Convex
  useEffect(() => {
    // ⚠️ Use initialChatId from props, not the deleted state variable.
    const activeChatId = initialChatId;

    // If we have no messages (e.g., initial load) OR no ID yet, skip persistence.
    // The ID will be available after handleSubmit runs and router.replace triggers a re-render.
    if (!messages.length || isSavingRef.current || !activeChatId) return;

    const saveMessages = async () => {
      isSavingRef.current = true;
      try {
        const unsaved = messages.filter((msg) => {
          const fullText = extractMessageText(msg.parts);
          if (!fullText) return false;
          return !savedMessageKeys.current.has(`${msg.role}-${fullText}`);
        });

        if (!unsaved.length) return;

        // activeChatId is guaranteed to exist here

        for (const msg of unsaved) {
          const fullText = extractMessageText(msg.parts);
          if (!fullText) continue;
          const key = `${msg.role}-${fullText}`;

          try {
            // Use the activeChatId which is the prop/URL value
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

    // ⚠️ Update dependencies to use initialChatId instead of the old state
  }, [messages, initialChatId, projectId, storeMessage]); // Removed createChat dependency

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
    async (msg: { text: string; files?: any[] }) => {
      // 1. Basic Validation
      if (!msg.text && !msg.files?.length) return;

      // Use the initial prop value for the current conversation ID
      let idToUse = initialChatId; // <-- Use the prop value

      // 🚨 STEP 2: LAZY CHAT CREATION CHECK 🚨
      if (!idToUse) {
        // Chat ID is missing - this is the first submission!
        try {
          console.log("No Chat ID found. Creating new chat record...");

          // Call the Convex mutation function passed as a prop
          // const title =
          //   fullText.slice(0, 50) + (fullText.length > 50 ? "..." : "");

          const newId = await createChat({
            title: "New Chat",
            projectId: projectId ?? undefined,
            createdAt: Date.now()
          });

          idToUse = newId as Id<ChatTableName>; // Update the ID we will use for the message submission

          // CRUCIAL: Update the URL to include the new ID
          // This ensures persistence and triggers the parent component to re-render
          // with the new valid ID, making it the source of truth.
          router.replace(`/chat/${newId}`);
        } catch (error) {
          console.error("Failed to create new chat ID:", error);
          // Stop execution if the chat creation failed
          return;
        }
      }

      // 3. Determine Model/Provider
      const provider = webSearch
        ? "google"
        : modelMap.get(model)?.provider || "google";

      // 4. Send Message (with guaranteed valid ID)
      sendMessage(
        { text: msg.text, files: msg.files },
        {
          body: {
            // ✅ Use the newly created ID (idToUse) or the existing one
            chatId: idToUse,
            gptId,
            model,
            provider,
            webSearch
          }
        }
      );

      // 5. Clear Input
      setInput("");
    },
    // 6. Dependencies (updated to include new dependencies)
    [
      sendMessage,
      initialChatId,
      model,
      modelMap,
      webSearch,
      createChatApi,
      router,
      setInput
    ]
    // Note: setInput should be added if it's passed from useState in the hook
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
      { body: { initialChatId, model, provider, webSearch } }
    );
  }, [messages, sendMessage, initialChatId, model, modelMap, webSearch]);

  // ✅ Only display messages NOT in initialMessages (avoid duplicates in UI)
  // const displayMessages = useMemo(() => {
  //   return messages.filter((msg) => {
  //     const fullText = extractMessageText(msg.parts);
  //     if (!fullText) return false;
  //     return !initialMessages.some(
  //       (m) => m.role === msg.role && m.content.trim() === fullText
  //     );
  //   });
  // }, [messages, initialMessages]);

  const displayMessages = useMemo(() => {
    return messages
      .map((msg) => {
        const text = extractMessageText(msg.parts);
        if (!text) return null;

        // Keep the AI SDK message shape so UI components (AiMessageList)
        // can read `message.parts` and `message.id` as expected.
        return {
          id: msg.id,
          role: msg.role as "user" | "assistant",
          parts: [{ type: "text", text }]
        };
      })
      .filter(Boolean);
  }, [messages]);

  return {
    initialChatId,
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
