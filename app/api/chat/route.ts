import { streamText, type LanguageModel, type ToolSet } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { shouldUseRAG } from "@/lib/ai-optimization";
import { generateChatTitle } from "@/lib/chat-title";
import { buildDeterministicConversationSummary } from "@/lib/conversation-summary";

export const runtime = "nodejs";
export const maxDuration = 60; // ✅ Increase for file processing

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY!
});

const SETTINGS_CACHE_TTL_MS = 30_000;
const RAG_MAX_RESULTS = 4;
const TOOL_TURN_MAX_OUTPUT_TOKENS = 900;
const COMPLEX_TURN_MAX_OUTPUT_TOKENS = 1000;
const NORMAL_TURN_MAX_OUTPUT_TOKENS = 1200;
const SUMMARY_TURN_THRESHOLD = 8;
const SUMMARY_RECENT_WINDOW = 4;
const SUMMARY_MAX_CACHE_AGE_MS = 10 * 60 * 1000;
const IDEMPOTENCY_WINDOW_MS = 10_000;

let generalSettingsCache:
  | {
      value: any;
      expiresAt: number;
    }
  | undefined;

const gptWithDefaultsCache = new Map<
  string,
  {
    value: any;
    expiresAt: number;
  }
>();

const conversationSummaryCache = new Map<
  string,
  {
    summary: string;
    updatedAt: number;
    basedOnCount: number;
  }
>();

const requestIdempotencyStore = new Map<string, { expiresAt: number }>();

async function getCachedGeneralSettings() {
  const now = Date.now();
  if (generalSettingsCache && generalSettingsCache.expiresAt > now) {
    return generalSettingsCache.value;
  }

  const value = await convex.query(api.gpts.getGeneralSettings, {});
  generalSettingsCache = {
    value,
    expiresAt: now + SETTINGS_CACHE_TTL_MS
  };
  return value;
}

async function getCachedGptWithDefaults(gptId: string) {
  const now = Date.now();
  const cached = gptWithDefaultsCache.get(gptId);
  if (cached && cached.expiresAt > now) {
    return cached.value;
  }

  const value = await convex.query(api.gpts.getGptWithDefaults, { gptId });
  gptWithDefaultsCache.set(gptId, {
    value,
    expiresAt: now + SETTINGS_CACHE_TTL_MS
  });
  return value;
}

function findLatestUserMessage(messages: any[]) {
  for (let index = messages.length - 1; index >= 0; index--) {
    if (messages[index]?.role === "user") {
      return messages[index];
    }
  }
  return undefined;
}

function getRecentMessagesWindow(messages: any[], maxMessages = 10) {
  if (!Array.isArray(messages) || messages.length <= maxMessages) {
    return messages;
  }

  const recent = messages.slice(-maxMessages);
  const hasUserMessage = recent.some((message) => message?.role === "user");
  if (hasUserMessage) {
    return recent;
  }

  const latestUserMessage = findLatestUserMessage(messages);
  if (!latestUserMessage) {
    return recent;
  }

  return [...recent.slice(1), latestUserMessage];
}

function getMinimalRollingWindow(messages: any[]) {
  return getRecentMessagesWindow(messages, SUMMARY_RECENT_WINDOW);
}

function normalizeMessagesForModel(messages: any[]) {
  return messages
    .map((message) => {
      const role = message?.role;
      if (role !== "user" && role !== "assistant" && role !== "system") {
        return null;
      }

      const content = extractMessageText(message);
      if (!content) return null;

      return {
        role,
        content
      };
    })
    .filter(Boolean) as Array<{
    role: "user" | "assistant" | "system";
    content: string;
  }>;
}

function extractMessageText(message: any): string {
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
}

function buildMinimalSystemPrompt({
  userSystemPrompt,
  basePrompt,
  gptId,
  hasWebSearch,
  hasFileSearch,
  isSimpleGreeting,
  hasToolsEnabled,
  conversationSummary
}: {
  userSystemPrompt?: string;
  basePrompt: string;
  gptId?: string;
  hasWebSearch: boolean;
  hasFileSearch: boolean;
  isSimpleGreeting: boolean;
  hasToolsEnabled: boolean;
  conversationSummary?: string;
}) {
  let systemPrompt = "";

  if (userSystemPrompt) {
    systemPrompt += `${userSystemPrompt}\n\n`;
  }

  if (gptId) {
    systemPrompt += `[ACTIVE GPT: ${gptId}]\n`;
  }

  systemPrompt += `${basePrompt}\n\n`;
  systemPrompt +=
    "Formatting: respond in Markdown. Use fenced code blocks with language tags when returning code.";

  if (hasWebSearch) {
    systemPrompt += "\nTool: web_search is available when needed.";
  }

  if (hasFileSearch) {
    systemPrompt +=
      "\nTool: file_search is available for uploaded documents when relevant.";
  }

  if (isSimpleGreeting) {
    systemPrompt +=
      "\nLatency mode: for simple greetings, respond immediately with one short friendly sentence and do not use tools.";
  }

  if (hasToolsEnabled) {
    systemPrompt +=
      "\nPerformance mode: provide a concise direct answer first, then brief supporting points. After any tool usage, always return a final user-facing text answer.";
  }

  if (conversationSummary) {
    systemPrompt += `\n\n${conversationSummary}`;
  }

  return systemPrompt;
}

