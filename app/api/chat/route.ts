import {
  streamText,
  generateText,
  convertToModelMessages,
  stepCountIs,
  type LanguageModel,
  type ToolSet
} from "ai";
import { z } from "zod/v4";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { createGroq } from "@ai-sdk/groq";
import { auth } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { shouldUseRAG } from "@/lib/ai-optimization";
import { generateChatTitle } from "@/lib/chat-title";
import { buildDeterministicConversationSummary } from "@/lib/conversation-summary";
import {
  BEGIN_INTERNAL_PROMPT,
  MONTHLY_IMAGE_LIMIT,
  MONTHLY_MESSAGE_LIMIT,
  REQUESTS_PER_HOUR_LIMIT,
  REQUESTS_PER_MINUTE_LIMIT,
  countNewUserMessages,
  extractMessageText,
  getUsageWindowStarts
} from "@/app/api/chat/usage-guard";

export const runtime = "nodejs";
export const maxDuration = 60;

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY!
});

// ─── Constants ───────────────────────────────────────────────────────────────

const SETTINGS_CACHE_TTL_MS = 30_000;
const RAG_MAX_RESULTS = 4;

// Raised from 900 / 1000 / 1200 — previous limits were too tight for
// well-structured markdown responses with code blocks.
const TOOL_TURN_MAX_OUTPUT_TOKENS = 1_500;
const COMPLEX_TURN_MAX_OUTPUT_TOKENS = 2_500;
const NORMAL_TURN_MAX_OUTPUT_TOKENS = 2_000;

const SUMMARY_TURN_THRESHOLD = 8;
const SUMMARY_RECENT_WINDOW = 4;
const SUMMARY_MAX_CACHE_AGE_MS = 10 * 60 * 1_000;
const IDEMPOTENCY_WINDOW_MS = 10_000;
const PERPLEXITY_SEARCH_TIMEOUT_MS = 15_000;
const IMAGE_GENERATION_TIMEOUT_MS = 30_000;
const CLASSIFIER_TIMEOUT_MS = 3_000;
const CLASSIFIER_MAX_OUTPUT_TOKENS = 120;

const PERPLEXITY_RECENCY_SIGNALS =
  /\b(latest|today|this\s+week|recent\s+news|current|right\s+now|just\s+happened|breaking)\b/i;
const PERPLEXITY_EVIDENCE_SIGNALS =
  /\b(sources|citations|scan\s+signals|evidence|cite|references|verify)\b/i;
const IMAGE_GENERATION_SIGNALS =
  /\b(generate\s+an?\s+image|create\s+a\s+visual|storyboard\s+this|visualize|make\s+an?\s+image|draw\s+an?\s+image|create\s+an?\s+image)\b/i;

function shouldUsePerplexitySearch(text: string): boolean {
  if (!text) return false;
  const normalized = text.trim();
  return (
    PERPLEXITY_RECENCY_SIGNALS.test(normalized) ||
    PERPLEXITY_EVIDENCE_SIGNALS.test(normalized)
  );
}

function shouldUseImageGeneration(text: string): boolean {
  if (!text) return false;
  return IMAGE_GENERATION_SIGNALS.test(text.trim());
}

// ─── LLM Intent Classifier ───────────────────────────────────────────────────

interface ClassifierResult {
  tools: string[];
  directResponse: string | null;
  searchQuery: string | null;
  imagePrompt: string | null;
}

const CLASSIFIER_SYSTEM_PROMPT = `Classify the user message. Return ONLY valid JSON, no markdown.

{"tools":[],"directResponse":null,"searchQuery":null,"imagePrompt":null}

tools (pick any from list, or empty):
- perplexity_search → recency words: latest/today/this week/current/breaking, or asks for sources/citations
- image_generation → explicit create/draw/generate/storyboard an image
- web_search → live data: prices, scores, real-time facts
- file_search → references uploaded file/document/PDF

directResponse → short answer string if trivial greeting or simple math/fact, else null
searchQuery → refined search string if perplexity_search active, else null
imagePrompt → detailed DALL-E description if image_generation active, else null`;

