import { streamText, convertToModelMessages, type LanguageModel } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";

export const maxDuration = 30;

// Initialize AI providers
const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY!
});

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY!
});

export async function POST(req: Request) {
  const {
    messages, // UIMessages from useChat with parts[] format
    model,
    webSearch,
    provider
  } = await req.json();

  console.log(`[API] Received ${messages.length} messages for model: ${model}`);

  // Select the correct model provider
  let selectedModel: LanguageModel;
  const modelName = model.toLowerCase();

  if (modelName.includes("gpt") || provider === "openai") {
    selectedModel = openai(model);
  } else {
    selectedModel = google(model);
  }

  // ✅ CORRECT: Convert UIMessages (with parts[]) to ModelMessages (with content)
  const result = streamText({
    model: selectedModel,
    messages: convertToModelMessages(messages), // This converts UIMessage[] to CoreMessage[]
    system: webSearch
      ? "You are a helpful assistant with web search capabilities. Use the search tool when needed."
      : "You are a helpful assistant that can answer questions and help with tasks."
  });

  return result.toUIMessageStreamResponse({
    sendSources: true,
    sendReasoning: true
  });
}
