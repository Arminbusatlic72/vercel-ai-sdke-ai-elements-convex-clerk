import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, beforeEach, vi } from "vitest";
import GptEntryClient from "../components/gpt/GptEntryClient";
import { useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "next/navigation";

vi.mock("@clerk/nextjs", () => ({
  useUser: vi.fn()
}));

vi.mock("convex/react", () => ({
  useMutation: vi.fn(),
  useQuery: vi.fn()
}));

vi.mock("next/navigation", () => ({
  useRouter: vi.fn()
}));

describe("GptEntryClient", () => {
  const gpt = {
    gptId: "demo-gpt",
    name: "Demo GPT",
    description: "Assistant for tests",
    model: "gpt-5-mini"
  };

  const push = vi.fn();
  const createChat = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    window.sessionStorage.clear();

    vi.mocked(useRouter).mockReturnValue({
      push
    } as unknown as ReturnType<typeof useRouter>);

    vi.mocked(useUser).mockReturnValue({
      user: { id: "user_123" },
      isLoaded: true
    } as unknown as ReturnType<typeof useUser>);

    vi.mocked(useMutation).mockReturnValue(createChat);
    vi.mocked(useQuery).mockReturnValue({ hasAccess: true, reason: null });

    createChat.mockResolvedValue("chat_abc");
  });

  it("shows welcome screen when subscription access is valid", () => {
    render(<GptEntryClient gpt={gpt} />);

    expect(screen.getByText("Demo GPT")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /begin chat/i })).toBeVisible();
  });

  it("shows blocked upsell UI when user does not have access", () => {
    vi.mocked(useQuery).mockReturnValue({
      hasAccess: false,
      reason: "Package not found"
    });

    render(<GptEntryClient gpt={gpt} />);

    expect(screen.getByText("Upgrade required")).toBeInTheDocument();
    expect(screen.getByText("Package not found")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /begin chat/i })
    ).not.toBeInTheDocument();
  });

  it("clicking Begin calls createChat mutation and redirects to chat URL", async () => {
    const user = userEvent.setup();
    render(<GptEntryClient gpt={gpt} />);

    await user.click(screen.getByRole("button", { name: /begin chat/i }));

    expect(createChat).toHaveBeenCalledTimes(1);
    expect(createChat).toHaveBeenCalledWith(
      expect.objectContaining({
        gptId: "demo-gpt"
      })
    );

    await waitFor(() => {
      expect(push).toHaveBeenCalledWith("/gpt5/demo-gpt/chat/chat_abc");
    });

    expect(window.sessionStorage.getItem("begun_demo-gpt")).toBe("true");
  });

  it("skips Begin screen and auto-starts chat when begun flag exists in sessionStorage", async () => {
    window.sessionStorage.setItem("begun_demo-gpt", "true");

    render(<GptEntryClient gpt={gpt} />);

    expect(
      screen.queryByRole("button", { name: /begin chat/i })
    ).not.toBeInTheDocument();

    await waitFor(() => {
      expect(createChat).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(push).toHaveBeenCalledWith("/gpt5/demo-gpt/chat/chat_abc");
    });
  });

  it("does not call mutation when access check fails", async () => {
    const user = userEvent.setup();
    vi.mocked(useQuery).mockReturnValue({
      hasAccess: false,
      reason: "No access"
    });

    render(<GptEntryClient gpt={gpt} />);

    const begin = screen.queryByRole("button", { name: /begin chat/i });
    expect(begin).not.toBeInTheDocument();

    await user.click(screen.getByRole("link", { name: /view plans/i }));
    expect(createChat).not.toHaveBeenCalled();
  });

  it("shows loading state while access check is pending", () => {
    vi.mocked(useQuery).mockReturnValue(undefined);

    render(<GptEntryClient gpt={gpt} />);

    expect(screen.getByText("Loading GPT...")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /begin chat/i })
    ).not.toBeInTheDocument();
  });
});
