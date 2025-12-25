import { streamText, convertToModelMessages, type LanguageModel } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { resolveGptFromDb } from "@/lib/resolveGpt";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
export const runtime = "nodejs";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
export const maxDuration = 30;

// Initialize AI providers
const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY!
});

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY!
});

export async function POST(req: Request) {
  const { messages, chatId, gptId, model, webSearch, provider, userId } =
    await req.json();

  if (!messages || !Array.isArray(messages)) {
    return new Response(
      JSON.stringify({ error: "messages must be a non-empty array" }),
      { status: 400 }
    );
  }

  console.log(
    `[API] Received ${messages.length} messages for model: ${model}, GPT: ${gptId}`
  );

  // --- STEP 1: Ensure chat exists ---
  let resolvedChatId = chatId;
  if (!resolvedChatId) {
    if (!userId) {
      return new Response(
        JSON.stringify({ error: "userId is required to create a new chat" }),
        { status: 400 }
      );
    }

    const newChat = await convex.mutation(api.chats.createChat, {
      title: "New GPT Chat",
      projectId: undefined, // optional, can omit
      createdAt: Date.now()
    });

    resolvedChatId = newChat._id;
  }

  // --- STEP 2: Resolve GPT config ---
  let systemPrompt = webSearch
    ? "You are a helpful assistant with web search capabilities. Use the search tool when needed."
    : "You are a helpful assistant that can answer questions and help with tasks.";

  let modelName = model?.toLowerCase() ?? "gpt-4o-mini";
  let apiKey: string | undefined;

  if (gptId) {
    const dbGpt = await resolveGptFromDb(gptId);

    if (dbGpt) {
      // systemPrompt = dbGpt.systemPrompt;
      // modelName = dbGpt.model;
      systemPrompt = `[ACTIVE_GPT:${gptId}]\n\n${dbGpt.systemPrompt}`;
      modelName = dbGpt.model.toLowerCase();
      apiKey = dbGpt.apiKey;
    }
  }

  // --- STEP 3: Select AI provider ---
  let selectedModel: LanguageModel;
  if (modelName.includes("gpt") || provider === "openai") {
    selectedModel = createOpenAI({
      apiKey: apiKey ?? process.env.OPENAI_API_KEY!
    })(modelName);
  } else {
    selectedModel = createGoogleGenerativeAI({
      apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY!
    })(modelName);
  }

  // --- STEP 4: Store user messages ---
  for (const m of messages) {
    if (!m.content || !m.role) continue;

    if (m.role === "user") {
      await convex.mutation(api.messages.storeMessage, {
        chatId: resolvedChatId,
        content: m.content,
        role: "user"
      });
    }
  }
  console.log("[GPT RESOLVED]", {
    modelName,
    systemPromptPreview: systemPrompt.slice(0, 80)
  });
  // --- STEP 5: Stream assistant response and save ---
  let assistantText = "";

  const result = streamText({
    model: selectedModel,
    messages: convertToModelMessages(messages),
    system: systemPrompt,
    onFinish: async ({ text }) => {
      assistantText = text;

      await convex.mutation(api.messages.storeMessage, {
        chatId: resolvedChatId,
        content: text,
        role: "assistant",
        gptId
      });
    }
  });

  // --- STEP 6: Return response with chatId in metadata ---
  return result.toUIMessageStreamResponse({
    sendSources: true,
    sendReasoning: true,
    meta: { chatId: resolvedChatId }
  });
}
