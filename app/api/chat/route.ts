import {
  streamText,
  convertToModelMessages,
  type LanguageModel,
  type ToolSet
} from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { resolveGptFromDb } from "@/lib/resolveGpt";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { generateChatTitle } from "@/lib/chat-title";
import {
  summarizeSystemPrompt,
  shouldUseRAG,
  trimConversationHistory,
  estimateRequestTokens
} from "@/lib/ai-optimization";

export const runtime = "nodejs";
export const maxDuration = 60; // ✅ Increase for file processing

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY!
});

export async function POST(req: Request) {
  try {
    // ✅ Parse request body as JSON (AI SDK handles file conversion)
    const {
      messages,
      chatId,
      gptId,
      model: userSelectedModel,
      webSearch,
      provider,
      userId,
      systemPrompt: userSystemPrompt
    } = await req.json();

    const isNewChat = !chatId;

    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: "messages must be a non-empty array" }),
        { status: 400 }
      );
    }

    console.log("[API] Received request:", {
      messageCount: messages.length,
      gptId,
      model: userSelectedModel,
      hasFiles: messages.some(
        (m: any) =>
          m.experimental_attachments && m.experimental_attachments.length > 0
      )
    });

    // --- Ensure chat exists ---
    let resolvedChatId = chatId;
    if (!resolvedChatId) {
      if (!userId)
        return new Response(JSON.stringify({ error: "userId is required" }), {
          status: 400
        });

      try {
        const newChat = await convex.mutation(api.chats.createChat, {
          title: "New GPT Chat",
          projectId: undefined,
          createdAt: Date.now()
        });

        resolvedChatId = (newChat as any)._id;
      } catch (error) {
        console.error("Error creating chat:", error);
        return new Response(
          JSON.stringify({ error: "Failed to create chat" }),
          { status: 500 }
        );
      }
    }

    // --- Get General Settings ---
    let generalSettings;
    try {
      generalSettings = await convex.query(api.gpts.getGeneralSettings, {});
    } catch (error) {
      console.error("Error fetching general settings:", error);
      generalSettings = null;
    }

    // --- Resolve GPT from DB with General Settings ---
    let resolvedModel: string = "gpt-4o-mini";
    let apiKey: string | undefined;
    let vectorStoreId: string | undefined;
    let ragTriggerKeywords: string[] | undefined;
    let combinedSystemPrompt = "";

    if (gptId) {
      const dbGpt = await resolveGptFromDb(gptId);

      if (dbGpt) {
        const generalPrompt = generalSettings?.defaultSystemPrompt || "";
        const gptSpecificPrompt = dbGpt.systemPrompt || "";

        if (generalPrompt && gptSpecificPrompt) {
          combinedSystemPrompt = `${generalPrompt}\n\n[ACTIVE GPT: ${gptId}]\n\n${gptSpecificPrompt}`;
        } else if (generalPrompt) {
          combinedSystemPrompt = generalPrompt;
        } else if (gptSpecificPrompt) {
          combinedSystemPrompt = gptSpecificPrompt;
        } else {
          combinedSystemPrompt = "You are a helpful assistant.";
        }

        apiKey = dbGpt.apiKey || generalSettings?.defaultApiKey;
        vectorStoreId = dbGpt.vectorStoreId;
        ragTriggerKeywords = dbGpt.ragTriggerKeywords;
        resolvedModel = userSelectedModel ?? dbGpt.model ?? resolvedModel;

        console.log("[SYSTEM PROMPT BREAKDOWN]", {
          gptId,
          generalPromptLength: generalPrompt.length,
          gptSpecificPromptLength: gptSpecificPrompt.length,
          combinedPromptLength: combinedSystemPrompt.length
        });
      } else {
        combinedSystemPrompt =
          generalSettings?.defaultSystemPrompt ||
          "You are a helpful assistant.";
        apiKey = generalSettings?.defaultApiKey;
        resolvedModel = userSelectedModel ?? resolvedModel;
      }
    } else {
      combinedSystemPrompt =
        generalSettings?.defaultSystemPrompt || "You are a helpful assistant.";
      apiKey = generalSettings?.defaultApiKey;
      resolvedModel = userSelectedModel ?? resolvedModel;
    }

    if (!apiKey) {
      return new Response(
        JSON.stringify({
          error: "No API key configured"
        }),
        { status: 400 }
      );
    }

    if (userSystemPrompt) {
      combinedSystemPrompt = `${userSystemPrompt}\n\n${combinedSystemPrompt}`;
    }

    // --- OPTIMIZE: Compress system prompt (40% token reduction) ---
    const originalPromptLength = combinedSystemPrompt.length;
    combinedSystemPrompt = summarizeSystemPrompt(combinedSystemPrompt);
    const compressedPromptLength = combinedSystemPrompt.length;
    console.log("[PROMPT COMPRESSION]", {
      originalChars: originalPromptLength,
      compressedChars: compressedPromptLength,
      reduction: `${Math.round(((originalPromptLength - compressedPromptLength) / originalPromptLength) * 100)}%`
    });

    // --- OpenAI client with resolved API key ---
    const openaiClient = createOpenAI({
      apiKey: apiKey
    });

    // --- Prepare tools ---
    let tools: ToolSet | undefined;

    // Web search tool
    if (webSearch) {
      const webEnabledModels = ["gpt-4o", "gpt-4o-mini", "gpt-5-mini"];

      if (!webEnabledModels.includes(resolvedModel.toLowerCase())) {
        console.warn(
          `[AI WARNING] Model "${resolvedModel}" may not support web_search`
        );
      } else {
        tools = {
          web_search: openaiClient.tools.webSearch({})
        } as ToolSet;

        if (!combinedSystemPrompt.toLowerCase().includes("web_search")) {
          combinedSystemPrompt +=
            "\nYou have web search capabilities. Use the web_search tool when needed.";
        }
      }
    }

    // --- OPTIMIZE: Conditional RAG - only enable if user query semantically requires documents ---
    const extractMessageText = (message: any): string => {
      if (!message) return "";

      if (typeof message.content === "string") {
        return message.content;
      }

      if (Array.isArray(message.content)) {
        return message.content
          .filter((part: any) => part.type === "text")
          .map((part: any) => part.text)
          .join(" ");
      }

      if (Array.isArray(message.parts)) {
        return message.parts
          .filter((part: any) => part.type === "text")
          .map((part: any) => part.text)
          .join(" ");
      }

      return "";
    };

    const latestUserMessage = messages
      .slice()
      .reverse()
      .find((m: any) => m.role === "user");

    const userMessageText = extractMessageText(latestUserMessage);

    const userMessageWordCount = userMessageText
      ? userMessageText.trim().split(/\s+/).length
      : 0;
    const useRAG =
      vectorStoreId && shouldUseRAG(userMessageText, ragTriggerKeywords);

    console.log("[RAG CHECK]", {
      extractedText: userMessageText,
      wordCount: userMessageWordCount,
      hasVectorStore: !!vectorStoreId,
      useRAG
    });

    // File search tool (if GPT has uploaded PDF AND user query requires it)
    if (useRAG) {
      tools = {
        ...tools,
        file_search: openaiClient.tools.fileSearch({
          vectorStoreIds: [vectorStoreId!] // vectorStoreId is guaranteed non-null by useRAG check
        })
      } as ToolSet;

      if (!combinedSystemPrompt.toLowerCase().includes("file_search")) {
        combinedSystemPrompt +=
          "\nYou have access to uploaded documents via file_search. Use it to retrieve relevant information when needed.";
      }

      console.log(
        "[FILE SEARCH] Conditionally enabled (RAG required by user query)"
      );
    } else if (vectorStoreId) {
      console.log(
        "[FILE SEARCH] Skipped (user query does not require documents)"
      );
    }

    // --- Select model ---
    let selectedModel: LanguageModel;
    if (
      (resolvedModel.toLowerCase() ?? "").includes("gpt") ||
      provider === "openai"
    ) {
      selectedModel = openaiClient(resolvedModel);
    } else {
      selectedModel = google(resolvedModel);
    }

    // --- Store user messages (fire-and-forget to avoid blocking stream) ---
    const userMessagePromises: Promise<any>[] = [];
    for (const m of messages) {
      if (!m.content || !m.role) continue;
      if (m.role === "user") {
        // Extract text content (ignore attachments for now in DB)
        const textContent =
          typeof m.content === "string"
            ? m.content
            : m.content
                ?.filter((part: any) => part.type === "text")
                .map((part: any) => part.text)
                .join(" ") || "";

        if (textContent) {
          // Fire-and-forget: don't await to avoid blocking stream startup
          userMessagePromises.push(
            convex
              .mutation(api.messages.storeMessage, {
                chatId: resolvedChatId,
                content: textContent,
                role: "user",
                gptId
              })
              .catch((error) => {
                console.error("[USER MESSAGE STORE FAILED]", error);
              })
          );
        }
      }
    }

    // Start these in parallel but don't block streaming
    Promise.all(userMessagePromises).catch((error) => {
      console.error("[USER MESSAGE BATCH STORE FAILED]", error);
    });

    // --- Generate chat title asynchronously (only once per chat) ---
    if (isNewChat && resolvedChatId) {
      const firstUserMessage = messages.find((m: any) => m.role === "user");
      const firstUserMessageText = extractMessageText(firstUserMessage);

      if (firstUserMessageText) {
        void generateChatTitle(firstUserMessageText, openaiClient("gpt-5-mini"))
          .then((title) => {
            if (!title || title === "New GPT Chat") return;
            return convex.mutation(api.chats.updateChatTitle, {
              id: resolvedChatId,
              title
            });
          })
          .catch((error) => {
            console.error("[CHAT TITLE] Update failed", error);
          });
      }
    }

    // --- Debug logging ---
    console.log("[GPT CONFIG - Final]", {
      gptId: gptId || "None",
      resolvedModel,
      apiKeySource:
        gptId && apiKey === generalSettings?.defaultApiKey
          ? "General default"
          : gptId
            ? "GPT-specific"
            : "General default",
      hasVectorStore: !!vectorStoreId,
      hasWebSearch: !!webSearch,
      tools: tools ? Object.keys(tools).join(", ") : "None"
    });

    // --- OPTIMIZE: Trim conversation history to stay within token budget ---
    // Keep recent messages, drop old context to prevent hitting token limits
    const trimmedMessages = trimConversationHistory(
      messages as Array<{ role: string; content: any }>,
      2000
    );
    const estimatedTokens = estimateRequestTokens(
      combinedSystemPrompt,
      trimmedMessages
    );
    console.log("[TOKEN BUDGET]", {
      estimatedInputTokens: estimatedTokens,
      messageCount: trimmedMessages.length,
      trimmed: trimmedMessages.length !== messages.length
    });

    const result = streamText({
      model: selectedModel,
      messages: await convertToModelMessages(trimmedMessages as any),
      system: combinedSystemPrompt,
      tools,
      maxRetries: 2,
      maxOutputTokens: 8000, // Prevent runaway generation; must complete before 60s Vercel timeout
      onFinish: ({ finishReason }) => {
        console.log(`[CHAT COMPLETE] Reason: ${finishReason}`);
      }
    });

    // ✅ USE YOUR ORIGINAL (this is fine):
    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error("[CHAT ERROR]", error);

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Chat failed",
        details: error instanceof Error ? error.stack : undefined
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
}
