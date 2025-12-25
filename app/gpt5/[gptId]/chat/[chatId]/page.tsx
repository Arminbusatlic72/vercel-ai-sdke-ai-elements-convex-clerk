import { auth } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import { fetchQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import AiChat from "@/components/AiChat";
import { openaiModels } from "@/lib/ai-models";

interface ChatPageProps {
  params: {
    gptId: string;
    chatId: string;
  };
}

export default async function ChatIdPage({ params }: ChatPageProps) {
  const { userId } = await auth();
  if (!userId) redirect("/");

  const { chatId, gptId } = await params;

  if (!chatId || !gptId) {
    notFound();
  }

  // 1️⃣ Load chat
  const chat = await fetchQuery(api.chats.getChat, {
    id: chatId as Id<"chats">,
    userId
  });

  if (!chat) notFound();

  // 2️⃣ 🔐 HARD URL GUARD
  if (chat.gptId !== gptId) {
    if (chat.gptId) {
      redirect(`/gpt/${chat.gptId}/chat/${chat._id}`);
    } else {
      redirect(`/gpt/chat/${chat._id}`);
    }
  }

  // 3️⃣ Load messages
  const messages = await fetchQuery(api.messages.list, {
    chatId: chat._id
  });

  const initialMessages = messages.map((msg) => ({
    _id: msg._id,
    role: msg.role as "user" | "assistant",
    content: msg.content
  }));

  return (
    <AiChat
      key={chat._id}
      gptId={gptId}
      chatId={chat._id}
      projectId={chat.projectId}
      initialMessages={initialMessages}
      models={openaiModels}
      showWebSearch
      defaultModel="gpt-4o-mini"
    />
  );
}
