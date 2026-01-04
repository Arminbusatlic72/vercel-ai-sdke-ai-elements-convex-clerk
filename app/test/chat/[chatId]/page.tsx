// ChatPage.tsx (server component)
import { Id } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";
import { getConvexClient } from "@/lib/convex";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import AiChatWrapper from "@/components/AiChatWrapper"; // client component
import { googleModels } from "@/lib/ai-models";

interface ChatPageProps {
  params: { chatId: Id<"chats"> };
}

export default async function ChatPage({ params }: ChatPageProps) {
  const { chatId } = await params;

  const { userId } = await auth();
  if (!userId) redirect("/");

  const convex = getConvexClient();

  const chat = await convex.query(api.chats.getChat, { id: chatId, userId });
  if (!chat) redirect("/dashboard");

  const messages = await convex.query(api.messages.list, { chatId });

  return (
    <AiChatWrapper
      chatId={chat._id}
      projectId={chat.projectId}
      initialMessages={messages}
      models={googleModels}
      showWebSearch
      defaultModel="gemini-2.0-flash-exp"
    />
  );
}
