// import ChatInterface from "../../../components/ChatInterface";
import { Id } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";
import { getConvexClient } from "@/lib/convex";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import AiChat from "@/components/AiChat";

interface ChatPageProps {
  params: {
    chatId: Id<"chats">;
  };
  initialMessages: Array<{
    _id: Id<"messages">;
    content: string;
    role: "user" | "assistant";
  }>;
}

export default async function ChatPage({ params }: ChatPageProps) {
  const { chatId } = await params;

  // Get user authentication
  const { userId } = await auth();

  if (!userId) {
    redirect("/");
  }

  try {
    // Get Convex client and fetch chat and messages
    const convex = getConvexClient();

    // Check if chat exists & user is authorized to view it
    const chat = await convex.query(api.chats.getChat, {
      id: chatId,
      userId
    });

    if (!chat) {
      console.log(
        "⚠️ Chat not found or unauthorized, redirecting to dashboard"
      );
      redirect("/dashboard");
    }

    // Get initial messages
    const initialMessages = await convex.query(api.messages.list, { chatId });

    return (
      <div className="w-full h-screen">
        <AiChat chatId={chatId} initialMessages={initialMessages} />
      </div>
    );
  } catch (error) {
    console.error("🔥 Error loading chat:", error);
    redirect("/dashboard");
  }
}
