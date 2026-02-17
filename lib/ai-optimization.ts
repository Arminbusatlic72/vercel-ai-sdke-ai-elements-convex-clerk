/**
 * AI Optimization Layer
 *
 * Reduces token usage, compression time, and API latency without blocking streaming.
 * All functions are synchronous or return cached results.
 */

// ============================================================================
// SYSTEM PROMPT COMPRESSION
// ============================================================================

/**
 * In-memory cache for compressed prompts.
 */
const PROMPT_COMPRESSION_CACHE = new Map<string, string>();

/**
 * Simple string hash for cache keying
 */
function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return `hash_${Math.abs(hash)}`;
}

/**
 * SYSTEM PROMPT COMPRESSION
 *
 * Converts verbose prose system prompts into structured, concise rules.
 * Target: 30-45% token reduction while preserving all critical semantics.
 *
 * Strategy:
 * - Extract explicit instructions (role, directives, capabilities)
 * - Preserve unique/complex statements that do not fit patterns
 * - Use fallback if compression is too aggressive
 */
export function summarizeSystemPrompt(originalPrompt: string): string {
  const cacheKey = hashString(originalPrompt);
  if (PROMPT_COMPRESSION_CACHE.has(cacheKey)) {
    return PROMPT_COMPRESSION_CACHE.get(cacheKey)!;
  }

  const sentences = originalPrompt
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  if (sentences.length === 0) return originalPrompt;

  const extracted: string[] = [];
  const patternMatched = new Set<number>();

  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i];
    const lower = sentence.toLowerCase();

    if (lower.startsWith("you are")) {
      const roleMatch = sentence.match(/you are(?:\s+a)?\s+([^.!?]+)/i);
      if (roleMatch) {
        const role = roleMatch[1].replace(/[,.]$/, "").trim();
        extracted.push(`Role: ${role.split(" ").slice(0, 4).join(" ")}`);
        patternMatched.add(i);
        continue;
      }
    }

    if (
      /^(Always|Never|When|Should|Must|Do not|Don't|Remember|Ensure|Make sure)/i.test(
        sentence
      )
    ) {
      const directive = sentence
        .replace(
          /^(Always|Never|When|Should|Must|Do not|Don't|Remember|Ensure|Make sure)\s+/i,
          ""
        )
        .replace(/([,.])\s+/g, "; ")
        .replace(/\s{2,}/g, " ")
        .slice(0, 120);
      if (directive.length > 5) {
        extracted.push(`- ${directive}`);
        patternMatched.add(i);
        continue;
      }
    }

    if (/^You (can|have|support|will|should)/i.test(sentence)) {
      const capMatch = sentence.match(
        /(?:can|have|support|will|should)\s+([^.!?]+)/i
      );
      if (capMatch) {
        const cap = capMatch[1].replace(/[,.]$/, "").trim();
        if (cap.length > 5 && cap.length < 80) {
          extracted.push(`- ${cap}`);
          patternMatched.add(i);
          continue;
        }
      }
    }

    if (
      /^(Respond|Provide|Answer|Explain|Generate|Consider|Focus|Prioritize)/i.test(
        sentence
      )
    ) {
      const behavior = sentence.slice(0, 100).replace(/\s+/g, " ");
      if (behavior.length > 10 && behavior.length < 100) {
        extracted.push(behavior);
        patternMatched.add(i);
        continue;
      }
    }
  }

  const otherStatements: string[] = [];
  for (let i = 0; i < sentences.length; i++) {
    if (patternMatched.has(i)) continue;

    const sentence = sentences[i];
    const lower = sentence.toLowerCase();

    if (
      sentence.length < 15 ||
      /^(This|That|These|Those|It|They|The user|Your|My|If you|When you|We|Our)\s+/.test(
        sentence
      ) ||
      /^(The|A |An |And|Or|But|However|Therefore)\s+/.test(lower)
    ) {
      continue;
    }

    if (sentence.length >= 15 && sentence.length <= 120) {
      otherStatements.push(sentence);
    }
  }

  let compressed = "";
  if (extracted.length > 0) {
    compressed += extracted.join("\n");
  }
  if (otherStatements.length > 0) {
    if (compressed.length > 0) compressed += "\n\n";
    compressed += otherStatements.slice(0, 5).join(" ");
  }

  if (compressed.length < originalPrompt.length * 0.1) {
    console.log(
      `[COMPRESSION WARNING] Over-aggressive compression (${Math.round((compressed.length / originalPrompt.length) * 100)}%), reverting to original`
    );
    return originalPrompt;
  }

  if (compressed.length < 10) {
    return originalPrompt;
  }

  PROMPT_COMPRESSION_CACHE.set(cacheKey, compressed);

  return compressed;
}

