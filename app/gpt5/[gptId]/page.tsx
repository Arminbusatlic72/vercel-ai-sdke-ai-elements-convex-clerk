import AiChat from "@/components/AiChat";
import { openaiModels } from "@/lib/ai-models";
import { resolveGptFromDb } from "@/lib/resolveGpt";

interface PageProps {
  params: { gptId: string };
}

export default async function DynamicGptPage({ params }: PageProps) {
  const { gptId } = await params; // ✅ unwrap the promise in server component
  const dbGpt = await resolveGptFromDb(gptId);

  const systemPrompt =
    dbGpt?.systemPrompt ||
    "You are a helpful assistant that can answer questions and help with tasks.";
  const model = dbGpt?.model || "gpt-4o-mini";

  return (
    <AiChat
      chatId={undefined}
      gptId={gptId}
      initialMessages={[]}
      models={openaiModels}
      defaultModel={model}
      showWebSearch
    />
  );
}
