// // // import { streamText, convertToModelMessages, type LanguageModel } from "ai";
// // // import { createGoogleGenerativeAI } from "@ai-sdk/google";
// // // import { createOpenAI } from "@ai-sdk/openai";
// // // import { resolveGptFromDb } from "@/lib/resolveGpt";
// // // import { ConvexHttpClient } from "convex/browser";
// // // import { api } from "@/convex/_generated/api";
// // // export const runtime = "nodejs";

// // // const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
// // // export const maxDuration = 30;

// // // // Initialize AI providers
// // // const google = createGoogleGenerativeAI({
// // //   apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY!
// // // });

// // // const openai = createOpenAI({
// // //   apiKey: process.env.OPENAI_API_KEY!
// // // });

// // // export async function POST(req: Request) {
// // //   const { messages, chatId, gptId, model, webSearch, provider, userId } =
// // //     await req.json();

// // //   if (!messages || !Array.isArray(messages)) {
// // //     return new Response(
// // //       JSON.stringify({ error: "messages must be a non-empty array" }),
// // //       { status: 400 }
// // //     );
// // //   }

// // //   console.log(
// // //     `[API] Received ${messages.length} messages for model: ${model}, GPT: ${gptId}, ApIKey `
// // //   );

// // //   // --- STEP 1: Ensure chat exists ---
// // //   let resolvedChatId = chatId;
// // //   if (!resolvedChatId) {
// // //     if (!userId) {
// // //       return new Response(
// // //         JSON.stringify({ error: "userId is required to create a new chat" }),
// // //         { status: 400 }
// // //       );
// // //     }

// // //     const newChat = await convex.mutation(api.chats.createChat, {
// // //       title: "New GPT Chat",
// // //       projectId: undefined, // optional, can omit
// // //       createdAt: Date.now()
// // //     });

// // //     resolvedChatId = newChat._id;
// // //   }

// // //   // --- STEP 2: Resolve GPT config ---
// // //   let systemPrompt = webSearch
// // //     ? "You are a helpful assistant with web search capabilities. Use the search tool when needed."
// // //     : "You are a helpful assistant that can answer questions and help with tasks.";

// // //   let modelName = model?.toLowerCase() ?? "gpt-4o-mini";
// // //   let apiKey: string | undefined;

// // //   if (gptId) {
// // //     const dbGpt = await resolveGptFromDb(gptId);

// // //     if (dbGpt) {
// // //       // systemPrompt = dbGpt.systemPrompt;
// // //       // modelName = dbGpt.model;
// // //       systemPrompt = `[ACTIVE_GPT:${gptId}]\n\n${dbGpt.systemPrompt}`;
// // //       modelName = dbGpt.model.toLowerCase();
// // //       apiKey = dbGpt.apiKey;
// // //     }
// // //   }
// // //   // Create OpenAI client with the GPT's API key (or fallback to server key)
// // //   const openaiClient = createOpenAI({
// // //     apiKey: apiKey ?? process.env.OPENAI_API_KEY!
// // //   });
// // //   // --- STEP 2: Resolve GPT config and OpenAI client ---

// // //   // --- STEP 3: Select AI provider ---
// // //   let selectedModel: LanguageModel;
// // //   if (modelName.includes("gpt") || provider === "openai") {
// // //     selectedModel = createOpenAI({
// // //       apiKey: apiKey ?? process.env.OPENAI_API_KEY!
// // //     })(modelName);
// // //   } else {
// // //     selectedModel = createGoogleGenerativeAI({
// // //       apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY!
// // //     })(modelName);
// // //   }

// // //   // --- STEP 4: Store user messages ---
// // //   for (const m of messages) {
// // //     if (!m.content || !m.role) continue;

// // //     if (m.role === "user") {
// // //       await convex.mutation(api.messages.storeMessage, {
// // //         chatId: resolvedChatId,
// // //         content: m.content,
// // //         role: "user"
// // //       });
// // //     }
// // //   }
// // //   console.log("[GPT RESOLVED]", {
// // //     modelName,
// // //     systemPromptPreview: systemPrompt.slice(0, 80)
// // //   });
// // //   // --- STEP 5: Stream assistant response and save ---
// // //   let assistantText = "";

