// import {
//   streamText,
//   convertToModelMessages,
//   type LanguageModel,
//   type ToolSet
// } from "ai";
// import { createGoogleGenerativeAI } from "@ai-sdk/google";
// import { createOpenAI } from "@ai-sdk/openai";
// import { resolveGptFromDb } from "@/lib/resolveGpt";
// import { ConvexHttpClient } from "convex/browser";
// import { api } from "@/convex/_generated/api";

// export const runtime = "nodejs";
// export const maxDuration = 60; // ✅ Increase for file processing

// const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

// const google = createGoogleGenerativeAI({
//   apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY!
// });

// export async function POST(req: Request) {
//   try {
//     // ✅ Parse request body as JSON (AI SDK handles file conversion)
//     const {
//       messages,
//       chatId,
//       gptId,
//       model: userSelectedModel,
//       webSearch,
//       provider,
//       userId,
//       systemPrompt: userSystemPrompt
//     } = await req.json();

//     if (!messages || !Array.isArray(messages)) {
//       return new Response(
//         JSON.stringify({ error: "messages must be a non-empty array" }),
//         { status: 400 }
//       );
//     }

//     console.log("[API] Received request:", {
//       messageCount: messages.length,
//       gptId,
//       model: userSelectedModel,
//       hasFiles: messages.some(
//         (m: any) =>
//           m.experimental_attachments && m.experimental_attachments.length > 0
//       )
//     });

//     // --- Ensure chat exists ---
//     let resolvedChatId = chatId;
//     if (!resolvedChatId) {
//       if (!userId)
//         return new Response(JSON.stringify({ error: "userId is required" }), {
//           status: 400
//         });

//       try {
//         const newChat = await convex.mutation(api.chats.createChat, {
//           title: "New GPT Chat",
//           projectId: undefined,
//           createdAt: Date.now()
//         });

//         resolvedChatId = (newChat as any)._id;
//       } catch (error) {
//         console.error("Error creating chat:", error);
//         return new Response(
//           JSON.stringify({ error: "Failed to create chat" }),
//           { status: 500 }
//         );
//       }
//     }

//     // --- Get General Settings ---
//     let generalSettings;
//     try {
//       generalSettings = await convex.query(api.gpts.getGeneralSettings, {});
//     } catch (error) {
//       console.error("Error fetching general settings:", error);
//       generalSettings = null;
//     }

//     // --- Resolve GPT from DB with General Settings ---
//     let resolvedModel: string = "gpt-4o-mini";
//     let apiKey: string | undefined;
//     let vectorStoreId: string | undefined;
//     let combinedSystemPrompt = "";

//     if (gptId) {
//       const dbGpt = await resolveGptFromDb(gptId);

//       if (dbGpt) {
//         const generalPrompt = generalSettings?.defaultSystemPrompt || "";
//         const gptSpecificPrompt = dbGpt.systemPrompt || "";

//         if (generalPrompt && gptSpecificPrompt) {
//           combinedSystemPrompt = `${generalPrompt}\n\n[ACTIVE GPT: ${gptId}]\n\n${gptSpecificPrompt}`;
//         } else if (generalPrompt) {
//           combinedSystemPrompt = generalPrompt;
//         } else if (gptSpecificPrompt) {
//           combinedSystemPrompt = gptSpecificPrompt;
//         } else {
//           combinedSystemPrompt = "You are a helpful assistant.";
//         }

//         apiKey = dbGpt.apiKey || generalSettings?.defaultApiKey;
//         vectorStoreId = dbGpt.vectorStoreId;
//         resolvedModel = userSelectedModel ?? dbGpt.model ?? resolvedModel;

//         console.log("[SYSTEM PROMPT BREAKDOWN]", {
//           gptId,
//           generalPromptLength: generalPrompt.length,
//           gptSpecificPromptLength: gptSpecificPrompt.length,
//           combinedPromptLength: combinedSystemPrompt.length
//         });
//       } else {
//         combinedSystemPrompt =
//           generalSettings?.defaultSystemPrompt ||
//           "You are a helpful assistant.";
//         apiKey = generalSettings?.defaultApiKey;
//         resolvedModel = userSelectedModel ?? resolvedModel;
//       }
//     } else {
//       combinedSystemPrompt =
//         generalSettings?.defaultSystemPrompt || "You are a helpful assistant.";
//       apiKey = generalSettings?.defaultApiKey;
//       resolvedModel = userSelectedModel ?? resolvedModel;
//     }

//     if (!apiKey) {
//       return new Response(
//         JSON.stringify({
//           error: "No API key configured"
//         }),
//         { status: 400 }
//       );
//     }

//     if (userSystemPrompt) {
//       combinedSystemPrompt = `${userSystemPrompt}\n\n${combinedSystemPrompt}`;
//     }

//     // --- OpenAI client with resolved API key ---
//     const openaiClient = createOpenAI({
//       apiKey: apiKey
//     });

