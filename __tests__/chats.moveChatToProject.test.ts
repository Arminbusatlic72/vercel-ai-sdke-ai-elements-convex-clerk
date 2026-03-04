import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../convex/_generated/server", () => ({
  query: (config: unknown) => config,
  mutation: (config: unknown) => config
}));

import { moveChatToProject } from "../convex/chats";

describe("chats.moveChatToProject", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function makeCtx() {
    const getUserIdentity = vi.fn(async () => ({ subject: "user_1" }));
    const get = vi.fn();
    const patch = vi.fn(async () => null);
    const collect = vi.fn(async () => []);
    const withIndex = vi.fn(() => ({ collect }));
    const query = vi.fn(() => ({ withIndex }));

    return {
      ctx: {
        auth: { getUserIdentity },
        db: { get, patch, query }
      },
      getUserIdentity,
      get,
      patch,
      query,
      withIndex,
      collect
    };
  }

  it("moves chat to a project and updates all chat messages projectId", async () => {
    const { ctx, get, patch, withIndex } = makeCtx();

    get
      .mockResolvedValueOnce({ _id: "chat_1", userId: "user_1" })
      .mockResolvedValueOnce({ _id: "project_1", userId: "user_1" });

    withIndex.mockImplementationOnce(
      () =>
        ({
          collect: vi.fn(async () => [{ _id: "msg_1" }, { _id: "msg_2" }])
        }) as any
    );

    const result = await (moveChatToProject as any).handler(ctx, {
      chatId: "chat_1",
      projectId: "project_1"
    });

    expect(patch).toHaveBeenCalledWith("chat_1", { projectId: "project_1" });
    expect(patch).toHaveBeenCalledWith("msg_1", { projectId: "project_1" });
    expect(patch).toHaveBeenCalledWith("msg_2", { projectId: "project_1" });
    expect(result).toEqual({
      chatId: "chat_1",
      projectId: "project_1",
      updatedMessages: 2
    });
  });

  it("removes chat from project when projectId is null and clears message projectId", async () => {
    const { ctx, get, patch, withIndex } = makeCtx();

    get.mockResolvedValueOnce({ _id: "chat_1", userId: "user_1" });

    withIndex.mockImplementationOnce(
      () =>
        ({
          collect: vi.fn(async () => [{ _id: "msg_1" }])
        }) as any
    );

    const result = await (moveChatToProject as any).handler(ctx, {
      chatId: "chat_1",
      projectId: null
    });

    expect(patch).toHaveBeenCalledWith("chat_1", { projectId: undefined });
    expect(patch).toHaveBeenCalledWith("msg_1", { projectId: undefined });
    expect(result).toEqual({
      chatId: "chat_1",
      projectId: undefined,
      updatedMessages: 1
    });
  });
});