// ============================================================================
// RAG OPTIMIZATION
// ============================================================================

/**
 * Deterministic RAG trigger based on admin keywords, manual overrides,
 * and generic document cues as a fallback.
 */
export function shouldUseRAG(
  userMessage: string,
  ragTriggerKeywords?: string[]
): boolean {
  const normalized = userMessage.toLowerCase().trim();
  if (!normalized) return false;

  const keywordList = (ragTriggerKeywords ?? [])
    .map((kw) => kw.trim().toLowerCase())
    .filter(Boolean);

  if (
    keywordList.length > 0 &&
    keywordList.some((kw) => normalized.includes(kw))
  ) {
    return true;
  }

  const manualOverrides = [
    "from the docs",
    "from the files",
    "from the document",
    "from the pdf",
    "according to the pdf",
    "according to the document"
  ];

  if (manualOverrides.some((phrase) => normalized.includes(phrase))) {
    return true;
  }

  const fallbackDocCues = [
    "document",
    "pdf",
    "file",
    "section",
    "according to"
  ];

  if (fallbackDocCues.some((cue) => normalized.includes(cue))) {
    return true;
  }

  return false;
}

/**
 * CONTEXT COMPRESSION
 *
 * Trims and summarizes retrieved document chunks to reduce token overhead.
 *
 * Strategy:
 * - Limit to top 3–5 chunks
 * - Truncate each chunk to ~300 chars
 * - Remove metadata/timestamps
 * - Join with clear separators
 *
 * @param chunks - Array of retrieved document chunks (from vector store)
 * @returns Compressed context string
 */
export function compressRetrievedContext(chunks: string[]): string {
  if (!chunks || chunks.length === 0) {
    return "";
  }

  // Limit to top 4 chunks (diminishing returns beyond)
  const topChunks = chunks.slice(0, 4);

  // Truncate and clean each chunk
  const processedChunks = topChunks
    .map((chunk) => {
      // Remove common metadata patterns
      let cleaned = chunk
        .replace(/^(Page|Section|Chapter|Source|File|Document):\s+/gm, "")
        .replace(/\[.*?\]\s*/g, "") // Remove [citations]
        .replace(/\{.*?\}\s*/g, "") // Remove {metadata}
        .replace(/\s{2,}/g, " ") // Normalize whitespace
        .trim();

      // Truncate to 300 chars max (roughly 75 tokens)
      if (cleaned.length > 300) {
        cleaned = cleaned.slice(0, 300).split(" ").slice(0, -1).join(" ") + "…";
      }

      return cleaned;
    })
    .filter((chunk) => chunk.length > 10); // Drop empty results

  if (processedChunks.length === 0) {
    return "";
  }

  // Join with clear separators
  return `[Retrieved Context]\n${processedChunks.map((chunk, i) => `${i + 1}. ${chunk}`).join("\n\n")}`;
}

// ============================================================================
// TOKEN BUDGET CONTROL
// ============================================================================

/**
 * Rough token estimation: 1 token ≈ 4 characters
 * (For English text; varies by model/tokenizer)
 */