// // //   const result = streamText({
// // //     model: selectedModel,
// // //     messages: convertToModelMessages(messages),
// // //     system: systemPrompt,
// // //     onFinish: async ({ text }) => {
// // //       assistantText = text;

// // //       await convex.mutation(api.messages.storeMessage, {
// // //         chatId: resolvedChatId,
// // //         content: text,
// // //         role: "assistant",
// // //         gptId
// // //       });
// // //     }
// // //   });

// // //   // --- STEP 6: Return response with chatId in metadata ---
// // //   return result.toUIMessageStreamResponse({
// // //     sendSources: true,
// // //     sendReasoning: true,
// // //     meta: { chatId: resolvedChatId }
// // //   });
// // // }

// // // import {
// // //   streamText,
// // //   convertToModelMessages,
// // //   type LanguageModel,
// // //   type ToolSet
// // // } from "ai";
// // // import { createGoogleGenerativeAI } from "@ai-sdk/google";
// // // import { createOpenAI } from "@ai-sdk/openai";
// // // import { resolveGptFromDb } from "@/lib/resolveGpt";
// // // import { ConvexHttpClient } from "convex/browser";
// // // import { api } from "@/convex/_generated/api";

// // // export const runtime = "nodejs";

// // // const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

// // // const google = createGoogleGenerativeAI({
// // //   apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY!
// // // });
// // // const openai = createOpenAI({
// // //   apiKey: process.env.OPENAI_API_KEY!
// // // });

// // // export async function POST(req: Request) {
// // //   const {
// // //     messages,
// // //     chatId,
// // //     gptId,
// // //     model: userSelectedModel,
// // //     webSearch,
// // //     provider,
// // //     userId,
// // //     systemPrompt
// // //   } = await req.json();

// // //   if (!messages || !Array.isArray(messages)) {
// // //     return new Response(
// // //       JSON.stringify({ error: "messages must be a non-empty array" }),
// // //       { status: 400 }
// // //     );
// // //   }

// // //   // --- Ensure chat exists ---
// // //   let resolvedChatId = chatId;
// // //   if (!resolvedChatId) {
// // //     if (!userId)
// // //       return new Response(JSON.stringify({ error: "userId is required" }), {
// // //         status: 400
// // //       });
// // //     const newChat = await convex.mutation(api.chats.createChat, {
// // //       title: "New GPT Chat",
// // //       projectId: undefined,
// // //       createdAt: Date.now()
// // //     });
// // //     resolvedChatId = newChat._id;
// // //   }

// // //   // --- Resolve GPT from DB ---

// // //   let resolvedModel: string = "gpt-4o-mini";
// // //   let finalSystemPrompt = systemPrompt ?? "You are a helpful assistant.";
// // //   let apiKey: string | undefined;

// // //   if (gptId) {
// // //     const dbGpt = await resolveGptFromDb(gptId);
// // //     if (dbGpt) {
// // //       finalSystemPrompt = `[ACTIVE_GPT:${gptId}]\n\n${dbGpt.systemPrompt}`;
// // //       apiKey = dbGpt.apiKey;
// // //       resolvedModel = userSelectedModel ?? dbGpt.model ?? resolvedModel;
// // //     }
// // //   } else {
// // //     resolvedModel = userSelectedModel ?? resolvedModel;
// // //   }
// // //   // --- OpenAI client ---
// // //   const openaiClient = createOpenAI({
// // //     apiKey: apiKey ?? process.env.OPENAI_API_KEY!
// // //   });

// // //   // --- Prepare tools ---
// // //   let tools: ToolSet | undefined;
// // //   if (webSearch) {
// // //     // Only enable web_search for models that support it
// // //     const webEnabledModels = ["gpt-4o", "gpt-4o-mini", "gpt-5-mini"];

// // //     if (!webEnabledModels.includes(resolvedModel.toLowerCase())) {
// // //       console.warn(
// // //         `[AI WARNING] Model "${resolvedModel}" may not support web_search. Request may fail.`
// // //       );
// // //     } else {
// // //       tools = {
// // //         web_search: openaiClient.tools.webSearch({})
// // //       } as ToolSet;