async function classifyUserIntent(
  userText: string,
  availableTools: string[],
  model: LanguageModel
): Promise<ClassifierResult | null> {
  if (!userText.trim() || availableTools.length === 0) return null;

  const prompt = `AVAILABLE TOOLS: ${availableTools.join(", ")}\n\nUSER MESSAGE: ${userText}`;

  try {
    const classifierPromise = generateText({
      model,
      system: CLASSIFIER_SYSTEM_PROMPT,
      prompt,
      maxOutputTokens: CLASSIFIER_MAX_OUTPUT_TOKENS,
      providerOptions: {
        openai: { response_format: { type: "json_object" } }
      }
    });

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error("Classifier timeout")),
        CLASSIFIER_TIMEOUT_MS
      )
    );

    const { text } = await Promise.race([classifierPromise, timeoutPromise]);

    console.log("[CLASSIFIER] I/O", {
      model: "llama-3.1-8b-instant",
      prompt: prompt.slice(0, 200),
      rawResponse: text.slice(0, 300)
    });

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.warn(
        "[CLASSIFIER] No JSON found in response:",
        text.slice(0, 200)
      );
      return null;
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return {
      tools: Array.isArray(parsed.tools)
        ? parsed.tools.filter((t: string) => availableTools.includes(t))
        : [],
      directResponse:
        typeof parsed.directResponse === "string"
          ? parsed.directResponse.trim() || null
          : null,
      searchQuery:
        typeof parsed.searchQuery === "string"
          ? parsed.searchQuery.trim() || null
          : null,
      imagePrompt:
        typeof parsed.imagePrompt === "string"
          ? parsed.imagePrompt.trim() || null
          : null
    };
  } catch (error: any) {
    console.warn("[CLASSIFIER] Failed, falling back to regex:", error?.message);
    return null;
  }
}

// ─── In-memory caches ────────────────────────────────────────────────────────
// NOTE: These caches are instance-local and will not persist across cold starts
// on serverless platforms (Vercel). For reliable caching, migrate to a shared
// store such as Upstash Redis. The idempotency store below has the same
// limitation — duplicate requests can slip through on different instances.

let generalSettingsCache: { value: any; expiresAt: number } | undefined;

const gptWithDefaultsCache = new Map<
  string,
  { value: any; expiresAt: number }
>();

const conversationSummaryCache = new Map<
  string,
  { summary: string; updatedAt: number; basedOnCount: number }
>();

const requestIdempotencyStore = new Map<string, { expiresAt: number }>();

// ─── Cache helpers ────────────────────────────────────────────────────────────

async function getCachedGeneralSettings() {
  const now = Date.now();
  if (generalSettingsCache && generalSettingsCache.expiresAt > now) {
    return generalSettingsCache.value;
  }
  const value = await convex.query(api.gpts.getGeneralSettings, {});
  generalSettingsCache = { value, expiresAt: now + SETTINGS_CACHE_TTL_MS };
  return value;
}

async function getCachedGptWithDefaults(gptId: string) {
  const now = Date.now();
  const cached = gptWithDefaultsCache.get(gptId);
  if (cached && cached.expiresAt > now) return cached.value;
  const value = await convex.query(api.gpts.getGptWithDefaults, { gptId });
  gptWithDefaultsCache.set(gptId, {
    value,
    expiresAt: now + SETTINGS_CACHE_TTL_MS
  });
  return value;
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
    if (value.expiresAt <= now) requestIdempotencyStore.delete(key);
  }
}

// ─── Message helpers ──────────────────────────────────────────────────────────

function findLatestUserMessage(messages: any[]) {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i]?.role === "user") return messages[i];
  }
  return undefined;
}

function getRecentMessagesWindow(messages: any[], maxMessages = 10) {
  if (!Array.isArray(messages) || messages.length <= maxMessages)
    return messages;
  const recent = messages.slice(-maxMessages);
  if (recent.some((m) => m?.role === "user")) return recent;
  const latestUser = findLatestUserMessage(messages);
  if (!latestUser) return recent;
  return [...recent.slice(1), latestUser];
}

function getMinimalRollingWindow(messages: any[]) {
  return getRecentMessagesWindow(messages, SUMMARY_RECENT_WINDOW);
}

function normalizeMessagesForModel(messages: any[]) {
  return messages
    .map((message) => {
      const role = message?.role;
      if (role !== "user" && role !== "assistant" && role !== "system")
        return null;
      if (Array.isArray(message?.parts) && message.parts.length > 0) {
        return { role, parts: message.parts };
      }
      if (Array.isArray(message?.content) && message.content.length > 0) {
        return { role, content: message.content };
      }
      const content =
        typeof message?.content === "string"
          ? message.content
          : extractMessageText(message);
      if (!content?.trim()) return null;
      return { role, content };
    })
    .filter(Boolean) as Array<any>;
}

function isSimpleGreetingMessage(text: string) {
  const n = text.trim().toLowerCase();
  if (!n) return false;
  return /^(hi|hello|hey|yo|hola|good\s+morning|good\s+afternoon|good\s+evening)[!.?\s]*$/.test(
    n
  );
}

function isLowComplexityMessage(text: string) {
  const n = text.trim().toLowerCase();
  if (!n) return false;
  const wordCount = n.split(/\s+/).filter(Boolean).length;
  const isSimpleMath =
    /^(what\s+is\s+)?\d+\s*[+\-*/]\s*\d+\??$/.test(n) ||
    /^(\d+\s*[+\-*/]\s*\d+)$/.test(n);
  const isShortDefinition =
    /^(what\s+is\s+\w+\??|define\s+\w+\??|who\s+is\s+\w+\??)$/.test(n);
  return isSimpleMath || (wordCount <= 8 && isShortDefinition);
}

