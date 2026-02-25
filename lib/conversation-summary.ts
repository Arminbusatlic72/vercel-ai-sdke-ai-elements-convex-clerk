type ChatLikeMessage = {
  role?: string;
  content?: unknown;
  parts?: Array<{ type?: string; text?: string }>;
};

function extractTextContent(message: ChatLikeMessage): string {
  if (!message) return "";

  if (typeof message.content === "string") {
    return message.content.trim();
  }

  if (Array.isArray(message.content)) {
    return message.content
      .filter(
        (part: any) => part?.type === "text" && typeof part?.text === "string"
      )
      .map((part: any) => part.text.trim())
      .filter(Boolean)
      .join(" ");
  }

  if (Array.isArray(message.parts)) {
    return message.parts
      .filter((part) => part?.type === "text" && typeof part?.text === "string")
      .map((part) => part.text!.trim())
      .filter(Boolean)
      .join(" ");
  }

  return "";
}

function compact(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function truncateAtWord(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  const slice = text.slice(0, maxChars);
  const shortened = slice.replace(/\s+\S*$/, "").trim();
  return `${shortened}…`;
}

export function buildDeterministicConversationSummary(
  messages: ChatLikeMessage[],
  options?: {
    maxItems?: number;
    maxCharsPerItem?: number;
    maxTotalChars?: number;
  }
): string {
  const maxItems = options?.maxItems ?? 8;
  const maxCharsPerItem = options?.maxCharsPerItem ?? 180;
  const maxTotalChars = options?.maxTotalChars ?? 1400;

  const normalized = messages
    .map((message) => {
      const role = message?.role === "assistant" ? "assistant" : "user";
      const text = compact(extractTextContent(message));
      if (!text) return null;
      return {
        role,
        text: truncateAtWord(text, maxCharsPerItem)
      };
    })
    .filter(Boolean) as Array<{ role: "user" | "assistant"; text: string }>;

  if (normalized.length === 0) return "";

  const recent = normalized.slice(-maxItems);
  const lines = recent.map((entry) =>
    entry.role === "user"
      ? `- User: ${entry.text}`
      : `- Assistant: ${entry.text}`
  );

  let summary = `[Conversation Summary]\n${lines.join("\n")}`;
  if (summary.length > maxTotalChars) {
    summary = truncateAtWord(summary, maxTotalChars);
  }

  return summary;
}
