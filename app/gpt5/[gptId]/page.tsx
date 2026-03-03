import { auth } from "@clerk/nextjs/server";
import { fetchQuery } from "convex/nextjs";
import { notFound, redirect } from "next/navigation";
import { api } from "@/convex/_generated/api";
import GptEntryClient from "@/components/gpt/GptEntryClient";

interface PageProps {
  params: { gptId: string };
}

export default async function DynamicGptPage({ params }: PageProps) {
  const { userId } = await auth();
  if (!userId) redirect("/");

  const { gptId } = await params;
  const gpt = await fetchQuery(api.gpts.getGpt, { gptId });

  if (!gpt) notFound();

  return (
    <GptEntryClient
      gpt={{
        gptId: gpt.gptId,
        name: gpt.name,
        description: gpt.description,
        creatorName: gpt.creatorName,
        avatarUrl: gpt.avatarUrl,
        model: gpt.model
      }}
    />
  );
}
