import { streamText, UIMessage, convertToModelMessages } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";

export const maxDuration = 30;

const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY!
});

export async function POST(req: Request) {
  const {
    messages,
    model
  }: {
    messages: UIMessage[];
    model: string;
  } = await req.json();

  const result = streamText({
    model: google(model), // ← Correct usage
    messages: convertToModelMessages(messages),
    system:
      "You are a helpful assistant that can answer questions and help with tasks."
  });

  return result.toUIMessageStreamResponse({
    sendSources: true,
    sendReasoning: true
  });
}
