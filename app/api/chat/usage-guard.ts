export const BEGIN_INTERNAL_PROMPT =
  "Start this conversation with one concise, friendly opening message and a brief note about how you can help.";

export const REQUESTS_PER_MINUTE_LIMIT = 10;
export const REQUESTS_PER_HOUR_LIMIT = 100;
export const MONTHLY_MESSAGE_LIMIT = 2_500;
export const MONTHLY_IMAGE_LIMIT = 50;

export function extractMessageText(message: any): string {
  if (!message) return "";

  if (typeof message.content === "string") {
    return message.content;
  }

  if (Array.isArray(message.content)) {
    return message.content
      .filter((part: any) => part.type === "text")
      .map((part: any) => part.text)
      .join(" ");
  }

  if (Array.isArray(message.parts)) {
    return message.parts
      .filter((part: any) => part.type === "text")
      .map((part: any) => part.text)
      .join(" ");
  }

  return "";
}

export function getUsageWindowStarts(now = Date.now()) {
  const minuteWindowStart = Math.floor(now / 60_000) * 60_000;
  const hourWindowStart = Math.floor(now / 3_600_000) * 3_600_000;
  const monthlyDate = new Date(now);
  monthlyDate.setUTCDate(1);
  monthlyDate.setUTCHours(0, 0, 0, 0);
  const monthlyWindowStart = monthlyDate.getTime();
  return {
    minuteWindowStart,
    hourWindowStart,
    monthlyWindowStart
  };
}
export function countNewUserMessages(messages: any[]): number {
  if (!Array.isArray(messages)) return 0;
  return messages.reduce((count, message) => {
    if (message?.role !== "user") return count;
    const text = extractMessageText(message)?.trim();
    if (!text) return count;
    if (text === "__begin__" || text === BEGIN_INTERNAL_PROMPT) {
      return count;
    }
    return count + 1;
  }, 0);
}
