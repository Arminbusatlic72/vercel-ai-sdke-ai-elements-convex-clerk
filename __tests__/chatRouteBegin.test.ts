import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  return {
    convexQuery: vi.fn(),
    convexMutation: vi.fn(),
    convertToModelMessages: vi.fn(),
    streamText: vi.fn(),
    shouldUseRAG: vi.fn(),
    generateChatTitle: vi.fn(),
    buildSummary: vi.fn(),
    webSearchTool: vi.fn(),
    fileSearchTool: vi.fn()
  };
});

vi.mock("convex/browser", () => ({
  ConvexHttpClient: class {
    query = mocks.convexQuery;
    mutation = mocks.convexMutation;
  }
}));

vi.mock("ai", () => ({
  streamText: mocks.streamText,
  convertToModelMessages: mocks.convertToModelMessages
}));

vi.mock("@ai-sdk/google", () => ({
  createGoogleGenerativeAI: vi.fn(() => vi.fn())
}));

vi.mock("@ai-sdk/openai", () => ({
  createOpenAI: vi.fn(() => {
    const modelFactory = vi.fn(() => ({ model: "mock-model" }));
    (modelFactory as any).tools = {
      webSearch: mocks.webSearchTool,
      fileSearch: mocks.fileSearchTool
    };
    return modelFactory;
  })
}));

vi.mock("@/lib/ai-optimization", () => ({
  shouldUseRAG: mocks.shouldUseRAG
}));

vi.mock("@/lib/chat-title", () => ({
  generateChatTitle: mocks.generateChatTitle
}));

vi.mock("@/lib/conversation-summary", () => ({
  buildDeterministicConversationSummary: mocks.buildSummary
}));

describe("chat route __begin__ behavior", () => {
  let POST: (req: Request) => Promise<Response>;

  beforeAll(async () => {
    process.env.NEXT_PUBLIC_CONVEX_URL = "https://example.convex.cloud";
    process.env.GOOGLE_GENERATIVE_AI_API_KEY = "test-google-key";
    ({ POST } = await import("../app/api/chat/route"));
  });

  beforeEach(() => {
    vi.clearAllMocks();

    mocks.convexQuery.mockResolvedValue({
      defaultApiKey: "test-openai-key",
      defaultSystemPrompt: "You are helpful"
    });

    mocks.convertToModelMessages.mockImplementation(
      async (messages) => messages
    );

    mocks.streamText.mockReturnValue({
      toUIMessageStreamResponse: () => new Response("ok", { status: 200 })
    });

    mocks.shouldUseRAG.mockReturnValue(false);
    mocks.generateChatTitle.mockResolvedValue("Title");
    mocks.buildSummary.mockReturnValue("");
  });

  it("detects __begin__ and replaces model messages while never persisting __begin__", async () => {
    const req = new Request("http://localhost/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        chatId: "chat_1",
        messages: [{ role: "user", content: "__begin__" }],
        webSearch: false,
        provider: "openai"
      })
    });

    const response = await POST(req);
    expect(response.status).toBe(200);

    expect(mocks.convertToModelMessages).toHaveBeenCalledTimes(1);
    const convertedInput = mocks.convertToModelMessages.mock.calls[0][0];
    expect(convertedInput).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          role: "user",
          parts: expect.arrayContaining([
            expect.objectContaining({
              type: "text",
              text: expect.stringContaining("Start this conversation")
            })
          ])
        })
      ])
    );

    await new Promise((resolve) => setTimeout(resolve, 0));

    const persistedBegin = mocks.convexMutation.mock.calls.some(
      (call) => call[1]?.content === "__begin__"
    );

    expect(persistedBegin).toBe(false);
  });

  it("normalizes legacy content-only messages to parts before convertToModelMessages", async () => {
    const req = new Request("http://localhost/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        chatId: "chat_legacy",
        messages: [{ role: "user", content: "Legacy text message" }],
        webSearch: false,
        provider: "openai"
      })
    });

    const response = await POST(req);
    expect(response.status).toBe(200);

    expect(mocks.convertToModelMessages).toHaveBeenCalledTimes(1);
    const convertedInput = mocks.convertToModelMessages.mock.calls[0][0];

    expect(convertedInput).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          role: "user",
          parts: expect.arrayContaining([
            expect.objectContaining({
              type: "text",
              text: "Legacy text message"
            })
          ])
        })
      ])
    );
  });
});
