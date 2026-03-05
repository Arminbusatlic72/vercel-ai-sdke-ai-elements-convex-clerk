import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import QuickActions from "@/components/dashboard/QuickActions";

describe("QuickActions", () => {
  it("routes Start a Chat to the first subscribed GPT from active subscriptions", () => {
    render(
      <QuickActions
        subscriptions={[
          {
            status: "canceled",
            gptIds: ["gpt-canceled"]
          },
          {
            status: "active",
            gptIds: ["gpt-owned-1", "gpt-owned-2"]
          }
        ]}
      />
    );

    const startChatLink = screen.getByRole("link", { name: /start a chat/i });
    expect(startChatLink).toHaveAttribute("href", "/gpt5/gpt-owned-1");
  });

  it("routes Start a Chat to subscribe when user has no subscribed GPTs", () => {
    render(
      <QuickActions
        subscriptions={[
          {
            status: "active",
            gptIds: []
          },
          {
            status: "trialing"
          }
        ]}
      />
    );

    const startChatLink = screen.getByRole("link", { name: /start a chat/i });
    expect(startChatLink).toHaveAttribute("href", "/subscribe");
  });
});
