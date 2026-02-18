"use client";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useChat } from "@ai-sdk/react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { extractMessageText } from "@/lib/message";
import { preprocessCodeInput } from "@/lib/code-detector";

export interface ModelConfig {
  name: string;
  value: string;
  provider: string;
}

export interface UseAiChatProps {
  chatId?: Id<"chats">;
  gptId?: string;
  projectId?: Id<"projects">;
  initialMessages?: Array<{
    _id: Id<"messages">;
    role: "user" | "assistant";
    content: string;
  }>;
  models: readonly ModelConfig[];
  defaultModel?: string;
}

export function useAiChat({
  gptId,
  chatId: initialChatId,
  projectId,
  initialMessages = [],
  models,
  defaultModel
}: UseAiChatProps) {
  // --- States ---
  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);
  const [chatId, setChatId] = useState<Id<"chats"> | undefined>(initialChatId);
  const [model, setModel] = useState<string>(
    () => defaultModel || models[0]?.value || ""
  );
  const [webSearch, setWebSearch] = useState(false);
  const [initialLoaded, setInitialLoaded] = useState(false);

  // --- Refs ---
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const conversationRef = useRef<HTMLDivElement>(null);
  const savedMessageKeys = useRef(new Set<string>());
  const isSavingRef = useRef(false);

  // --- Convex Mutations ---
  const createChat = useMutation(api.chats.createChat);
  const storeMessage = useMutation(api.messages.storeMessage);
  const updateChatModel = useMutation(api.chats.updateChatModel);

  // --- Memoized Messages ---
  const formattedInitialMessages = useMemo(
    () =>
      initialMessages.map((msg) => ({
        id: msg._id,
        role: msg.role as "user" | "assistant",
        parts: [{ type: "text" as const, text: msg.content }]
      })),
    [initialMessages]
  );

  // --- AI Chat Hook ---
  const { messages, sendMessage, status, setMessages } = useChat();

  useEffect(() => {
    const id = setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
    return () => clearTimeout(id);
  }, []);

  // --- Hydrate initial messages once on mount ---
  useEffect(() => {
    if (!initialLoaded && formattedInitialMessages.length > 0) {
      setMessages(formattedInitialMessages);
      setInitialLoaded(true);
    }
  }, [formattedInitialMessages, initialLoaded, setMessages]);

  // --- Mark initial messages as saved ---
  useEffect(() => {
    savedMessageKeys.current.clear();
    initialMessages.forEach((m) =>
      savedMessageKeys.current.add(`${m.role}-${m.content.trim()}`)
    );
  }, [initialChatId, initialMessages]);

  // --- Save new messages to DB ---
  useEffect(() => {
    if (!messages.length || isSavingRef.current) return;
    const controller = new AbortController();

    const saveMessages = async () => {
      isSavingRef.current = true;
      try {
        const unsaved = messages.filter((msg) => {
          const fullText = extractMessageText(
            msg.parts || [{ type: "text", text: (msg as any).content || "" }]
          );
          if (!fullText) return false;
          const key = `${msg.role}-${fullText}`;
          if (savedMessageKeys.current.has(key)) return false;
          return !(
            msg.role === "assistant" &&
            (status === "streaming" || status === "submitted")
          );
        });

        if (!unsaved.length) return;

        let activeChatId = chatId;
        for (const msg of unsaved) {
          if (controller.signal.aborted) break;

          const fullText = extractMessageText(
            msg.parts || [{ type: "text", text: (msg as any).content || "" }]
          );
          const key = `${msg.role}-${fullText}`;

          if (!activeChatId && msg.role === "user") {
            const title =
              fullText.slice(0, 50) + (fullText.length > 50 ? "..." : "");
            const newId = await createChat({
              title,
              projectId: projectId ?? undefined,
              gptId: gptId ?? undefined,
              createdAt: Date.now()
            });
            activeChatId = newId;
            setChatId(activeChatId);

            // Build URL
            let chatUrl = "/gpt5";
            if (gptId) {
              chatUrl += `/${gptId}`;
              if (projectId) {
                chatUrl += `/project/${projectId}`;
              }
              chatUrl += `/chat/${activeChatId}`;
            } else if (projectId) {
              chatUrl = `/gpt5/project/${projectId}?chatId=${activeChatId}`;
            } else {
              chatUrl = `/gpt5/${activeChatId}`;
            }
            window.history.replaceState(null, "", chatUrl);
          }

          if (activeChatId) {
            await storeMessage({
              chatId: activeChatId,
              content: fullText,
              role: msg.role as "user" | "assistant"
            });
            savedMessageKeys.current.add(key);
          }
        }
      } finally {
        isSavingRef.current = false;
      }
    };

    saveMessages();
    return () => controller.abort();
  }, [messages, status, chatId, createChat, storeMessage, projectId, gptId]);

  // --- Auto-scroll to bottom ---
  useEffect(() => {
    const container = conversationRef.current;
    if (!container) return;
    const isNearBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight <
      150;
    if (isNearBottom || status === "streaming" || status === "submitted") {
      requestAnimationFrame(() => {
        container.scrollTop = container.scrollHeight;
      });
    }
  }, [messages, status]);

  // --- Memoized Models ---
  const { modelMap, groupedModels } = useMemo(() => {
    const map = new Map(models.map((m) => [m.value, m]));
    const groups: Record<string, ModelConfig[]> = {};
    models.forEach((m) => {
      if (!groups[m.provider]) groups[m.provider] = [];
      groups[m.provider].push(m);
    });
    return { modelMap: map, groupedModels: groups };
  }, [models]);

  // --- Handlers ---
  const handleModelChange = useCallback(
    async (value: string) => {
      setModel(value);

      if (chatId) {
        try {
          await updateChatModel({
            chatId,
            model: value
          });
        } catch (err) {
          console.error("Failed to update chat model:", err);
        }
      }
    },
    [chatId, updateChatModel]
  );

  const handleSubmit = useCallback(
    async (msg: { text: string; files?: any[] }) => {
      if (!msg.text.trim() && !msg.files?.length) return;

      // Preprocess text to auto-wrap pasted code in fences
      const codeDetection = preprocessCodeInput(msg.text);
      const processedText = codeDetection.isCode
        ? codeDetection.wrappedText!
        : msg.text;

      let activeChatId = chatId;

      if (!activeChatId) {
        const title =
          processedText.slice(0, 50) + (processedText.length > 50 ? "..." : "");

        const newId = await createChat({
          title,
          projectId: projectId ?? undefined,
          gptId: gptId ?? undefined,
          createdAt: Date.now()
        });

        activeChatId = newId;
        setChatId(activeChatId);

        // Build URL
        let chatUrl = "/gpt5";
        if (gptId) {
          chatUrl += `/${gptId}`;
          if (projectId) {
            chatUrl += `/project/${projectId}`;
          }
          chatUrl += `/chat/${activeChatId}`;
        } else if (projectId) {
          chatUrl = `/gpt5/project/${projectId}?chatId=${activeChatId}`;
        } else {
          chatUrl = `/gpt5/${activeChatId}`;
        }
        window.history.replaceState(null, "", chatUrl);
      }

      const provider = webSearch
        ? "google"
        : modelMap.get(model)?.provider || "google";

      sendMessage(
        { text: processedText, files: msg.files },
        {
          body: {
            chatId: activeChatId,
            gptId,
            model,
            provider,
            webSearch
          }
        }
      );

      setInput("");
      setAttachments([]);
    },
    [
      chatId,
      createChat,
      model,
      modelMap,
      projectId,
      sendMessage,
      webSearch,
      gptId
    ]
  );

  const handleRetry = useCallback(() => {
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    if (!lastUser) return;
    const provider = modelMap.get(model)?.provider || "google";
    sendMessage(
      {
        text: extractMessageText(
          lastUser.parts || [
            { type: "text", text: (lastUser as any).content || "" }
          ]
        )
      },
      { body: { chatId, gptId, model, provider, webSearch } }
    );
  }, [messages, sendMessage, chatId, gptId, model, modelMap, webSearch]);

  return {
    chatId,
    input,
    setInput,

    model,
    setModel: handleModelChange,
    webSearch,
    toggleWebSearch: () => setWebSearch((prev) => !prev),
    handleSubmit,
    handleRetry,
    handleCopy: (text: string) => navigator.clipboard.writeText(text),
    displayMessages: messages,
    groupedModels,
    modelMap,
    inputRef,
    conversationRef,
    status
  };
}
