// import { streamText, UIMessage, convertToModelMessages } from "ai";
// import { createGoogleGenerativeAI } from "@ai-sdk/google";

// export const maxDuration = 30;

// const google = createGoogleGenerativeAI({
//   apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY!
// });

// export async function POST(req: Request) {
//   const {
//     messages,
//     model
//   }: {
//     messages: UIMessage[];
//     model: string;
//   } = await req.json();

//   const result = streamText({
//     model: google(model), // ← Correct usage
//     messages: convertToModelMessages(messages),
//     system:
//       "You are a helpful assistant that can answer questions and help with tasks."
//   });

//   return result.toUIMessageStreamResponse({
//     sendSources: true,
//     sendReasoning: true
//   });
// }

import {
  streamText,
  UIMessage,
  convertToModelMessages,
  LanguageModel // Import LanguageModel type for correct type hinting
} from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai"; // New: Import OpenAI

export const maxDuration = 30;

// 1. Initialize Google AI Client (using GOOGLE_GENERATIVE_AI_API_KEY)
const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY!
});

// 2. Initialize OpenAI Client (using OPENAI_API_KEY)
const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY!
});

export async function POST(req: Request) {
  const {
    messages,
    model // The string passed in from the client (e.g., "gpt-4o" or "gemini-2.5-flash")
  }: {
    messages: UIMessage[];
    model: string;
  } = await req.json();

  let selectedModel: LanguageModel;

  // 3. Logic to select the correct provider based on the model name
  const modelName = model.toLowerCase();

  if (modelName.includes("gpt") || modelName.includes("openai")) {
    // Use OpenAI for models like "gpt-4o" or "gpt-3.5-turbo"
    selectedModel = openai(model);
  } else {
    // Default to Google for models like "gemini-2.5-flash"
    selectedModel = google(model);
  }

  const result = streamText({
    model: selectedModel, // Use the dynamically selected model
    messages: convertToModelMessages(messages),
    system:
      "You are a helpful assistant that can answer questions and help with tasks."
  });

  return result.toUIMessageStreamResponse({
    sendSources: true,
    sendReasoning: true
  });
}