// // //       // Append web search instructions if not present
// // //       if (!finalSystemPrompt.toLowerCase().includes("web_search")) {
// // //         finalSystemPrompt +=
// // //           "\nYou have web search capabilities. Use the web_search tool when needed.";
// // //       }
// // //     }
// // //   }

// // //   // --- Select model ---
// // //   let selectedModel: LanguageModel;
// // //   if (
// // //     (resolvedModel.toLowerCase() ?? "").includes("gpt") ||
// // //     provider === "openai"
// // //   ) {
// // //     selectedModel = openaiClient(resolvedModel);
// // //   } else {
// // //     selectedModel = google(resolvedModel);
// // //   }

// // //   // --- Store user messages ---
// // //   for (const m of messages) {
// // //     if (!m.content || !m.role) continue;
// // //     if (m.role === "user") {
// // //       await convex.mutation(api.messages.storeMessage, {
// // //         chatId: resolvedChatId,
// // //         content: m.content,
// // //         role: "user"
// // //       });
// // //     }
// // //   }

// // //   // --- Debug logging ---
// // //   console.log("[GPT CONFIG]", {
// // //     gptId,
// // //     resolvedModel,
// // //     finalSystemPrompt,
// // //     webSearch
// // //   });

// // //   // --- Stream assistant response ---
// // //   const result = streamText({
// // //     model: selectedModel,
// // //     messages: convertToModelMessages(messages),
// // //     system: finalSystemPrompt,
// // //     tools,
// // //     onFinish: async ({ text }) => {
// // //       await convex.mutation(api.messages.storeMessage, {
// // //         chatId: resolvedChatId,
// // //         content: text,
// // //         role: "assistant",
// // //         gptId
// // //       });
// // //     }
// // //   });

// // //   return result.toUIMessageStreamResponse({
// // //     sendSources: true,
// // //     sendReasoning: true,
// // //     meta: { chatId: resolvedChatId }
// // //   });
// // // }

// // // import {
// // //   streamText,
// // //   convertToModelMessages,
// // //   type LanguageModel,
// // //   type ToolSet
// // // } from "ai";
// // // import { createGoogleGenerativeAI } from "@ai-sdk/google";
// // // import { createOpenAI } from "@ai-sdk/openai";
// // // import { resolveGptFromDb } from "@/lib/resolveGpt";
// // // import { ConvexHttpClient } from "convex/browser";
// // // import { api } from "@/convex/_generated/api";

// // // export const runtime = "nodejs";

// // // const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

// // // const google = createGoogleGenerativeAI({
// // //   apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY!
// // // });
// // // const openai = createOpenAI({
// // //   apiKey: process.env.OPENAI_API_KEY!
// // // });

// // // export async function POST(req: Request) {
// // //   const {
// // //     messages,
// // //     chatId,
// // //     gptId,
// // //     model: userSelectedModel,
// // //     webSearch,
// // //     provider,
// // //     userId,
// // //     systemPrompt
// // //   } = await req.json();

// // //   if (!messages || !Array.isArray(messages)) {
// // //     return new Response(
// // //       JSON.stringify({ error: "messages must be a non-empty array" }),
// // //       { status: 400 }
// // //     );
// // //   }

// // //   // --- Ensure chat exists ---
// // //   let resolvedChatId = chatId;
// // //   if (!resolvedChatId) {
// // //     if (!userId)
// // //       return new Response(JSON.stringify({ error: "userId is required" }), {
// // //         status: 400
// // //       });
// // //     const newChat = await convex.mutation(api.chats.createChat, {
// // //       title: "New GPT Chat",
// // //       projectId: undefined,
// // //       createdAt: Date.now()
// // //     });
// // //     resolvedChatId = newChat._id;
// // //   }

// // //   // --- Resolve GPT from DB ---
// // //   let resolvedModel: string = "gpt-4o-mini";
// // //   let finalSystemPrompt = systemPrompt ?? "You are a helpful assistant.";
// // //   let apiKey: string | undefined;
// // //   let vectorStoreId: string | undefined; // ✅ Add vector store support
// // //   if (gptId) {
// // //     const dbGpt = await resolveGptFromDb(gptId);
// // //     if (dbGpt) {
// // //       // ✅ Combine admin prompt + GPT prompt
// // //       finalSystemPrompt = `${finalSystemPrompt}\n\n[ACTIVE_GPT:${gptId}]\n\n${dbGpt.systemPrompt}`;
// // //       apiKey = dbGpt.apiKey;
// // //       vectorStoreId = dbGpt.vectorStoreId;
// // //       resolvedModel = userSelectedModel ?? dbGpt.model ?? resolvedModel;
// // //     }
// // //   } else {
// // //     resolvedModel = userSelectedModel ?? resolvedModel;
// // //   }