function getCachedConversationSummary(chatId?: string, messageCount?: number) {
  if (!chatId) return "";
  const item = conversationSummaryCache.get(chatId);
  if (!item) return "";

  if (Date.now() - item.updatedAt > SUMMARY_MAX_CACHE_AGE_MS) {
    conversationSummaryCache.delete(chatId);
    return "";
  }

  if (typeof messageCount === "number" && messageCount < item.basedOnCount) {
    conversationSummaryCache.delete(chatId);
    return "";
  }

  return item.summary;
}

function cleanExpiredIdempotencyKeys() {
  const now = Date.now();
  for (const [key, value] of requestIdempotencyStore.entries()) {
    if (value.expiresAt <= now) {
      requestIdempotencyStore.delete(key);
    }
  }
}

function isSimpleGreetingMessage(text: string) {
  const normalized = text.trim().toLowerCase();
  if (!normalized) return false;

  return /^(hi|hello|hey|yo|hola|good\s+morning|good\s+afternoon|good\s+evening)[!.?\s]*$/.test(
    normalized
  );
}

function isLowComplexityMessage(text: string) {
  const normalized = text.trim().toLowerCase();
  if (!normalized) return false;

  const wordCount = normalized.split(/\s+/).filter(Boolean).length;
  const isVeryShort = wordCount <= 8;

  const isSimpleMath =
    /^(what\s+is\s+)?\d+\s*[+\-*/]\s*\d+\??$/.test(normalized) ||
    /^(\d+\s*[+\-*/]\s*\d+)$/.test(normalized);

  const isShortDefinition =
    /^(what\s+is\s+\w+\??|define\s+\w+\??|who\s+is\s+\w+\??)$/.test(normalized);

  return isSimpleMath || (isVeryShort && isShortDefinition);
}

