const GENERIC_DOC_CUES = [
  "document",
  "pdf",
  "section",
  "according to",
  "appendix",
  "exhibit"
];

const STOPWORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "by",
  "for",
  "from",
  "has",
  "have",
  "in",
  "is",
  "it",
  "of",
  "on",
  "or",
  "that",
  "the",
  "this",
  "to",
  "with",
  "your",
  "you",
  "gpt",
  "assistant"
]);

function normalizeToken(token: string): string {
  return token
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "")
    .trim();
}

function extractTokens(text: string): string[] {
  return text
    .split(/\s+/)
    .map(normalizeToken)
    .filter(Boolean)
    .filter((token) => token.length >= 3)
    .filter((token) => !STOPWORDS.has(token));
}

/**
 * Generate deterministic RAG keyword suggestions based on GPT metadata.
 * No model calls, zero latency.
 */
export function generateRagKeywordSuggestions(input: {
  gptId?: string;
  name?: string;
  description?: string;
}): string[] {
  const tokens = new Set<string>();

  if (input.gptId) {
    extractTokens(input.gptId.replace(/-/g, " ")).forEach((t) => tokens.add(t));
  }

  if (input.name) {
    extractTokens(input.name).forEach((t) => tokens.add(t));
  }

  if (input.description) {
    extractTokens(input.description).forEach((t) => tokens.add(t));
  }

  GENERIC_DOC_CUES.forEach((cue) => tokens.add(cue));

  return Array.from(tokens).slice(0, 24);
}