// // //   // --- OpenAI client ---
// // //   const openaiClient = createOpenAI({
// // //     apiKey: apiKey ?? process.env.OPENAI_API_KEY!
// // //   });

// // //   // --- Prepare tools ---
// // //   let tools: ToolSet | undefined;

// // //   // ✅ Web search tool
// // //   if (webSearch) {
// // //     const webEnabledModels = ["gpt-4o", "gpt-4o-mini", "gpt-5-mini"];

// // //     if (!webEnabledModels.includes(resolvedModel.toLowerCase())) {
// // //       console.warn(
// // //         `[AI WARNING] Model "${resolvedModel}" may not support web_search. Request may fail.`
// // //       );
// // //     } else {
// // //       tools = {
// // //         web_search: openaiClient.tools.webSearch({})
// // //       } as ToolSet;

// // //       if (!finalSystemPrompt.toLowerCase().includes("web_search")) {
// // //         finalSystemPrompt +=
// // //           "\nYou have web search capabilities. Use the web_search tool when needed.";
// // //       }
// // //     }
// // //   }

// // //   // ✅ File search tool (if GPT has uploaded PDF)
// // //   if (vectorStoreId) {
// // //     tools = {
// // //       ...tools, // Preserve web_search if it exists
// // //       file_search: openaiClient.tools.fileSearch({
// // //         vectorStoreIds: [vectorStoreId]
// // //       })
// // //     } as ToolSet;

// // //     if (!finalSystemPrompt.toLowerCase().includes("file_search")) {
// // //       finalSystemPrompt +=
// // //         "\nYou have access to uploaded documents. Use the file_search tool to retrieve relevant information when answering questions.";
// // //     }

// // //     console.log(`[FILE SEARCH] Enabled for vector store: ${vectorStoreId}`);
// // //   }

// // //   // --- Select model ---
// // //   let selectedModel: LanguageModel;
// // //   if (
// // //     (resolvedModel.toLowerCase() ?? "").includes("gpt") ||
// // //     provider === "openai"
// // //   ) {
// // //     selectedModel = openaiClient(resolvedModel);
// // //   } else {
// // //     selectedModel = google(resolvedModel);
// // //   }

// // //   // --- Store user messages ---
// // //   for (const m of messages) {
// // //     if (!m.content || !m.role) continue;
// // //     if (m.role === "user") {
// // //       await convex.mutation(api.messages.storeMessage, {
// // //         chatId: resolvedChatId,
// // //         content: m.content,
// // //         role: "user"
// // //       });
// // //     }
// // //   }

// // //   // --- Debug logging ---
// // //   console.log("[GPT CONFIG]", {
// // //     gptId,
// // //     resolvedModel,
// // //     finalSystemPrompt,
// // //     webSearch,
// // //     fileSearch: !!vectorStoreId,
// // //     vectorStoreId
// // //   });

// // //   // --- Stream assistant response ---
// // //   const result = streamText({
// // //     model: selectedModel,
// // //     messages: convertToModelMessages(messages),
// // //     system: finalSystemPrompt,
// // //     tools,
// // //     onFinish: async ({ text }) => {
// // //       await convex.mutation(api.messages.storeMessage, {
// // //         chatId: resolvedChatId,
// // //         content: text,
// // //         role: "assistant",
// // //         gptId
// // //       });
// // //     }
// // //   });

// // //   return result.toUIMessageStreamResponse({
// // //     sendSources: true,
// // //     sendReasoning: true,
// // //     meta: { chatId: resolvedChatId }
// // //   });
// // // }

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

// const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

// const google = createGoogleGenerativeAI({
//   apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY! // Keep Google API key if needed
// });

