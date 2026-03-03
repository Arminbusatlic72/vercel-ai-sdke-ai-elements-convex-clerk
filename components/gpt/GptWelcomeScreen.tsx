"use client";

import Image from "next/image";
import { BadgeCheck, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";

type GptWelcomeData = {
  gptId: string;
  name?: string;
  description?: string;
  model?: string;
  creatorName?: string;
  avatarUrl?: string;
};

interface GptWelcomeScreenProps {
  gpt: GptWelcomeData;
  onBegin: () => void;
  isStarting?: boolean;
}

export default function GptWelcomeScreen({
  gpt,
  onBegin,
  isStarting = false
}: GptWelcomeScreenProps) {
  const title = gpt.name?.trim() || gpt.gptId;
  const creator = gpt.creatorName?.trim();
  const description =
    gpt.description?.trim() ||
    "Start a new conversation to begin chatting with this GPT.";

  return (
    <div className="flex min-h-[calc(100dvh-8rem)] w-full items-center justify-center px-4">
      <div className="mx-auto flex w-full max-w-2xl animate-in fade-in duration-300 flex-col items-center text-center">
        <div className="mb-6 flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border bg-muted">
          {gpt.avatarUrl ? (
            <Image
              src={gpt.avatarUrl}
              alt={`${title} avatar`}
              width={80}
              height={80}
              className="h-20 w-20 object-cover"
            />
          ) : (
            <Bot className="h-9 w-9 text-muted-foreground" />
          )}
        </div>

        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          {title}
        </h1>

        {creator ? (
          <div className="mt-2 inline-flex items-center gap-1.5 text-sm text-muted-foreground">
            <BadgeCheck className="h-4 w-4" />
            <span>By {creator}</span>
          </div>
        ) : null}

        <p className="mt-2 text-sm text-muted-foreground">
          ✓ Using the creator&apos;s recommended model:{" "}
          {gpt.model || "gpt-4o-mini"}
        </p>

        <p className="mt-5 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
          {description}
        </p>

        <Button
          variant="outline"
          onClick={onBegin}
          disabled={isStarting}
          aria-label="Begin chat"
          className="mt-8 min-w-[140px] rounded-full"
        >
          {isStarting ? "Starting..." : "Begin"}
        </Button>
      </div>
    </div>
  );
}
