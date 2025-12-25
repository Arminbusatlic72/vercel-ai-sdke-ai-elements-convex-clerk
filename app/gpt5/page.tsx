import AiChat from "@/components/AiChat";
import { openaiModels } from "@/lib/ai-models";

export default function NewChatPage() {
  return (
    <AiChat
      chatId={undefined}
      initialMessages={[]} // Force empty for new chats
      models={openaiModels}
      showWebSearch
      defaultModel="gpt-4o-mini"
    />
  );
}