// // Helper function to get combined GPT configuration with general settings
// async function getCombinedGptConfig(gptId: string) {
//   try {
//     // Use the getGptWithDefaults query which already combines general settings
//     const gptConfig = await convex.query(api.gpts.getGptWithDefaults, {
//       gptId
//     });
//     return gptConfig;
//   } catch (error) {
//     console.error("Error getting combined GPT config:", error);
//     return null;
//   }
// }

// export async function POST(req: Request) {
//   const {
//     messages,
//     chatId,
//     gptId,
//     model: userSelectedModel,
//     webSearch,
//     provider,
//     userId,
//     systemPrompt: userSystemPrompt
//   } = await req.json();

//   if (!messages || !Array.isArray(messages)) {
//     return new Response(
//       JSON.stringify({ error: "messages must be a non-empty array" }),
//       { status: 400 }
//     );
//   }

//   // --- Ensure chat exists ---
//   let resolvedChatId = chatId;
//   if (!resolvedChatId) {
//     if (!userId)
//       return new Response(JSON.stringify({ error: "userId is required" }), {
//         status: 400
//       });

//     try {
//       const newChat = await convex.mutation(api.chats.createChat, {
//         title: "New GPT Chat",
//         projectId: undefined,
//         createdAt: Date.now()
//       });

//       // Type assertion to get the _id property
//       resolvedChatId = (newChat as any)._id;

//       // Or if you have proper types, you can use:
//       // resolvedChatId = (newChat as { _id: string })._id;
//     } catch (error) {
//       console.error("Error creating chat:", error);
//       return new Response(JSON.stringify({ error: "Failed to create chat" }), {
//         status: 500
//       });
//     }
//   }

//   // --- Get General Settings ---
//   let generalSettings;
//   try {
//     generalSettings = await convex.query(api.gpts.getGeneralSettings, {});
//   } catch (error) {
//     console.error("Error fetching general settings:", error);
//     generalSettings = null;
//   }

//   // --- Resolve GPT from DB with General Settings ---
//   let resolvedModel: string = "gpt-4o-mini";
//   let apiKey: string | undefined;
//   let vectorStoreId: string | undefined;
//   let combinedSystemPrompt = "";

//   if (gptId) {
//     // Get GPT-specific configuration
//     const dbGpt = await resolveGptFromDb(gptId);

//     if (dbGpt) {
//       // Combine general system prompt with GPT-specific prompt
//       const generalPrompt = generalSettings?.defaultSystemPrompt || "";
//       const gptSpecificPrompt = dbGpt.systemPrompt || "";

//       // Build combined prompt properly
//       if (generalPrompt && gptSpecificPrompt) {
//         combinedSystemPrompt = `${generalPrompt}\n\n[ACTIVE GPT: ${gptId}]\n\n${gptSpecificPrompt}`;
//       } else if (generalPrompt) {
//         combinedSystemPrompt = generalPrompt;
//       } else if (gptSpecificPrompt) {
//         combinedSystemPrompt = gptSpecificPrompt;
//       } else {
//         combinedSystemPrompt = "You are a helpful assistant.";
//       }

//       // Priority: GPT-specific API key -> General API key
//       apiKey = dbGpt.apiKey || generalSettings?.defaultApiKey;
//       vectorStoreId = dbGpt.vectorStoreId;
//       resolvedModel = userSelectedModel ?? dbGpt.model ?? resolvedModel;

//       // Log the breakdown for debugging
//       console.log("[SYSTEM PROMPT BREAKDOWN]", {
//         gptId,
//         generalPromptLength: generalPrompt.length,
//         gptSpecificPromptLength: gptSpecificPrompt.length,
//         combinedPromptLength: combinedSystemPrompt.length,
//         generalPromptPreview: generalPrompt.substring(0, 100) + "...",
//         gptPromptPreview: gptSpecificPrompt.substring(0, 100) + "...",
//         combinedPreview: combinedSystemPrompt.substring(0, 150) + "..."
//       });
//     } else {
//       // GPT not found, use general settings only
//       combinedSystemPrompt =
//         generalSettings?.defaultSystemPrompt || "You are a helpful assistant.";
//       apiKey = generalSettings?.defaultApiKey;
//       resolvedModel = userSelectedModel ?? resolvedModel;
//     }
//   } else {
//     // No GPT ID, use only general settings
//     combinedSystemPrompt =
//       generalSettings?.defaultSystemPrompt || "You are a helpful assistant.";
//     apiKey = generalSettings?.defaultApiKey;
//     resolvedModel = userSelectedModel ?? resolvedModel;
//   }