const CHARS_PER_TOKEN = 4;

/**
 * Estimate token count for a string (safely handles undefined/null)
 */
function estimateTokens(text: string | undefined | null): number {
  if (!text) return 0;
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

/**
 * CONVERSATION HISTORY TRIMMING
 *
 * Keeps the conversation focused by removing old messages when budget exceeded.
 * Strategy:
 * - Always keep the latest user message (current intent)
 * - Always keep latest assistant response (context awareness)
 * - Drop oldest messages first when over budget
 * - Preserve at least 2 exchanges (user + assistant pair)
 *
 * Token budget allocation:
 *   System prompt:    2000 tokens
 *   RAG context:      1500 tokens
 *   Messages:         ~2000 tokens (input budget)
 *   Output buffer:    ~2500 tokens (reserved for generation)
 *   Total ~8000:      stays under GPT max
 *
 * @param messages - All messages in conversation
 * @param maxTokens - Maximum tokens allowed for message history (default 2000)
 * @returns Trimmed message array
 */
export function trimConversationHistory(
  messages: Array<{ role: string; content: string | any }>,
  maxTokens: number = 2000
): Array<{ role: string; content: string | any }> {
  if (!messages || messages.length === 0) {
    return messages;
  }

  // Estimate total tokens for all messages
  const totalTokens = messages.reduce((sum, msg) => {
    if (!msg || !msg.content) return sum; // Skip messages with no content
    const content =
      typeof msg.content === "string"
        ? msg.content
        : JSON.stringify(msg.content);
    return sum + estimateTokens(content);
  }, 0);

  // If under budget, return all messages
  if (totalTokens <= maxTokens) {
    return messages;
  }

  console.log(
    `[TOKEN BUDGET] Trimming messages: ${totalTokens} tokens → ${maxTokens} max`
  );

  // Keep latest 2 messages (last user + last assistant)
  const latestMessages = messages.slice(-2);
  let result = latestMessages;
  let currentTokens = latestMessages.reduce((sum, msg) => {
    const content =
      typeof msg.content === "string"
        ? msg.content
        : JSON.stringify(msg.content);
    return sum + estimateTokens(content);
  }, 0);

  // Add older messages in reverse order (most recent first)
  for (
    let i = messages.length - 3;
    i >= 0 && currentTokens < maxTokens * 0.8;
    i--
  ) {
    const msg = messages[i];
    const content =
      typeof msg.content === "string"
        ? msg.content
        : JSON.stringify(msg.content);
    const msgTokens = estimateTokens(content);

    if (currentTokens + msgTokens <= maxTokens) {
      result.unshift(msg);
      currentTokens += msgTokens;
    } else {
      break;
    }
  }

  console.log(
    `[TOKEN BUDGET] Trimmed from ${messages.length} → ${result.length} messages (${currentTokens} tokens)`
  );

  return result;
}

/**
 * TOKEN BUDGET ESTIMATOR
 *
 * Quick estimate of total token usage for a request.
 * Useful for debugging and monitoring.
 *
 * @param systemPrompt - System prompt
 * @param messages - Messages array
 * @param ragContext - Retrieved context (if any)
 * @returns Estimated total input tokens
 */
export function estimateRequestTokens(
  systemPrompt: string,
  messages: Array<{ role: string; content: string | any }>,
  ragContext: string = ""
): number {
  let total = 0;

  // Safely estimate system prompt
  if (systemPrompt) {
    total += estimateTokens(systemPrompt);
  }

  // Safely estimate each message
  for (const msg of messages) {
    if (!msg || !msg.content) continue; // Skip invalid messages
    const content =
      typeof msg.content === "string"
        ? msg.content
        : JSON.stringify(msg.content);
    total += estimateTokens(content);
  }

  // Safely estimate RAG context
  if (ragContext) {
    total += estimateTokens(ragContext);
  }

  return total;
}
