"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import GptWelcomeScreen from "@/components/gpt/GptWelcomeScreen";

type GptWelcomeData = {
  gptId: string;
  name?: string;
  description?: string;
  model?: string;
  creatorName?: string;
  avatarUrl?: string;
};

interface GptEntryClientProps {
  gpt: GptWelcomeData;
}

export default function GptEntryClient({ gpt }: GptEntryClientProps) {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const [isStarting, setIsStarting] = useState(false);
  const [shouldShowBeginScreen, setShouldShowBeginScreen] = useState<
    boolean | null
  >(null);
  const hasAutoStartedRef = useRef(false);
  const createChat = useMutation(api.chats.createChat);

  const accessResult = useQuery(
    api.gptAccess.checkGptAccess,
    user?.id
      ? {
          clerkUserId: user.id,
          gptId: gpt.gptId
        }
      : "skip"
  );

  const startChat = useCallback(async (fromBeginScreen: boolean) => {
    if (!user?.id || isStarting) return;

    try {
      setIsStarting(true);
      const chatId = await createChat({
        title: `New ${gpt.name?.trim() || gpt.gptId} chat`,
        gptId: gpt.gptId,
        createdAt: Date.now()
      });
      const beginQuery = fromBeginScreen ? "?begin=true" : "";
      router.push(`/gpt5/${gpt.gptId}/chat/${chatId}${beginQuery}`);
    } catch (error) {
      console.error("Failed to create GPT chat:", error);
      setIsStarting(false);
    }
  }, [createChat, gpt.gptId, gpt.name, isStarting, router, user?.id]);

  const handleBegin = useCallback(async () => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem(`begun_${gpt.gptId}`, "true");
    }

    await startChat(true);
  }, [gpt.gptId, startChat]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const hasBegun = sessionStorage.getItem(`begun_${gpt.gptId}`) === "true";
    setShouldShowBeginScreen(!hasBegun);
    hasAutoStartedRef.current = false;
  }, [gpt.gptId]);

  useEffect(() => {
    if (!isLoaded || !user?.id) return;
    if (accessResult === undefined) return;
    if (accessResult && !accessResult.hasAccess) return;
    if (shouldShowBeginScreen !== false) return;
    if (hasAutoStartedRef.current) return;

    hasAutoStartedRef.current = true;
    void startChat(false);
  }, [accessResult, isLoaded, shouldShowBeginScreen, startChat, user?.id]);

  if (
    !isLoaded ||
    shouldShowBeginScreen === null ||
    (user?.id && accessResult === undefined)
  ) {
    return (
      <div className="flex min-h-[calc(100dvh-8rem)] items-center justify-center px-4">
        <p className="text-sm text-muted-foreground">Loading GPT...</p>
      </div>
    );
  }

  if (accessResult && !accessResult.hasAccess) {
    return (
      <div className="flex min-h-[calc(100dvh-8rem)] items-center justify-center px-4">
        <div className="w-full max-w-md rounded-xl border bg-card p-6 text-center">
          <h2 className="text-lg font-semibold">Upgrade required</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {accessResult.reason ||
              "Your current plan does not include this GPT."}
          </p>
          <Button asChild variant="outline" className="mt-5 rounded-full">
            <Link href="/subscribe">View plans</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (shouldShowBeginScreen === false) {
    return (
      <div className="flex min-h-[calc(100dvh-8rem)] items-center justify-center px-4">
        <p className="text-sm text-muted-foreground">Starting chat...</p>
      </div>
    );
  }

  return (
    <GptWelcomeScreen gpt={gpt} onBegin={handleBegin} isStarting={isStarting} />
  );
}