//   // Check if we have an API key
//   if (!apiKey) {
//     return new Response(
//       JSON.stringify({
//         error:
//           "No API key configured. Please set a default API key in admin settings or add a GPT-specific API key."
//       }),
//       { status: 400 }
//     );
//   }

//   // Add user system prompt on top if provided
//   if (userSystemPrompt) {
//     combinedSystemPrompt = `${userSystemPrompt}\n\n${combinedSystemPrompt}`;
//   }

//   // --- OpenAI client with resolved API key ---
//   const openaiClient = createOpenAI({
//     apiKey: apiKey
//   });

//   // --- Prepare tools ---
//   let tools: ToolSet | undefined;

//   // ✅ Web search tool
//   if (webSearch) {
//     const webEnabledModels = ["gpt-4o", "gpt-4o-mini", "gpt-5-mini"];

//     if (!webEnabledModels.includes(resolvedModel.toLowerCase())) {
//       console.warn(
//         `[AI WARNING] Model "${resolvedModel}" may not support web_search. Request may fail.`
//       );
//     } else {
//       tools = {
//         web_search: openaiClient.tools.webSearch({})
//       } as ToolSet;

//       if (!combinedSystemPrompt.toLowerCase().includes("web_search")) {
//         combinedSystemPrompt +=
//           "\nYou have web search capabilities. Use the web_search tool when needed.";
//       }
//     }
//   }

//   // ✅ File search tool (if GPT has uploaded PDF)
//   if (vectorStoreId) {
//     tools = {
//       ...tools, // Preserve web_search if it exists
//       file_search: openaiClient.tools.fileSearch({
//         vectorStoreIds: [vectorStoreId]
//       })
//     } as ToolSet;

//     if (!combinedSystemPrompt.toLowerCase().includes("file_search")) {
//       combinedSystemPrompt +=
//         "\nYou have access to uploaded documents. Use the file_search tool to retrieve relevant information when answering questions.";
//     }

//     console.log(`[FILE SEARCH] Enabled for vector store: ${vectorStoreId}`);
//   }

//   // --- Select model ---
//   let selectedModel: LanguageModel;
//   if (
//     (resolvedModel.toLowerCase() ?? "").includes("gpt") ||
//     provider === "openai"
//   ) {
//     selectedModel = openaiClient(resolvedModel);
//   } else {
//     // For Google models, still need the environment variable
//     selectedModel = google(resolvedModel);
//   }

//   // --- Store user messages ---
//   for (const m of messages) {
//     if (!m.content || !m.role) continue;
//     if (m.role === "user") {
//       await convex.mutation(api.messages.storeMessage, {
//         chatId: resolvedChatId,
//         content: m.content,
//         role: "user",
//         gptId
//       });
//     }
//   }

//   // --- Debug logging ---
//   console.log("[GPT CONFIG - Final]", {
//     gptId: gptId || "None",
//     resolvedModel,
//     apiKeySource:
//       gptId && apiKey === generalSettings?.defaultApiKey
//         ? "General default"
//         : gptId
//           ? "GPT-specific"
//           : "General default",
//     hasGeneralPrompt: !!generalSettings?.defaultSystemPrompt,
//     hasGptPrompt: gptId ? "Yes" : "N/A",
//     finalPromptLength: combinedSystemPrompt.length,
//     finalPromptPreview: combinedSystemPrompt.substring(0, 200) + "...",
//     hasVectorStore: !!vectorStoreId,
//     hasWebSearch: !!webSearch,
//     tools: tools ? Object.keys(tools).join(", ") : "None"
//   });

//   // --- Stream assistant response ---

//   const result = streamText({
//     model: selectedModel,
//     messages: convertToModelMessages(messages),
//     system: combinedSystemPrompt,
//     tools,
//     onFinish: async ({ text }) => {
//       await convex.mutation(api.messages.storeMessage, {
//         chatId: resolvedChatId,
//         content: text,
//         role: "assistant",
//         gptId
//       });
//     }
//   });

//   // Return the stream response WITHOUT meta property
//   return result.toUIMessageStreamResponse();
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