//     // --- Prepare tools ---
//     let tools: ToolSet | undefined;

//     // Web search tool
//     if (webSearch) {
//       const webEnabledModels = ["gpt-4o", "gpt-4o-mini", "gpt-5-mini"];

//       if (!webEnabledModels.includes(resolvedModel.toLowerCase())) {
//         console.warn(
//           `[AI WARNING] Model "${resolvedModel}" may not support web_search`
//         );
//       } else {
//         tools = {
//           web_search: openaiClient.tools.webSearch({})
//         } as ToolSet;

//         if (!combinedSystemPrompt.toLowerCase().includes("web_search")) {
//           combinedSystemPrompt +=
//             "\nYou have web search capabilities. Use the web_search tool when needed.";
//         }
//       }
//     }

//     // File search tool (if GPT has uploaded PDF)
//     if (vectorStoreId) {
//       tools = {
//         ...tools,
//         file_search: openaiClient.tools.fileSearch({
//           vectorStoreIds: [vectorStoreId]
//         })
//       } as ToolSet;

//       if (!combinedSystemPrompt.toLowerCase().includes("file_search")) {
//         combinedSystemPrompt +=
//           "\nYou have access to uploaded documents. Use the file_search tool to retrieve relevant information when answering questions.";
//       }

//       console.log(`[FILE SEARCH] Enabled for vector store: ${vectorStoreId}`);
//     }

//     // --- Select model ---
//     let selectedModel: LanguageModel;
//     if (
//       (resolvedModel.toLowerCase() ?? "").includes("gpt") ||
//       provider === "openai"
//     ) {
//       selectedModel = openaiClient(resolvedModel);
//     } else {
//       selectedModel = google(resolvedModel);
//     }

//     // --- Store user messages ---
//     for (const m of messages) {
//       if (!m.content || !m.role) continue;
//       if (m.role === "user") {
//         // ✅ Extract text content (ignore attachments for now in DB)
//         const textContent =
//           typeof m.content === "string"
//             ? m.content
//             : m.content
//                 ?.filter((part: any) => part.type === "text")
//                 .map((part: any) => part.text)
//                 .join(" ") || "";

//         if (textContent) {
//           await convex.mutation(api.messages.storeMessage, {
//             chatId: resolvedChatId,
//             content: textContent,
//             role: "user",
//             gptId
//           });
//         }
//       }
//     }

//     // --- Debug logging ---
//     console.log("[GPT CONFIG - Final]", {
//       gptId: gptId || "None",
//       resolvedModel,
//       apiKeySource:
//         gptId && apiKey === generalSettings?.defaultApiKey
//           ? "General default"
//           : gptId
//             ? "GPT-specific"
//             : "General default",
//       hasVectorStore: !!vectorStoreId,
//       hasWebSearch: !!webSearch,
//       tools: tools ? Object.keys(tools).join(", ") : "None"
//     });

//     const result = streamText({
//       model: selectedModel,
//       messages: convertToModelMessages(messages),
//       system: combinedSystemPrompt,
//       tools,
//       maxRetries: 2,
//       onFinish: async ({ text, finishReason }) => {
//         console.log(`[CHAT COMPLETE] Reason: ${finishReason}`);

//         await convex.mutation(api.messages.storeMessage, {
//           chatId: resolvedChatId,
//           content: text,
//           role: "assistant",
//           gptId
//         });
//       }
//     });

//     // ✅ USE YOUR ORIGINAL (this is fine):
//     return result.toUIMessageStreamResponse();
//   } catch (error) {
//     console.error("[CHAT ERROR]", error);

//     return new Response(
//       JSON.stringify({
//         error: error instanceof Error ? error.message : "Chat failed",
//         details: error instanceof Error ? error.stack : undefined
//       }),
//       {
//         status: 500,
//         headers: { "Content-Type": "application/json" }
//       }
//     );
//   }
// }

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
import type { Id } from "@/convex/_generated/dataModel";

export const runtime = "nodejs";
export const maxDuration = 60;

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY!
});

// Fire-and-forget — never awaited so it never blocks function termination
function storeMessageNoWait(payload: {
  chatId: Id<"chats">;
  content: string;
  role: "user" | "assistant";
  gptId?: string;
}) {
  convex
    .mutation(api.messages.storeMessage, payload)
    .catch((err) => console.error("[STORE MESSAGE ERROR]", err));
}

