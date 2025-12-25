"use client";

import { useState, useCallback } from "react";
import { api } from "@/convex/_generated/api";
import { ConvexHttpClient } from "convex/browser";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export function useGptChat(userId: string, projectId?: string) {
  const [chatId, setChatId] = useState<string | null>(null);

  const sendMessage = useCallback(
    async ({
      content,
      gptId,
      model,
      webSearch,
      provider
    }: {
      content: string;
      gptId?: string;
      model: string;
      webSearch?: boolean;
      provider?: string;
    }) => {
      let currentChatId = chatId;

      // Step 1: Create chat if missing
      if (!currentChatId) {
        const newChat = await convex.mutation(api.chats.createChat, {
          userId,
          title: "New GPT Chat",
          projectId: projectId ?? null
        });

        currentChatId = newChat._id;
        setChatId(currentChatId);
      }

      // Step 2: Send user message first
      await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chatId: currentChatId,
          messages: [{ role: "user", content }],
          gptId,
          model,
          webSearch,
          provider
        })
      });

      return currentChatId;
    },
    [chatId, projectId, userId]
  );

  return { chatId, sendMessage, setChatId };
}
