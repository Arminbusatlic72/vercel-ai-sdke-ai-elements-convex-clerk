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
 * Key: hash of original prompt, Value: compressed version
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
 * - Preserve unique/complex statements that don't fit patterns
 * - Use fallback if compression is too aggressive
 *
 * @param originalPrompt - Full system prompt (may have duplicative prose)
 * @returns Compressed prompt with same semantics, ~40% fewer tokens
 */
export function summarizeSystemPrompt(originalPrompt: string): string {
  // Check cache
  const cacheKey = hashString(originalPrompt);
  if (PROMPT_COMPRESSION_CACHE.has(cacheKey)) {
    return PROMPT_COMPRESSION_CACHE.get(cacheKey)!;
  }

  // Split into sentences for analysis
  const sentences = originalPrompt
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  if (sentences.length === 0) return originalPrompt;

  const extracted: string[] = [];
  const patternMatched = new Set<number>();

  // Extract key instruction patterns
  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i];
    const lower = sentence.toLowerCase();

    // ROLE detection: "You are a..."
    if (lower.startsWith("you are")) {
      const roleMatch = sentence.match(/you are(?:\s+a)?\s+([^.!?]+)/i);
      if (roleMatch) {
        const role = roleMatch[1].replace(/[,.]$/, "").trim();
        extracted.push(`Role: ${role.split(" ").slice(0, 4).join(" ")}`);
        patternMatched.add(i);
        continue;
      }
    }

    // DIRECTIVE patterns: "Always...", "Never...", "When...", "Should...", "Must..."
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
        .slice(0, 120); // Slightly increased limit
      if (directive.length > 5) {
        extracted.push(`- ${directive}`);
        patternMatched.add(i);
        continue;
      }
    }

    // CAPABILITY statements: "You can...", "You have..."
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

    // BEHAVIORAL patterns
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

  // Add non-pattern sentences that are important (short, unique, not generic filler)
  const otherStatements: string[] = [];
  for (let i = 0; i < sentences.length; i++) {
    if (patternMatched.has(i)) continue;

    const sentence = sentences[i];
    const lower = sentence.toLowerCase();

    // Skip generic fillers
    if (
      sentence.length < 15 ||
      /^(This|That|These|Those|It|They|The user|Your|My|If you|When you|We|Our)\s+/.test(
        sentence
      ) ||
      /^(The|A |An |And|Or|But|However|Therefore)\s+/.test(lower)
    ) {
      continue;
    }

    // Keep substantive statements (between 15-120 chars)
    if (sentence.length >= 15 && sentence.length <= 120) {
      otherStatements.push(sentence);
    }
  }

  // Combine: structured rules + important statements
  let compressed = "";
  if (extracted.length > 0) {
    compressed += extracted.join("\n");
  }
  if (otherStatements.length > 0) {
    if (compressed.length > 0) compressed += "\n\n";
    compressed += otherStatements.slice(0, 5).join(" ");
  }

  // Safety: if compression is too aggressive (< 10% of original), keep original
  if (compressed.length < originalPrompt.length * 0.1) {
    console.log(
      `[COMPRESSION WARNING] Over-aggressive compression (${Math.round((compressed.length / originalPrompt.length) * 100)}%), reverting to original`
    );
    return originalPrompt;
  }

  // If empty result, return original
  if (compressed.length < 10) {
    return originalPrompt;
  }

  // Cache the result
  PROMPT_COMPRESSION_CACHE.set(cacheKey, compressed);

  return compressed;
}

// ============================================================================
// RAG OPTIMIZATION
// ============================================================================

/**
 * SEMANTIC RAG TRIGGER
 *
 * Determines if file_search tool should be enabled based on user message.
 * Uses keyword heuristics (no model call) to avoid latency.
 *
 * Triggers RAG for:
 * - Questions about documents/uploaded content
 * - Search/lookup style queries
 * - Analytical questions over data
 * - Personal profile queries (skills, experience, education, etc.)
 *
 * Skips RAG for:
 * - General conversation
 * - Simple commands
 * - Greeting/small talk
 * - Very short messages (< 3 words)
 *
 * @param userMessage - Latest user message
 * @returns true if RAG (file_search) should be used
 */
export function shouldUseRAG(userMessage: string): boolean {
  const lower = userMessage.toLowerCase();
  const wordCount = userMessage.split(/\s+/).length;

  // Skip RAG for very short messages (likely casual)
  if (wordCount < 3) return false;

  // ===== EXPANDED RAG KEYWORDS =====
  // Document references
  const documentKeywords = [
    "document",
    "pdf",
    "file",
    "uploaded",
    "paper",
    "text",
    "content"
  ];

  // Search/retrieval intents
  const searchKeywords = [
    "search",
    "find",
    "retrieve",
    "look for",
    "look up",
    "locate"
  ];

  // Data extraction/analysis
  const analysisKeywords = [
    "summarize",
    "summary",
    "extract",
    "extract",
    "quote",
    "relevant",
    "mentioned",
    "mentioned in",
    "according to",
    "analyze",
    "analysis"
  ];

  // Personal profile / CV / Resume content
  const profileKeywords = [
    "skills",
    "skill",
    "experience",
    "education",
    "qualification",
    "qualified",
    "background",
    "resume",
    "cv",
    "curriculum",
    "career",
    "job",
    "role",
    "position",
    "employment",
    "history",
    "studied",
    "studied at",
    "worked at",
    "work experience",
    "specialization",
    "expertise",
    "competency"
  ];

  // Combine all keyword groups
  const allKeywords = [
    ...documentKeywords,
    ...searchKeywords,
    ...analysisKeywords,
    ...profileKeywords
  ];

  if (allKeywords.some((kw) => lower.includes(kw))) {
    return true;
  }

  // ===== IMPROVED PATTERNS =====

  // First-person queries about "my" anything (profile queries)
  // e.g., "what are my skills?", "tell me about my experience", "my background"
  if (/\b(my|i)\b/.test(lower) && wordCount >= 4) {
    // Common profile question patterns
    const profilePatterns = [
      /what.*my/i, // "what is my...?", "what are my...?"
      /tell.*my/i, // "tell me about my..."
      /about.*my/i, // "about my..."
      /my.*skill/i, // "my skills"
      /my.*experience/i, // "my experience"
      /my.*background/i, // "my background"
      /my.*education/i, // "my education"
      /am i.*qualified/i // "am i qualified for..."
    ];

    if (profilePatterns.some((pattern) => pattern.test(userMessage))) {
      return true;
    }
  }

  // Analytical / data-driven questions (improved patterns)
  // Note: we avoid overly broad patterns like /what\s+/i to prevent false positives
  // Only match specific question types that indicate document queries
  const analyticalPatterns = [
    /what\s+(information|details|facts|data|qualifications|skills|experience|background|role|positions?|companies?|projects?)/i,
    /how\s+(does|do|is|are)\s+/i,
    /explain\s+/i,
    /compare/i,
    /analyze/i,
    /identify/i,
    /describe/i,
    /tell\s+me\s+(about|more)\s+/i
  ];

  if (analyticalPatterns.some((pattern) => pattern.test(userMessage))) {
    return true;
  }

  // Context: medium-length focused questions often need RAG (8-30 words)
  if (wordCount >= 8 && wordCount <= 30) {
    return true;
  }

  // Default: no RAG
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