// GPT-5 / reasoning model fix:
// The AI SDK stores reasoning "parts" inside assistant messages client-side.
// When that history is replayed, convertToModelMessages sends reasoning items
// to OpenAI's Responses API which rejects them if the pair is incomplete.
// Solution: strip all parts from assistant history and reconstruct from plain text only.
function sanitizeMessagesForReplay(messages: any[]): any[] {
  return messages.map((m) => {
    if (m.role !== "assistant") return m;

    // Pull out plain text — check parts first (AI SDK v4), then content
    let text = "";
    if (Array.isArray(m.parts)) {
      const textPart = m.parts.find((p: any) => p.type === "text");
      text = textPart?.text ?? "";
    }
    if (!text && typeof m.content === "string") {
      text = m.content;
    }
    if (!text && Array.isArray(m.content)) {
      const textPart = m.content.find((p: any) => p.type === "text");
      text = textPart?.text ?? "";
    }

    // Reconstruct a clean assistant message with no reasoning artifacts
    // Keep id and other metadata so convertToModelMessages can sequence correctly
    return {
      ...m,
      content: text || m.content,
      parts: text ? [{ type: "text", text }] : m.parts
    };
  });
}

export async function POST(req: Request) {
  const startTime = Date.now();

  try {
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

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
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

    // Ensure chat exists
    let resolvedChatId = chatId;
    if (!resolvedChatId) {
      if (!userId) {
        return new Response(JSON.stringify({ error: "userId is required" }), {
          status: 400
        });
      }
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

    // Parallelize DB calls
    const [generalSettings, dbGpt] = await Promise.all([
      convex.query(api.gpts.getGeneralSettings, {}).catch((err) => {
        console.error("Error fetching general settings:", err);
        return null;
      }),
      gptId ? resolveGptFromDb(gptId).catch(() => null) : Promise.resolve(null)
    ]);

    // Resolve model, API key, system prompt
    let resolvedModel: string = "gpt-4o-mini";
    let apiKey: string | undefined;
    let vectorStoreId: string | undefined;
    let combinedSystemPrompt = "";

    if (gptId && dbGpt) {
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
        generalSettings?.defaultSystemPrompt || "You are a helpful assistant.";
      apiKey = generalSettings?.defaultApiKey;
      resolvedModel = userSelectedModel ?? resolvedModel;
    }

    if (!apiKey) {
      return new Response(JSON.stringify({ error: "No API key configured" }), {
        status: 400
      });
    }

    if (userSystemPrompt) {
      combinedSystemPrompt = `${userSystemPrompt}\n\n${combinedSystemPrompt}`;
    }

    // OpenAI client
    const openaiClient = createOpenAI({ apiKey });

    // Prepare tools
    let tools: ToolSet | undefined;

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

    // Select model
    let selectedModel: LanguageModel;
    if (
      (resolvedModel.toLowerCase() ?? "").includes("gpt") ||
      provider === "openai"
    ) {
      selectedModel = openaiClient(resolvedModel);
    } else {
      selectedModel = google(resolvedModel);
    }

    // Store only the latest user message, fire-and-forget
    const lastUserMessage = [...messages]
      .reverse()
      .find((m: any) => m.role === "user");
    if (lastUserMessage) {
      const textContent =
        typeof lastUserMessage.content === "string"
          ? lastUserMessage.content
          : Array.isArray(lastUserMessage.content)
            ? lastUserMessage.content
                .filter((p: any) => p.type === "text")
                .map((p: any) => p.text)
                .join(" ")
            : "";
      if (textContent.trim()) {
        storeMessageNoWait({
          chatId: resolvedChatId as Id<"chats">,
          content: textContent,
          role: "user",
          gptId
        });
      }
    }

    console.log("[GPT CONFIG - Final]", {
      gptId: gptId || "None",
      resolvedModel,
      apiKeySource: gptId && dbGpt?.apiKey ? "GPT-specific" : "General default",
      hasVectorStore: !!vectorStoreId,
      hasWebSearch: !!webSearch,
      tools: tools ? Object.keys(tools).join(", ") : "None"
    });

    // DEBUG — log the raw assistant message structure so we can see where reasoning lives
    const assistantMessages = messages.filter(
      (m: any) => m.role === "assistant"
    );
    if (assistantMessages.length > 0) {
      console.log(
        "[DEBUG ASSISTANT MSG KEYS]",
        Object.keys(assistantMessages[0])
      );
      console.log(
        "[DEBUG ASSISTANT MSG]",
        JSON.stringify(assistantMessages[0], null, 2).slice(0, 1000)
      );
    }

    const sanitizedMessages = sanitizeMessagesForReplay(messages);

    const result = streamText({
      model: selectedModel,
      messages: await convertToModelMessages(sanitizedMessages),
      system: combinedSystemPrompt,
      tools,
      maxOutputTokens: 2048, // raised — 2048 was cutting off longer responses
      maxRetries: 1,
      onFinish: ({ text, finishReason }) => {
        const duration = Date.now() - startTime;
        console.log(
          `[CHAT COMPLETE] Reason: ${finishReason} | Duration: ${duration}ms`
        );
        if (text?.trim()) {
          storeMessageNoWait({
            chatId: resolvedChatId as Id<"chats">,
            content: text,
            role: "assistant",
            gptId
          });
        }
      }
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[CHAT ERROR] Duration: ${duration}ms`, error);
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