// ─── System prompt builder ────────────────────────────────────────────────────

function buildMinimalSystemPrompt({
  userSystemPrompt,
  basePrompt,
  gptId,
  hasWebSearch,
  hasFileSearch,
  hasPerplexitySearch,
  hasImageGeneration,
  isSimpleGreeting,
  hasToolsEnabled,
  conversationSummary
}: {
  userSystemPrompt?: string;
  basePrompt: string;
  gptId?: string;
  hasWebSearch: boolean;
  hasFileSearch: boolean;
  hasPerplexitySearch: boolean;
  hasImageGeneration: boolean;
  isSimpleGreeting: boolean;
  hasToolsEnabled: boolean;
  conversationSummary?: string;
}) {
  let prompt = "";
  if (userSystemPrompt) prompt += `${userSystemPrompt}\n\n`;
  if (gptId) prompt += `[ACTIVE GPT: ${gptId}]\n`;
  prompt += `${basePrompt}\n\n`;
  prompt +=
    "Formatting: respond in Markdown. Use fenced code blocks with language tags when returning code.";
  if (hasWebSearch) prompt += "\nTool: web_search is available when needed.";
  if (hasFileSearch)
    prompt +=
      "\nTool: file_search is available for uploaded documents when relevant.";
  if (hasPerplexitySearch)
    prompt +=
      "\nTool: perplexity_search is available for live web signals, recent news, and sourced evidence. Use it when the user asks about current events or requests citations. After receiving results, synthesize them into a concise answer with inline source links.";
  if (hasImageGeneration)
    prompt +=
      "\nTool: image_generation is available for creating visuals. Use only when the user explicitly requests image generation. After generating, always provide: the image, a 1-2 line caption, a brief methodology tie-back, and 2-3 next step options for the user.";
  if (isSimpleGreeting)
    prompt +=
      "\nLatency mode: for simple greetings, respond immediately with one short friendly sentence and do not use tools.";
  if (hasToolsEnabled)
    prompt +=
      "\nPerformance mode: provide a concise direct answer first, then brief supporting points. After any tool usage, always return a final user-facing text answer.";
  if (conversationSummary) prompt += `\n\n${conversationSummary}`;
  return prompt;
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  try {
    const requestStartedAt = Date.now();
    const { userId, getToken } = await auth();
    const convexToken =
      (await getToken({ template: "convex" })) ??
      (await getToken()) ??
      undefined;

    if (!userId) {
      return new Response(
        JSON.stringify({ error: "Authentication required" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    // ── Idempotency check ──────────────────────────────────────────────────
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

    // ── 1. Parse request body ──────────────────────────────────────────────
    const {
      messages,
      chatId,
      gptId,
      projectId,
      model: userSelectedModel,
      webSearch,
      usePerplexity,
      imageGeneration,
      provider,
      systemPrompt: userSystemPrompt
    } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: "messages must be a non-empty array" }),
        { status: 400 }
      );
    }
    if (messages.length > 100) {
      return new Response(
        JSON.stringify({ error: "Too many messages in request" }),
        { status: 400 }
      );
    }

    // ── 2. Extract message context (sync — no I/O needed) ──────────────────
    const latestUserMessage = findLatestUserMessage(messages);
    const latestUserText = extractMessageText(latestUserMessage);
    const isBeginTrigger = latestUserText.trim() === "__begin__";
    const isSimpleGreeting = isSimpleGreetingMessage(latestUserText);
    const isLowComplexity = isLowComplexityMessage(latestUserText);

    // ── 3. Fire classifier early (runs in parallel with Convex queries) ────
    // Note: file_search is excluded here because vectorStoreIds aren't resolved
    // yet. The RAG/regex fallback handles file_search independently, so this
    // is a safe omission — classifier still handles the other three tools.
    const groqApiKey = process.env.GROQ_API_KEY;
    if (!groqApiKey) {
      console.warn(
        "[CLASSIFIER] GROQ_API_KEY not configured, skipping classifier"
      );
    }
    const groqClient = groqApiKey ? createGroq({ apiKey: groqApiKey }) : null;

    const earlyClassifierTools: string[] = [];
    if (webSearch) earlyClassifierTools.push("web_search");
    if (usePerplexity) earlyClassifierTools.push("perplexity_search");
    if (imageGeneration) earlyClassifierTools.push("image_generation");

    const shouldRunClassifier =
      !isBeginTrigger &&
      !isSimpleGreeting &&
      !isLowComplexity &&
      earlyClassifierTools.length > 0;

    const classifierStartedAt = Date.now();

    // Deliberately not awaited yet — runs in parallel with Convex queries below
    const classifierPromise: Promise<ClassifierResult | null> =
      shouldRunClassifier && groqClient
        ? classifyUserIntent(
            latestUserText,
            earlyClassifierTools,
            groqClient("llama-3.1-8b-instant")
          )
        : Promise.resolve(null);

    // ── 4. Fire all independent Convex queries in parallel ─────────────────
    // Previously these ran sequentially (up to 4 round-trips before streaming).
    // Now they all race together; the slowest one determines the wait time.
    const [chatResult, gptConfigResult, generalConfigResult, projectResult] =
      await Promise.all([
        chatId && userId
          ? convex.query(api.chats.getChat, { id: chatId, userId })
          : Promise.resolve(null),
        gptId ? getCachedGptWithDefaults(gptId) : Promise.resolve(null),
        !gptId ? getCachedGeneralSettings() : Promise.resolve(null),
        projectId
          ? convex.query(api.project.getProject, { id: projectId })
          : Promise.resolve(null)
      ]);

    // ── 5. Auth check ──────────────────────────────────────────────────────
    if (chatId && userId && !chatResult) {
      return new Response(
        JSON.stringify({ error: "Chat not found or access denied" }),
        { status: 403 }
      );
    }

    // ── 6. Resolve config from parallel query results ──────────────────────
    let resolvedModel = "gpt-4o-mini";
    let apiKey: string | undefined;
    let gptVectorStoreId: string | undefined;
    let projectVectorStoreId: string | undefined;
    let ragTriggerKeywords: string[] | undefined;
    let baseSystemPrompt = "You are a helpful assistant.";

    if (gptId && gptConfigResult) {
      baseSystemPrompt =
        gptConfigResult.combinedSystemPrompt || baseSystemPrompt;
      apiKey = gptConfigResult.effectiveApiKey;
      gptVectorStoreId = gptConfigResult.vectorStoreId;
      ragTriggerKeywords = gptConfigResult.ragTriggerKeywords;
      resolvedModel =
        userSelectedModel ?? gptConfigResult.model ?? resolvedModel;
    } else if (generalConfigResult) {
      baseSystemPrompt =
        generalConfigResult.defaultSystemPrompt ||
        "You are a helpful assistant.";
      apiKey = generalConfigResult.defaultApiKey;
      resolvedModel = userSelectedModel ?? resolvedModel;
    }

    if (projectResult) {
      projectVectorStoreId = projectResult.vectorStoreId;
    }

    if (!apiKey) {
      return new Response(JSON.stringify({ error: "No API key configured" }), {
        status: 400
      });
    }

    // ── 7. Build model client ──────────────────────────────────────────────
    const openaiClient = createOpenAI({ apiKey });

    // ── 8. Prepare messages (sync) ─────────────────────────────────────────
    const trimmedMessages = getMinimalRollingWindow(messages);
    const normalizedMessages = normalizeMessagesForModel(trimmedMessages);

    const ragVectorStoreIds = [gptVectorStoreId, projectVectorStoreId].filter(
      Boolean
    ) as string[];
    const hasAnyRagVectorStore = ragVectorStoreIds.length > 0;

    // ── 9. Await classifier (likely already resolved) ──────────────────────
    const classifierResult = await classifierPromise;

    if (classifierResult) {
      console.log("[CLASSIFIER]", {
        t_ms: Date.now() - classifierStartedAt,
        tools: classifierResult.tools,
        hasDirectResponse: !!classifierResult.directResponse,
        searchQuery: classifierResult.searchQuery?.slice(0, 60) ?? null,
        imagePrompt: classifierResult.imagePrompt?.slice(0, 60) ?? null
      });
    }

    // ── 10. Direct-response short-circuit ──────────────────────────────────
    if (
      classifierResult?.directResponse &&
      classifierResult.tools.length === 0 &&
      !isBeginTrigger
    ) {
      const shortCircuitPrompt = `User asked: "${latestUserText}"\n\nAnswer: ${classifierResult.directResponse}`;

      console.log("[SHORT-CIRCUIT] I/O", {
        model: "gpt-4o-mini",
        prompt: shortCircuitPrompt.slice(0, 200),
        directResponse: classifierResult.directResponse?.slice(0, 200)
      });

      const directResult = streamText({
        model: openaiClient("gpt-4o-mini"),
        system:
          "Deliver the provided answer naturally and concisely. Respond in Markdown when helpful. Do not add information beyond what is given.",
        prompt: shortCircuitPrompt,
        maxOutputTokens: 300
      });

      void (async () => {
        try {
          const resolvedChatId = chatId as any;
          if (
            resolvedChatId &&
            latestUserText &&
            latestUserText !== "__begin__"
          ) {
            await convex.mutation(api.messages.storeMessage, {
              chatId: resolvedChatId,
              content: latestUserText,
              role: "user",
              gptId
            });
          }
        } catch (err) {
          console.error("[SHORT-CIRCUIT POST TASKS FAILED]", err);
        }
      })();

      return directResult.toUIMessageStreamResponse();
    }

    // ── 11. Resolve tool triggers (classifier → regex fallback) ─────────────
    const useRAG =
      !isBeginTrigger &&
      hasAnyRagVectorStore &&
      (shouldUseRAG(latestUserText, ragTriggerKeywords) ||
        (classifierResult?.tools.includes("file_search") ?? false));

    const perplexityTriggered = classifierResult
      ? classifierResult.tools.includes("perplexity_search")
      : !isBeginTrigger &&
        !!usePerplexity &&
        shouldUsePerplexitySearch(latestUserText);

    const imageGenTriggered = classifierResult
      ? classifierResult.tools.includes("image_generation")
      : !isBeginTrigger &&
        !!imageGeneration &&
        shouldUseImageGeneration(latestUserText);

    const hasToolsEnabled = !!(
      webSearch ||
      useRAG ||
      perplexityTriggered ||
      imageGenTriggered
    );
    const summaryText = getCachedConversationSummary(chatId, messages.length);

    const { minuteWindowStart, hourWindowStart, monthlyWindowStart } =
      getUsageWindowStarts();
    const requestedMessageCount = countNewUserMessages(messages);
    const requestedImageCount = imageGenTriggered ? 1 : 0;

    const usageResult = await convex.mutation(api.aiUsage.claimUsage, {
      userId,
      minuteWindow: minuteWindowStart,
      hourWindow: hourWindowStart,
      monthlyWindow: monthlyWindowStart,
      requestedMessageCount,
      requestedImageCount,
      requestedRequestCount: 1,
      limits: {
        requestsPerMinute: REQUESTS_PER_MINUTE_LIMIT,
        requestsPerHour: REQUESTS_PER_HOUR_LIMIT,
        monthlyMessages: MONTHLY_MESSAGE_LIMIT,
        monthlyImages: MONTHLY_IMAGE_LIMIT
      }
    });

    if (usageResult.status === "limit_reached") {
      const limitNames: Record<string, string> = {
        requestsPerMinute: "requests per minute",
        requestsPerHour: "requests per hour",
        monthlyMessages: "monthly messages",
        monthlyImages: "monthly images"
      };
      const retryAfterSeconds = Math.max(
        0,
        Math.ceil(usageResult.retryAfterMs / 1000)
      );
      const systemMessage = `You have reached the ${
        limitNames[usageResult.limitType]
      } limit. Please wait ${retryAfterSeconds} second${
        retryAfterSeconds === 1 ? "" : "s"
      } and try again.`;

      console.warn("[USAGE LIMIT]", usageResult.message);
      return new Response(
        JSON.stringify({
          error: usageResult.message || "Usage limits exceeded",
          systemMessage,
          limitType: usageResult.limitType,
          retryAfterMs: usageResult.retryAfterMs,
          usageSnapshot: {
            minuteRequests: usageResult.minuteRequests,
            hourRequests: usageResult.hourRequests,
            monthlyRequests: usageResult.monthlyRequests,
            monthlyMessages: usageResult.monthlyMessages,
            monthlyImages: usageResult.monthlyImages
          }
        }),
        { status: 429, headers: { "Content-Type": "application/json" } }
      );
    }

    // ── 12. Build tool set ─────────────────────────────────────────────────
    let tools: ToolSet | undefined;

    if (webSearch && !isSimpleGreeting && !isLowComplexity) {
      tools = { web_search: openaiClient.tools.webSearch({}) } as ToolSet;
    }

    if (useRAG && !isSimpleGreeting && !isLowComplexity) {
      tools = {
        ...tools,
        file_search: openaiClient.tools.fileSearch({
          vectorStoreIds: ragVectorStoreIds,
          maxNumResults: RAG_MAX_RESULTS
        })
      } as ToolSet;
    }

    if (perplexityTriggered && !isSimpleGreeting && !isLowComplexity) {
      const perplexityApiKey = process.env.PERPLEXITY_API_KEY;
      if (!perplexityApiKey) {
        console.warn("[PERPLEXITY] PERPLEXITY_API_KEY not configured");
      } else {
        tools = {
          ...tools,
          perplexity_search: {
            description:
              "Search the web for recent information using Perplexity. Use when the user asks about latest news, current events, or requests sources/citations/evidence. Returns structured results with headline, outlet, date, url, and snippet.",
            inputSchema: z.object({
              query: z
                .string()
                .describe("The search query to find recent information about")
            }),
            execute: async ({ query: searchQuery }: { query: string }) => {
              console.log("[PERPLEXITY] Request", {
                model: "sonar",
                query: searchQuery.slice(0, 200)
              });
              try {
                const controller = new AbortController();
                const timeout = setTimeout(
                  () => controller.abort(),
                  PERPLEXITY_SEARCH_TIMEOUT_MS
                );

                const response = await fetch(
                  "https://api.perplexity.ai/chat/completions",
                  {
                    method: "POST",
                    headers: {
                      Authorization: `Bearer ${perplexityApiKey}`,
                      "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                      model: "sonar",
                      messages: [
                        {
                          role: "system",
                          content:
                            "You are a research assistant. Return structured search results. For each result provide: headline, outlet (source name), date (ISO format if available), url, and snippet (1-2 lines). Return up to 5 results as a JSON array."
                        },
                        { role: "user", content: searchQuery }
                      ],
                      search_recency_filter: "month"
                    }),
                    signal: controller.signal
                  }
                );

                clearTimeout(timeout);

                if (!response.ok) {
                  console.error(
                    `[PERPLEXITY] API error: ${response.status} ${response.statusText}`
                  );
                  return {
                    results: [],
                    fallbackMessage:
                      "Live web signals are temporarily unavailable. I will proceed with structured analysis based on current context. You may retry the scan."
                  };
                }

                const data = await response.json();
                const rawContent = data?.choices?.[0]?.message?.content || "";
                const citations: string[] = data?.citations || [];

                let results: Array<{
                  headline: string;
                  outlet: string;
                  date: string;
                  url: string;
                  snippet: string;
                }> = [];

                try {
                  const jsonMatch = rawContent.match(/\[\s*\{[\s\S]*?\}\s*\]/);
                  if (jsonMatch) results = JSON.parse(jsonMatch[0]);
                } catch {
                  // fall through to citations fallback
                }

                if (results.length === 0 && citations.length > 0) {
                  results = citations.slice(0, 5).map((url, i) => ({
                    headline: `Source ${i + 1}`,
                    outlet: new URL(url).hostname.replace("www.", ""),
                    date: "",
                    url,
                    snippet: ""
                  }));
                }

                const finalResults = results.slice(0, 5);
                console.log("[PERPLEXITY] Response", {
                  resultCount: finalResults.length,
                  citationCount: citations.length,
                  summaryPreview: rawContent.slice(0, 200)
                });
                return {
                  results: finalResults,
                  summary: rawContent,
                  fallbackMessage: ""
                };
              } catch (error: any) {
                console.error("[PERPLEXITY] Search failed:", error?.message);
                return {
                  results: [],
                  fallbackMessage:
                    "Live web signals are temporarily unavailable. I will proceed with structured analysis based on current context. You may retry the scan."
                };
              }
            }
          }
        } as ToolSet;
      }
    }

    if (imageGenTriggered && !isSimpleGreeting && !isLowComplexity) {
      tools = {
        ...tools,
        image_generation: {
          description:
            "Generate an image using DALL-E 3. Use only when the user explicitly asks to generate an image, create a visual, storyboard, or visualize something. Returns an image URL and the revised prompt used.",
          inputSchema: z.object({
            prompt: z
              .string()
              .describe("A detailed description of the image to generate")
          }),
          execute: async ({ prompt: imagePrompt }: { prompt: string }) => {
            console.log("[IMAGE GEN] Request", {
              model: "dall-e-3",
              prompt: imagePrompt.slice(0, 200),
              size: "1024x1024",
              quality: "standard"
            });
            try {
              const controller = new AbortController();
              const timeout = setTimeout(
                () => controller.abort(),
                IMAGE_GENERATION_TIMEOUT_MS
              );

              const response = await fetch(
                "https://api.openai.com/v1/images/generations",
                {
                  method: "POST",
                  headers: {
                    Authorization: `Bearer ${apiKey}`,
                    "Content-Type": "application/json"
                  },
                  body: JSON.stringify({
                    model: "dall-e-3",
                    prompt: imagePrompt,
                    n: 1,
                    size: "1024x1024",
                    quality: "standard"
                  }),
                  signal: controller.signal
                }
              );

              clearTimeout(timeout);

              if (!response.ok) {
                const errorBody = await response.text().catch(() => "");
                console.error(
                  `[IMAGE GEN] API error: ${response.status} ${response.statusText}`,
                  errorBody
                );
                if (response.status === 400 && errorBody.includes("safety")) {
                  return {
                    imageUrl: "",
                    revisedPrompt: "",
                    fallbackMessage:
                      "The image request was declined due to content policy. I can help you refine the prompt or provide a safe text-based alternative."
                  };
                }
                return {
                  imageUrl: "",
                  revisedPrompt: "",
                  fallbackMessage:
                    "Image generation is temporarily unavailable. I can provide a detailed text-based storyboard or revised visual prompt."
                };
              }

              const data = await response.json();
              const imageData = data?.data?.[0];

              console.log("[IMAGE GEN] Response", {
                hasUrl: !!imageData?.url,
                revisedPrompt: (imageData?.revised_prompt || "").slice(0, 200)
              });

              return {
                imageUrl: imageData?.url || "",
                revisedPrompt: imageData?.revised_prompt || imagePrompt,
                fallbackMessage: ""
              };
            } catch (error: any) {
              console.error("[IMAGE GEN] Generation failed:", error?.message);
              return {
                imageUrl: "",
                revisedPrompt: "",
                fallbackMessage:
                  "Image generation is temporarily unavailable. I can provide a detailed text-based storyboard or revised visual prompt."
              };
            }
          }
        }
      } as ToolSet;
    }

    // ── 13. Build system prompt ────────────────────────────────────────────
    const systemPrompt = buildMinimalSystemPrompt({
      userSystemPrompt,
      basePrompt: baseSystemPrompt,
      gptId,
      hasWebSearch: !!webSearch,
      hasFileSearch: !!useRAG,
      hasPerplexitySearch: perplexityTriggered,
      hasImageGeneration: imageGenTriggered,
      isSimpleGreeting,
      hasToolsEnabled,
      conversationSummary: summaryText
    });

    // ── 14. Select model ───────────────────────────────────────────────────
    let effectiveModel = resolvedModel;
    const isComplexTurn = !isSimpleGreeting && !isLowComplexity;

    if (isSimpleGreeting && resolvedModel.toLowerCase().startsWith("gpt-5")) {
      effectiveModel = "gpt-4o-mini";
    }
    if (
      !useRAG &&
      !webSearch &&
      isLowComplexity &&
      resolvedModel.toLowerCase().startsWith("gpt-5")
    ) {
      effectiveModel = "gpt-4o-mini";
    }
    // Hybrid policy: use gpt-4o-mini for tool turns to reduce hidden reasoning
    // token burn and improve reliability of final visible text output in UI.
    if (hasToolsEnabled) {
      effectiveModel = "gpt-4o-mini";
    }

    const selectedModel: LanguageModel =
      (effectiveModel.toLowerCase() ?? "").includes("gpt") ||
      provider === "openai"
        ? openaiClient(effectiveModel)
        : google(effectiveModel);

    // ── 15. Prepare model messages ─────────────────────────────────────────
    const preStreamMessages = isBeginTrigger
      ? [
          {
            role: "user",
            parts: [{ type: "text", text: BEGIN_INTERNAL_PROMPT }]
          }
        ]
      : normalizedMessages;

    const messagesForModel = preStreamMessages.map((message: any) => {
      if (Array.isArray(message?.parts)) return message;
      if (!message || message.content === undefined || message.content === null)
        return message;
      if (typeof message.content === "string") {
        return { ...message, parts: [{ type: "text", text: message.content }] };
      }
      if (Array.isArray(message.content)) {
        const parts = message.content
          .map((part: any) => {
            if (typeof part === "string") return { type: "text", text: part };
            if (part?.type === "text" && typeof part?.text === "string")
              return { type: "text", text: part.text };
            return null;
          })
          .filter(Boolean);
        if (parts.length > 0) return { ...message, parts };
      }
      return message;
    });

    const modelMessages = await convertToModelMessages(messagesForModel);

    const preStreamDoneAt = Date.now();
    console.log("[PERF] pre-stream", {
      t_pre_stream_ms: preStreamDoneAt - requestStartedAt,
      messageCount: messagesForModel.length,
      inputMessageCount: messages.length,
      hasTools: !!tools,
      hasToolsEnabled,
      classifierUsed: !!classifierResult,
      classifierTools: classifierResult?.tools ?? [],
      perplexityTriggered,
      imageGenTriggered,
      isSimpleGreeting,
      isLowComplexity,
      isComplexTurn,
      effectiveModel,
      resolvedModel,
      preservedAdminModel: effectiveModel === resolvedModel
    });

    const maxOutputTokens =
      isSimpleGreeting || isLowComplexity
        ? 120
        : hasToolsEnabled
          ? TOOL_TURN_MAX_OUTPUT_TOKENS
          : isComplexTurn
            ? COMPLEX_TURN_MAX_OUTPUT_TOKENS
            : NORMAL_TURN_MAX_OUTPUT_TOKENS;

    console.log("[MAIN STREAM] I/O config", {
      model: effectiveModel,
      systemPromptPreview: systemPrompt.slice(0, 200),
      userMessagePreview: latestUserText.slice(0, 200),
      toolNames: tools ? Object.keys(tools) : [],
      maxOutputTokens
    });

    // ── 16. Stream ─────────────────────────────────────────────────────────
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
      stopWhen: hasToolsEnabled ? stepCountIs(3) : stepCountIs(1),
      providerOptions:
        effectiveModel.toLowerCase().startsWith("gpt-5") && !tools
          ? { openai: { reasoningEffort: "minimal" } }
          : undefined,
      maxRetries: 2,
      maxOutputTokens,
      onChunk: () => {
        if (firstChunkAt !== null) return;
        firstChunkAt = Date.now();
        console.log("[PERF] first-chunk", {
          t_first_chunk_ms: firstChunkAt - requestStartedAt,
          t_after_stream_start_ms: firstChunkAt - streamStartedAt
        });
      },
      onFinish: (finishEvent: any) => {
        const finishReason = finishEvent?.finishReason;
        const responseText = finishEvent?.text ?? "";
        const usage = finishEvent?.usage;
        console.log(`[CHAT COMPLETE] Reason: ${finishReason}`);
        console.log("[MAIN STREAM] Response", {
          model: effectiveModel,
          finishReason,
          responsePreview: responseText.slice(0, 300),
          responseLength: responseText.length,
          promptTokens: usage?.promptTokens ?? null,
          completionTokens: usage?.completionTokens ?? null,
          totalTokens: usage?.totalTokens ?? null
        });
        const finishedAt = Date.now();
        console.log("[PERF] finish", {
          t_finish_ms: finishedAt - requestStartedAt,
          t_streaming_phase_ms: finishedAt - streamStartedAt,
          t_first_chunk_ms:
            firstChunkAt !== null ? firstChunkAt - requestStartedAt : null
        });
      }
    });

    // ── 17. Post-stream background tasks ──────────────────────────────────
    // chatResult is reused here — no second Convex query needed.
    void (async () => {
      try {
        const resolvedChatId = chatId as any;

        const persistenceTask = resolvedChatId
          ? (async () => {
              const tasks = preStreamMessages
                .filter((m: any) => m?.role === "user")
                .map((m: any) => {
                  const content = extractMessageText(m);
                  if (!content) return Promise.resolve();
                  if (content.trim() === "__begin__") return Promise.resolve();
                  if (content.trim() === BEGIN_INTERNAL_PROMPT)
                    return Promise.resolve();
                  return convex.mutation(api.messages.storeMessage, {
                    chatId: resolvedChatId,
                    content,
                    role: "user",
                    gptId
                  });
                });
              await Promise.allSettled(tasks);
            })()
          : Promise.resolve();

        // Reuse chatResult fetched earlier — avoids a second getChat query
        const existingTitle =
          typeof chatResult?.title === "string" ? chatResult.title.trim() : "";

        const hasPlaceholderTitle =
          /^new(?:\s.+)?\schat$/i.test(existingTitle) ||
          existingTitle.toLowerCase() === "new chat";

        const initialMessageTitleFromLatest =
          latestUserText.slice(0, 50) +
          (latestUserText.length > 50 ? "..." : "");

        const normalizedExistingTitle = existingTitle.toLowerCase();
        const normalizedLatestUserText = latestUserText.trim().toLowerCase();

        const looksLikeTruncatedInitialTitle =
          existingTitle.length >= 20 &&
          existingTitle.length <= 60 &&
          !!normalizedLatestUserText &&
          normalizedLatestUserText.startsWith(normalizedExistingTitle);

        const hasInitialMessageTitle =
          existingTitle === initialMessageTitleFromLatest ||
          looksLikeTruncatedInitialTitle;

        const nonBeginUserMessageCount = (messages || []).filter(
          (m: any) =>
            m?.role === "user" &&
            extractMessageText(m).trim() !== "__begin__" &&
            extractMessageText(m).trim() !== BEGIN_INTERNAL_PROMPT
        ).length;

        const titleTask =
          (hasPlaceholderTitle || hasInitialMessageTitle) &&
          latestUserText &&
          nonBeginUserMessageCount === 1 &&
          !isBeginTrigger
            ? generateChatTitle(latestUserText, openaiClient("gpt-4o-mini"))
                .then((title) => {
                  console.log("[TITLE GEN] I/O", {
                    model: "gpt-4o-mini",
                    inputPreview: latestUserText.slice(0, 120),
                    generatedTitle: title
                  });
                  return title;
                })
                .catch((err) => {
                  console.error("[TITLE GEN] Failed", err?.message);
                  return "";
                })
            : Promise.resolve("");

        const titlePersistenceTask = resolvedChatId
          ? titleTask.then(async (generatedTitle) => {
              const nextTitle =
                typeof generatedTitle === "string" ? generatedTitle.trim() : "";
              if (!nextTitle || !convexToken) return;
              const authedConvex = new ConvexHttpClient(
                process.env.NEXT_PUBLIC_CONVEX_URL!,
                { auth: convexToken }
              );
              await authedConvex.mutation(api.chats.updateChatTitle, {
                id: resolvedChatId,
                title: nextTitle
              });
            })
          : Promise.resolve();

        const toolWarmupTask =
          webSearch || useRAG
            ? Promise.resolve().then(() => {
                if (webSearch) openaiClient.tools.webSearch({});
                if (useRAG && ragVectorStoreIds.length > 0) {
                  openaiClient.tools.fileSearch({
                    vectorStoreIds: ragVectorStoreIds,
                    maxNumResults: RAG_MAX_RESULTS
                  });
                }
              })
            : Promise.resolve();

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
          titlePersistenceTask,
          toolWarmupTask,
          summarizeTask
        ]);

        console.log("[POST-STREAM TASKS COMPLETE]", {
          gptId: gptId || "None",
          chatId: !!resolvedChatId,
          persistedMessages: preStreamMessages.length,
          webSearch: !!webSearch,
          usePerplexity: perplexityTriggered,
          imageGeneration: imageGenTriggered,
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
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
