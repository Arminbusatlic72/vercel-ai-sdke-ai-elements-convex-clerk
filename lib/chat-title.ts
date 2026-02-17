import { generateText, type LanguageModel } from "ai";
import { createOpenAI } from "@ai-sdk/openai";

const TITLE_MAX_CHARS = 60;
const TITLE_MIN_WORDS = 3;
const TITLE_MAX_WORDS = 8;
const TITLE_MAX_OUTPUT_TOKENS = 24;

let cachedOpenAIClient: ReturnType<typeof createOpenAI> | null = null;

function getFallbackModel(): LanguageModel | null {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  if (!cachedOpenAIClient) {
    cachedOpenAIClient = createOpenAI({ apiKey });
  }

  return cachedOpenAIClient("gpt-5-mini");
}

function stripTrailingPunctuation(value: string): string {
  return value.replace(/[\s.!?;:,\-–—]+$/g, "");
}

function stripOuterQuotes(value: string): string {
  return value.replace(/^["'`]+|["'`]+$/g, "");
}

function removeEmojis(value: string): string {
  return value.replace(/\p{Extended_Pictographic}/gu, "");
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function clipWords(value: string, maxWords: number): string {
  const words = value.split(/\s+/);
  if (words.length <= maxWords) return value;
  return words.slice(0, maxWords).join(" ");
}

function enforceMaxChars(value: string, maxChars: number): string {
  if (value.length <= maxChars) return value;
  const trimmed = value.slice(0, maxChars);
  return trimmed.replace(/\s+\S*$/, "").trim();
}

function sanitizeTitle(raw: string, fallbackSource: string): string {
  let cleaned = removeEmojis(raw);
  cleaned = stripOuterQuotes(cleaned);
  cleaned = normalizeWhitespace(cleaned);
  cleaned = stripTrailingPunctuation(cleaned);

  if (!cleaned) {
    cleaned = fallbackSource;
  }

  cleaned = clipWords(cleaned, TITLE_MAX_WORDS);
  cleaned = enforceMaxChars(cleaned, TITLE_MAX_CHARS);
  cleaned = stripTrailingPunctuation(cleaned);

  if (!cleaned) return "";

  const wordCount = cleaned.split(/\s+/).length;
  if (wordCount < TITLE_MIN_WORDS) {
    const fallback = clipWords(fallbackSource, TITLE_MAX_WORDS);
    return enforceMaxChars(stripTrailingPunctuation(fallback), TITLE_MAX_CHARS);
  }

  return cleaned;
}

function fallbackTitle(source: string): string {
  let cleaned = normalizeWhitespace(source);
  cleaned = stripTrailingPunctuation(cleaned);
  cleaned = clipWords(cleaned, TITLE_MAX_WORDS);
  cleaned = enforceMaxChars(cleaned, TITLE_MAX_CHARS);
  return cleaned;
}

/**
 * Generate a concise chat title from the first meaningful user message.
 *
 * Rules enforced:
 * - 3-8 words
 * - Max 60 chars
 * - No quotes, emojis, or trailing punctuation
 * - Fragment style (not full sentence)
 */
export async function generateChatTitle(
  firstUserMessage: string,
  model?: LanguageModel
): Promise<string> {
  const input = normalizeWhitespace(firstUserMessage);
  if (!input) return "";

  const titleModel = model ?? getFallbackModel();
  if (!titleModel) return fallbackTitle(input);

  try {
    const { text } = await generateText({
      model: titleModel,
      system:
        "You generate short chat titles. Return a 3-8 word fragment. " +
        "No quotes, no emojis, no trailing punctuation. Plain text only.",
      prompt: `User message: ${input}`,
      maxOutputTokens: TITLE_MAX_OUTPUT_TOKENS,
      temperature: 0.2
    });

    return sanitizeTitle(text, input);
  } catch (error) {
    console.error("[CHAT TITLE] Generation failed", error);
    return fallbackTitle(input);
  }
}
