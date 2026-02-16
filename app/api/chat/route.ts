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

    // File search tool (if GPT has uploaded PDF)
    if (vectorStoreId) {
      tools = {
        ...tools,
        file_search: openaiClient.tools.fileSearch({
          vectorStoreIds: [vectorStoreId]
        })
      } as ToolSet;

      if (!combinedSystemPrompt.toLowerCase().includes("file_search")) {
        combinedSystemPrompt +=
          "\nYou have access to uploaded documents. Use the file_search tool to retrieve relevant information when answering questions.";
      }

      console.log(`[FILE SEARCH] Enabled for vector store: ${vectorStoreId}`);
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

    // --- Store user messages ---
    for (const m of messages) {
      if (!m.content || !m.role) continue;
      if (m.role === "user") {
        // ✅ Extract text content (ignore attachments for now in DB)
        const textContent =
          typeof m.content === "string"
            ? m.content
            : m.content
                ?.filter((part: any) => part.type === "text")
                .map((part: any) => part.text)
                .join(" ") || "";

        if (textContent) {
          await convex.mutation(api.messages.storeMessage, {
            chatId: resolvedChatId,
            content: textContent,
            role: "user",
            gptId
          });
        }
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

    const result = streamText({
      model: selectedModel,
      messages: convertToModelMessages(messages),
      system: combinedSystemPrompt,
      tools,
      maxRetries: 2,
      onFinish: async ({ text, finishReason }) => {
        console.log(`[CHAT COMPLETE] Reason: ${finishReason}`);

        await convex.mutation(api.messages.storeMessage, {
          chatId: resolvedChatId,
          content: text,
          role: "assistant",
          gptId
        });
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
