/**
 * Detects if text contains code and auto-wraps it in markdown code fences
 */

interface CodeDetectionResult {
  isCode: boolean;
  language?: string;
  wrappedText?: string;
}

/**
 * Detects programming language from code content
 */
function detectLanguage(text: string): string {
  // TypeScript/TSX indicators
  if (
    /interface\s+\w+|type\s+\w+\s*=|<\w+.*?>/.test(text) &&
    (text.includes("import") || text.includes("export"))
  ) {
    return text.includes("<") && text.includes(">") ? "tsx" : "ts";
  }

  // React/JSX indicators
  if (/<[A-Z]\w+|<\/[A-Z]\w+|className=|onClick=/.test(text)) {
    return "jsx";
  }

  // JavaScript indicators
  if (/^(import|export|const|let|var|function|class)\s+/m.test(text)) {
    return "js";
  }

  // CSS indicators
  if (/\{[^}]*:[^}]*;[^}]*\}/.test(text) && !text.includes("function")) {
    return "css";
  }

  // JSON indicators
  if (/^\s*[\{\[]/.test(text.trim()) && /[\}\]]\s*$/.test(text.trim())) {
    try {
      JSON.parse(text);
      return "json";
    } catch {
      // Not valid JSON, continue
    }
  }

  // Default fallback
  return "ts";
}

/**
 * Checks if text is already wrapped in code fences
 */
function isAlreadyFenced(text: string): boolean {
  const trimmed = text.trim();
  return /^```[\w]*\n[\s\S]*\n```$/.test(trimmed);
}

/**
 * Detects if text contains code patterns
 */
function hasCodePatterns(text: string): boolean {
  const codeIndicators = [
    // Imports/exports
    /^(import|export)\s+/m,
    // Function declarations
    /^(function|const|let|var)\s+\w+\s*=\s*(async\s+)?\(/m,
    // Arrow functions with types
    /:\s*\([^)]*\)\s*=>/,
    // React/JSX components
    /<[A-Z]\w+[\s\S]*?>/,
    // TypeScript interfaces/types
    /^(interface|type)\s+\w+/m,
    // Common code structures
    /\{\s*\w+:\s*\w+.*?\}/,
    // Multiple consecutive lines with semicolons
    /;[\s\n]+\w+.*?;/,
    // Class definitions
    /^class\s+\w+/m
  ];

  return codeIndicators.some((pattern) => pattern.test(text));
}

/**
 * Calculates the ratio of code-like lines to total lines
 */
function getCodeRatio(text: string): number {
  const lines = text.split("\n");
  const codeLinePatterns = [
    /^\s*(import|export|const|let|var|function|class|interface|type)\s+/,
    /^\s*<[A-Z]\w+/,
    /^\s*<\/\w+>/,
    /^\s*\w+\([^)]*\)\s*\{/,
    /^\s*\}[;,]?\s*$/,
    /;\s*$/
  ];

  const codeLines = lines.filter((line) =>
    codeLinePatterns.some((pattern) => pattern.test(line))
  ).length;

  return lines.length > 0 ? codeLines / lines.length : 0;
}

/**
 * Detects if input contains code and wraps it in markdown fences if needed
 */
export function preprocessCodeInput(text: string): CodeDetectionResult {
  // Skip if already fenced
  if (isAlreadyFenced(text)) {
    return { isCode: false };
  }

  // Skip if too short or too long (not typical code paste)
  const lineCount = text.split("\n").length;
  if (lineCount < 3 || lineCount > 500) {
    return { isCode: false };
  }

  // Check for code patterns
  const hasCode = hasCodePatterns(text);
  const codeRatio = getCodeRatio(text);

  // Consider it code if:
  // 1. Has clear code patterns AND
  // 2. At least 40% of lines are code-like (lower threshold than auto-fencing)
  const isCode = hasCode && codeRatio >= 0.4;

  if (!isCode) {
    return { isCode: false };
  }

  // Detect language and wrap
  const language = detectLanguage(text);
  const wrappedText = `\`\`\`${language}\n${text}\n\`\`\``;

  return {
    isCode: true,
    language,
    wrappedText
  };
}
