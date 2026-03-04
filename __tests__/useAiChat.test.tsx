import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useChat } from "@ai-sdk/react";
import { useMutation } from "convex/react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAiChat } from "../lib/hooks/useAiChat";

vi.mock("@ai-sdk/react", () => ({
  useChat: vi.fn()
}));

vi.mock("convex/react", () => ({
  useMutation: vi.fn()
}));

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
  usePathname: vi.fn(),
  useSearchParams: vi.fn()
}));

describe("useAiChat", () => {
  const createChat = vi.fn();
  const storeMessage = vi.fn();
  const updateChatModel = vi.fn();
  const sendMessage = vi.fn();
  const setMessages = vi.fn();
  const replace = vi.fn();

  const models = [{ name: "GPT", value: "gpt-4o-mini", provider: "openai" }];

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useMutation)
      .mockReturnValueOnce(createChat)
      .mockReturnValueOnce(storeMessage)
      .mockReturnValueOnce(updateChatModel);

    vi.mocked(useChat).mockReturnValue({
      messages: [],
      sendMessage,
      status: "idle",
      setMessages
    } as unknown as ReturnType<typeof useChat>);

    vi.mocked(useRouter).mockReturnValue({
      replace
    } as unknown as ReturnType<typeof useRouter>);
    vi.mocked(usePathname).mockReturnValue("/gpt5/demo-gpt/chat/chat_1");
    vi.mocked(useSearchParams).mockReturnValue(
      new URLSearchParams("begin=true") as unknown as ReturnType<
        typeof useSearchParams
      >
    );
  });

  it("auto-sends __begin__ once for new empty GPT chat only when begin=true is present", async () => {
    const { rerender } = renderHook(() =>
      useAiChat({
        chatId: "chat_1" as any,
        gptId: "demo-gpt",
        initialMessages: [],
        models,
        defaultModel: "gpt-4o-mini"
      })
    );

    await waitFor(() => {
      expect(sendMessage).toHaveBeenCalledTimes(1);
    });

    expect(sendMessage).toHaveBeenCalledWith(
      { text: "__begin__" },
      expect.objectContaining({
        body: expect.objectContaining({
          chatId: "chat_1",
          gptId: "demo-gpt",
          webSearch: false
        }),
        headers: expect.objectContaining({
          "x-idempotency-key": expect.stringContaining("chat_")
        })
      })
    );

    rerender();
    expect(sendMessage).toHaveBeenCalledTimes(1);
    expect(replace).toHaveBeenCalledWith("/gpt5/demo-gpt/chat/chat_1", {
      scroll: false
    });
  });

  it("does not auto-send __begin__ when begin=true query param is missing", async () => {
    vi.mocked(useSearchParams).mockReturnValue(
      new URLSearchParams("") as unknown as ReturnType<typeof useSearchParams>
    );

    renderHook(() =>
      useAiChat({
        chatId: "chat_1" as any,
        gptId: "demo-gpt",
        initialMessages: [],
        models,
        defaultModel: "gpt-4o-mini"
      })
    );

    await Promise.resolve();
    expect(sendMessage).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
  });

  it("does not auto-send __begin__ when initial messages already exist", async () => {
    renderHook(() =>
      useAiChat({
        chatId: "chat_1" as any,
        gptId: "demo-gpt",
        initialMessages: [
          {
            _id: "m1" as any,
            role: "assistant",
            content: "Existing message"
          }
        ],
        models,
        defaultModel: "gpt-4o-mini"
      })
    );

    await Promise.resolve();
    expect(sendMessage).not.toHaveBeenCalled();
  });

  it("filters internal __begin__ message from displayMessages", () => {
    vi.mocked(useMutation)
      .mockReturnValueOnce(createChat)
      .mockReturnValueOnce(storeMessage)
      .mockReturnValueOnce(updateChatModel);

    vi.mocked(useChat).mockReturnValue({
      messages: [
        {
          id: "1",
          role: "user",
          parts: [{ type: "text", text: "__begin__" }]
        },
        {
          id: "2",
          role: "assistant",
          parts: [{ type: "text", text: "Welcome!" }]
        }
      ],
      sendMessage,
      status: "idle",
      setMessages
    } as unknown as ReturnType<typeof useChat>);

    const { result } = renderHook(() =>
      useAiChat({
        gptId: undefined,
        initialMessages: [],
        models,
        defaultModel: "gpt-4o-mini"
      })
    );

    expect(result.current.displayMessages).toHaveLength(1);
    expect(result.current.displayMessages[0].parts[0].text).toBe("Welcome!");
  });
});
