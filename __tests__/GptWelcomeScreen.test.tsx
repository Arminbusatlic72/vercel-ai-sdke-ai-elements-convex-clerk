import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import GptWelcomeScreen from "../components/gpt/GptWelcomeScreen";

vi.mock("next/image", () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img {...props} />;
  }
}));

describe("GptWelcomeScreen", () => {
  const fullGpt = {
    gptId: "demo-gpt",
    name: "Demo GPT",
    description: "This is a demo GPT description.",
    model: "GPT-5.2",
    creatorName: "Tim Stock",
    avatarUrl: "https://example.com/avatar.png"
  };

  it("renders GPT name, description, and creator name when provided", () => {
    render(<GptWelcomeScreen gpt={fullGpt} onBegin={vi.fn()} />);

    expect(screen.getByText("Demo GPT")).toBeInTheDocument();
    expect(
      screen.getByText("This is a demo GPT description.")
    ).toBeInTheDocument();
    expect(screen.getByText("By Tim Stock")).toBeInTheDocument();
  });

  it("hides creator line when creatorName is undefined", () => {
    const gpt = { ...fullGpt, creatorName: undefined };
    render(<GptWelcomeScreen gpt={gpt} onBegin={vi.fn()} />);

    expect(screen.queryByText(/^By\s+/)).not.toBeInTheDocument();
  });

  it("shows generic avatar icon when avatarUrl is undefined", () => {
    const gpt = { ...fullGpt, avatarUrl: undefined, creatorName: undefined };
    const { container } = render(
      <GptWelcomeScreen gpt={gpt} onBegin={vi.fn()} />
    );

    expect(screen.queryByAltText(/avatar/i)).not.toBeInTheDocument();
    expect(container.querySelector("svg.h-9.w-9")).toBeInTheDocument();
  });

  it("renders avatar image when avatarUrl is provided", () => {
    render(<GptWelcomeScreen gpt={fullGpt} onBegin={vi.fn()} />);

    expect(screen.getByAltText("Demo GPT avatar")).toBeInTheDocument();
  });

  it("renders Begin button and it is visible", () => {
    render(<GptWelcomeScreen gpt={fullGpt} onBegin={vi.fn()} />);

    expect(screen.getByRole("button", { name: /begin chat/i })).toBeVisible();
  });

  it("calls onBegin exactly once when Begin is clicked", async () => {
    const user = userEvent.setup();
    const onBegin = vi.fn();

    render(<GptWelcomeScreen gpt={fullGpt} onBegin={onBegin} />);

    await user.click(screen.getByRole("button", { name: /begin chat/i }));

    expect(onBegin).toHaveBeenCalledTimes(1);
  });

  it("allows keyboard Enter to trigger Begin button", async () => {
    const user = userEvent.setup();
    const onBegin = vi.fn();

    render(<GptWelcomeScreen gpt={fullGpt} onBegin={onBegin} />);

    await user.tab();
    expect(screen.getByRole("button", { name: /begin chat/i })).toHaveFocus();

    await user.keyboard("{Enter}");
    expect(onBegin).toHaveBeenCalledTimes(1);
  });
});
