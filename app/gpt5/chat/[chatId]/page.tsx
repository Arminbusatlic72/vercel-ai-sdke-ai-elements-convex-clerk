import { auth } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import { fetchQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import AiChat from "@/components/AiChat";
import { openaiModels } from "@/lib/ai-models";

interface ChatPageProps {
  params: Promise<{ chatId: string }>;
}
type Message = {
  _id: Id<"messages">;
  role: string;
  content: string;
  // Add other fields if needed
};
type ChatUIMessage = {
  _id: Id<"messages">;
  role: "user" | "assistant";
  content: string;
};
export default async function ChatIdPage({ params }: ChatPageProps) {
  const { userId } = await auth();

  // 1. Ensure user is logged in
  if (!userId) {
    redirect("/");
  }

  const { chatId } = await params;

  // 2. Fetch Chat Metadata
  // Note: Your getChat query explicitly requires the userId string
  const chat = await fetchQuery(api.chats.getChat, {
    id: chatId as Id<"chats">,
    userId: userId
  });

  // 3. If chat doesn't exist or unauthorized
  if (!chat) {
    notFound(); // or redirect("/gpt5")
  }

  // 4. Fetch Messages (Using your 'list' query)
  const messages = (await fetchQuery(api.messages.list, {
    chatId: chatId as Id<"chats">
  })) as Message[];

  // 5. Format for useAiChat hook
  const initialMessages: ChatUIMessage[] = messages.map((msg) => ({
    _id: msg._id,
    role: msg.role as "user" | "assistant",
    content: msg.content
  }));
  console.log("Initial Messages:", initialMessages);
  // fetch GPT if chat has one
  let gpt = null;

  if (chat.gptId) {
    gpt = await fetchQuery(api.gpts.getGpt, {
      gptId: chat.gptId
    });
  }

  const resolvedDefaultModel = chat.model ?? gpt?.model ?? "gpt-4o-mini";
  console.log(resolvedDefaultModel);

  return (
    <AiChat
      key={chat._id}
      chatId={chatId as Id<"chats">}
      projectId={chat.projectId}
      initialMessages={initialMessages}
      models={openaiModels}
      showWebSearch
      defaultModel={resolvedDefaultModel}
    />
  );
}
