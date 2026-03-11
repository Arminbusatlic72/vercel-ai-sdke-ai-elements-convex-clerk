import { describe, expect, it } from "vitest";
import {
  BEGIN_INTERNAL_PROMPT,
  countNewUserMessages,
  extractMessageText,
  getUsageWindowStarts
} from "@/app/api/chat/usage-guard";

describe("usage guard helpers", () => {
  it("counts only meaningful user messages", () => {
    const messages = [
      { role: "system", content: "setup" },
      { role: "user", content: "__begin__" },
      { role: "user", parts: [{ type: "text", text: BEGIN_INTERNAL_PROMPT }] },
      { role: "assistant", content: "waiting" },
      { role: "user", content: "What is 2+2?" },
      { role: "user", content: "   " },
      { role: "user", content: "Tell me about cats" }
    ];

    expect(countNewUserMessages(messages)).toBe(2);
  });

  it("extracts text from complex message shapes", () => {
    expect(extractMessageText({ parts: [{ type: "text", text: "hi" }] })).toBe(
      "hi"
    );
    expect(
      extractMessageText({ content: [{ type: "text", text: "chunk" }] })
    ).toBe("chunk");
    expect(extractMessageText({ content: "hello world" })).toBe("hello world");
    expect(extractMessageText({})).toBe("");
  });

  it("computes aligned minute/hour/month windows", () => {
    const now = Date.UTC(2026, 2, 11, 8, 37, 12, 345);
    const windows = getUsageWindowStarts(now);
    expect(windows.minuteWindowStart).toBe(Date.UTC(2026, 2, 11, 8, 37, 0, 0));
    expect(windows.hourWindowStart).toBe(Date.UTC(2026, 2, 11, 8, 0, 0, 0));
    expect(windows.monthlyWindowStart).toBe(Date.UTC(2026, 2, 1, 0, 0, 0, 0));
  });
});