export async function POST(req: Request) {
  try {
    const requestStartedAt = Date.now();

    const idempotencyKey = req.headers.get("x-idempotency-key");
    if (idempotencyKey) {
      cleanExpiredIdempotencyKeys();
      if (requestIdempotencyStore.has(idempotencyKey)) {
        return new Response(JSON.stringify({ error: "Duplicate request" }), {
          status: 409,
          headers: { "Content-Type": "application/json" }
        });
      }

      requestIdempotencyStore.set(idempotencyKey, {
        expiresAt: requestStartedAt + IDEMPOTENCY_WINDOW_MS
      });
    }

    // pre-stream tasks
    // Keep this section minimal so first-token latency is as low as possible.

    // 1) Parse request payload
    const {
      messages,
      chatId,
      gptId,
      model: userSelectedModel,
      webSearch,
      provider,
      systemPrompt: userSystemPrompt
    } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: "messages must be a non-empty array" }),
        { status: 400 }
      );
    }

    // Resolve GPT config with one Convex call for GPT chats
    let resolvedModel: string = "gpt-4o-mini";
    let apiKey: string | undefined;
    let vectorStoreId: string | undefined;
    let ragTriggerKeywords: string[] | undefined;
    let baseSystemPrompt = "You are a helpful assistant.";

    if (gptId) {
      const gptWithDefaults = await getCachedGptWithDefaults(gptId);

      if (gptWithDefaults) {
        baseSystemPrompt =
          gptWithDefaults.combinedSystemPrompt || baseSystemPrompt;
        apiKey = gptWithDefaults.effectiveApiKey;
        vectorStoreId = gptWithDefaults.vectorStoreId;
        ragTriggerKeywords = gptWithDefaults.ragTriggerKeywords;
        resolvedModel =
          userSelectedModel ?? gptWithDefaults.model ?? resolvedModel;
      }
    } else {
      const generalSettings = await getCachedGeneralSettings();
      baseSystemPrompt =
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

    // 3) Build model client
    const openaiClient = createOpenAI({
      apiKey: apiKey
    });

    // Keep only a tiny rolling window pre-stream (do not serialize full history)
    const trimmedMessages = getMinimalRollingWindow(messages);
    const normalizedMessages = normalizeMessagesForModel(trimmedMessages);
    const latestUserMessage = findLatestUserMessage(messages);
    const latestUserText = extractMessageText(latestUserMessage);
    const isSimpleGreeting = isSimpleGreetingMessage(latestUserText);
    const isLowComplexity = isLowComplexityMessage(latestUserText);

    const useRAG =
      !!vectorStoreId && shouldUseRAG(latestUserText, ragTriggerKeywords);
    const hasToolsEnabled = !!(webSearch || useRAG);
    const summaryText = getCachedConversationSummary(chatId, messages.length);

    // 5) Prepare required tools only (still pre-stream when feature-critical)
    let tools: ToolSet | undefined;

    if (webSearch && !isSimpleGreeting && !isLowComplexity) {
      const webEnabledModels = ["gpt-4o", "gpt-4o-mini", "gpt-5-mini"];

      if (!webEnabledModels.includes(resolvedModel.toLowerCase())) {
        console.warn(
          `[AI WARNING] Model "${resolvedModel}" may not support web_search`
        );
      } else {
        tools = {
          web_search: openaiClient.tools.webSearch({})
        } as ToolSet;
      }
    }

    if (useRAG && !isSimpleGreeting && !isLowComplexity) {
      tools = {
        ...tools,
        file_search: openaiClient.tools.fileSearch({
          vectorStoreIds: [vectorStoreId!],
          maxNumResults: RAG_MAX_RESULTS
        })
      } as ToolSet;
    }

    // 6) Build minimal system prompt (pre-stream only)
    const systemPrompt = buildMinimalSystemPrompt({
      userSystemPrompt,
      basePrompt: baseSystemPrompt,
      gptId,
      hasWebSearch: !!webSearch,
      hasFileSearch: !!useRAG,
      isSimpleGreeting,
      hasToolsEnabled,
      conversationSummary: summaryText
    });

    // 7) Select model
    let selectedModel: LanguageModel;
    let effectiveModel = resolvedModel;
    const isComplexTurn = !isSimpleGreeting && !isLowComplexity;

    // Fast-path for greetings: avoid high-latency reasoning models for trivial turns
    if (isSimpleGreeting && resolvedModel.toLowerCase().startsWith("gpt-5")) {
      effectiveModel = "gpt-4o-mini";
    }

    // Fast-path for very low complexity prompts (e.g., "what is 2+2")
    if (
      !useRAG &&
      !webSearch &&
      isLowComplexity &&
      resolvedModel.toLowerCase().startsWith("gpt-5")
    ) {
      effectiveModel = "gpt-4o-mini";
    }

    // Hybrid policy v3:
    // - Preserve admin-selected model for complex non-tool turns.
    // - Use gpt-4o-mini for tool-enabled turns to reduce hidden reasoning token burn
    //   and improve reliability of final visible text output in UI.
    if (hasToolsEnabled) {
      effectiveModel = "gpt-4o-mini";
    }

    if (
      (effectiveModel.toLowerCase() ?? "").includes("gpt") ||
      provider === "openai"
    ) {
      selectedModel = openaiClient(effectiveModel);
    } else {
      selectedModel = google(effectiveModel);
    }

    const preStreamMessages = normalizedMessages;

    const modelMessages = preStreamMessages.map((message) => ({
      role: message.role,
      content: message.content
    }));
    const preStreamDoneAt = Date.now();
    console.log("[PERF] pre-stream", {
      t_pre_stream_ms: preStreamDoneAt - requestStartedAt,
      messageCount: preStreamMessages.length,
      inputMessageCount: messages.length,
      hasTools: !!tools,
      hasToolsEnabled,
      isSimpleGreeting,
      isLowComplexity,
      isComplexTurn,
      effectiveModel,
      resolvedModel,
      preservedAdminModel: effectiveModel === resolvedModel
    });

    // streaming starts here
    let firstChunkAt: number | null = null;
    const streamStartedAt = Date.now();
    console.log("[PERF] stream-start", {
      t_stream_start_ms: streamStartedAt - requestStartedAt,
      t_from_pre_stream_ms: streamStartedAt - preStreamDoneAt
    });

    const result = streamText({
      model: selectedModel,
      messages: modelMessages,
      system: systemPrompt,
      tools,
      providerOptions:
        effectiveModel.toLowerCase().startsWith("gpt-5") && !tools
          ? {
              openai: {
                reasoningEffort: "minimal"
              }
            }
          : undefined,
      maxRetries: 2,
      maxOutputTokens:
        isSimpleGreeting || isLowComplexity
          ? 120
          : hasToolsEnabled
            ? TOOL_TURN_MAX_OUTPUT_TOKENS
            : isComplexTurn
              ? COMPLEX_TURN_MAX_OUTPUT_TOKENS
              : NORMAL_TURN_MAX_OUTPUT_TOKENS,
      onChunk: () => {
        if (firstChunkAt !== null) return;
        firstChunkAt = Date.now();
        console.log("[PERF] first-chunk", {
          t_first_chunk_ms: firstChunkAt - requestStartedAt,
          t_after_stream_start_ms: firstChunkAt - streamStartedAt
        });
      },
      onFinish: (finishEvent: any) => {
        // ========================= POST-STREAM (non-blocking) =========================
        // This callback runs after generation and should never block first token.
        const finishReason = finishEvent?.finishReason;
        console.log(`[CHAT COMPLETE] Reason: ${finishReason}`);
        const finishedAt = Date.now();
        console.log("[PERF] finish", {
          t_finish_ms: finishedAt - requestStartedAt,
          t_streaming_phase_ms: finishedAt - streamStartedAt,
          t_first_chunk_ms:
            firstChunkAt !== null ? firstChunkAt - requestStartedAt : null
        });

        // Optional assistant persistence can be added here once response text shape
        // is standardized across providers in this project.
      }
    });

    // post-stream tasks
    // Non-essential operations run detached and must never block first token.
    void (async () => {
      try {
        const resolvedChatId = chatId as any;

        // Full persistence handled after stream starts
        const persistenceTask = resolvedChatId
          ? (async () => {
              const persistTasks = preStreamMessages
                .filter((message: any) => message?.role === "user")
                .map((message: any) => {
                  const content = extractMessageText(message);
                  if (!content) return Promise.resolve();
                  return convex.mutation(api.messages.storeMessage, {
                    chatId: resolvedChatId,
                    content,
                    role: "user",
                    gptId
                  });
                });

              await Promise.allSettled(persistTasks);
            })()
          : Promise.resolve();

        // Background title generation (non-blocking; no auth mutation here)
        const titleTask =
          latestUserText && messages.length <= 2
            ? generateChatTitle(
                latestUserText,
                openaiClient("gpt-5-mini")
              ).catch(() => "")
            : Promise.resolve("");

        // Tool setup warm-up / RAG prep after stream starts
        const toolWarmupTask =
          webSearch || useRAG
            ? Promise.resolve().then(() => {
                if (webSearch) {
                  openaiClient.tools.webSearch({});
                }
                if (useRAG && vectorStoreId) {
                  openaiClient.tools.fileSearch({
                    vectorStoreIds: [vectorStoreId],
                    maxNumResults: RAG_MAX_RESULTS
                  });
                }
              })
            : Promise.resolve();

        // Auto-summarize older conversation after stream starts (never blocks first token)
        const summarizeTask =
          resolvedChatId && messages.length >= SUMMARY_TURN_THRESHOLD
            ? Promise.resolve().then(() => {
                const olderMessages = messages.slice(
                  0,
                  Math.max(0, messages.length - SUMMARY_RECENT_WINDOW)
                );
                const summary = buildDeterministicConversationSummary(
                  olderMessages,
                  {
                    maxItems: 10,
                    maxCharsPerItem: 160,
                    maxTotalChars: 1200
                  }
                );

                if (summary) {
                  conversationSummaryCache.set(resolvedChatId, {
                    summary,
                    updatedAt: Date.now(),
                    basedOnCount: messages.length
                  });
                }
              })
            : Promise.resolve();

        await Promise.allSettled([
          persistenceTask,
          titleTask,
          toolWarmupTask,
          summarizeTask
        ]);

        // Analytics/logging post-stream
        console.log("[POST-STREAM TASKS COMPLETE]", {
          gptId: gptId || "None",
          chatId: !!resolvedChatId,
          persistedMessages: preStreamMessages.length,
          webSearch: !!webSearch,
          useRAG,
          summaryApplied: !!summaryText,
          ragMaxResults: useRAG ? RAG_MAX_RESULTS : 0
        });
      } catch (error) {
        console.error("[POST-STREAM TASKS FAILED]", error);
      }
    })();

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
