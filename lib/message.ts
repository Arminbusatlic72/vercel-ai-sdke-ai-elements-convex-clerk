// lib/message.ts

// Process message content and wrap code blocks if needed
export const processMessageContent = (content: string): string => {
  if (!content) return content;
  const safeContent = content.replace(/```/g, "\\`\\`\\`");
  const hasHtmlTags = /<[^>]+>/g.test(safeContent);
  const hasCodeKeywords =
    /\b(function|const|let|var|import|export|class|interface|type|return|=>)\b/.test(
      safeContent
    );
  const hasCodeBraces = /[{}/;]/.test(safeContent);
  const isMultiLine = safeContent.includes("\n");
  const alreadyWrapped = safeContent.trim().startsWith("```");

  if (
    !alreadyWrapped &&
    (hasHtmlTags || hasCodeKeywords || hasCodeBraces || isMultiLine)
  ) {
    let lang = "";
    if (safeContent.includes("import") || safeContent.includes("from"))
      lang = "ts";
    if (safeContent.includes("function") || safeContent.includes("const"))
      lang = lang || "js";
    return `\`\`\`${lang}\n${safeContent}\n\`\`\``;
  }
  return safeContent;
};

// Extract plain text from message parts
export const extractMessageText = (parts?: any[]): string => {
  // If parts is missing or not an array, return an empty string
  if (!parts || !Array.isArray(parts)) {
    return "";
  }

  return parts
    .filter((p) => p && p.type === "text")
    .map((p) => p.text)
    .join("\n")
    .trim();
};
