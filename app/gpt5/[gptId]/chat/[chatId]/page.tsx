// import { auth } from "@clerk/nextjs/server";
// import { redirect, notFound } from "next/navigation";
// import { fetchQuery } from "convex/nextjs";
// import { api } from "@/convex/_generated/api";
// import { Id } from "@/convex/_generated/dataModel";
// import AiChat from "@/components/AiChat";
// import { openaiModels } from "@/lib/ai-models";

// interface ChatPageProps {
//   params: {
//     gptId: string;
//     chatId: string;
//   };
// }

// export default async function ChatIdPage({ params }: ChatPageProps) {
//   const { userId } = await auth();
//   if (!userId) redirect("/");

//   const { chatId, gptId } = await params;

//   if (!chatId || !gptId) {
//     notFound();
//   }

//   // 1️⃣ Load chat
//   const chat = await fetchQuery(api.chats.getChat, {
//     id: chatId as Id<"chats">,
//     userId
//   });

//   if (!chat) notFound();

//   // 2️⃣ 🔐 HARD URL GUARD
//   if (chat.gptId !== gptId) {
//     if (chat.gptId) {
//       redirect(`/gpt/${chat.gptId}/chat/${chat._id}`);
//     } else {
//       redirect(`/gpt/chat/${chat._id}`);
//     }
//   }

//   // 3️⃣ Load messages
//   const messages = await fetchQuery(api.messages.list, {
//     chatId: chat._id
//   });

//   const initialMessages = messages.map((msg) => ({
//     _id: msg._id,
//     role: msg.role as "user" | "assistant",
//     content: msg.content
//   }));
//   // fetch GPT if chat has one
//   let gpt = null;

//   if (chat.gptId) {
//     gpt = await fetchQuery(api.gpts.getGpt, {
//       gptId: chat.gptId
//     });
//   }

//   const resolvedDefaultModel = chat.model ?? gpt?.model ?? "gpt-4o-mini";

//   return (
//     <AiChat
//       key={chat._id}
//       gptId={gptId}
//       chatId={chat._id}
//       projectId={chat.projectId}
//       initialMessages={initialMessages}
//       models={openaiModels}
//       showWebSearch
//       defaultModel={resolvedDefaultModel}
//     />
//   );
// }

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

  if (!chatId || !gptId) notFound();

  // 1️⃣ Load chat
  const chat = await fetchQuery(api.chats.getChat, {
    id: chatId as Id<"chats">,
    userId
  });
  if (!chat) notFound();

  // 2️⃣ Guard: URL GPT matches chat
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

  // 4️⃣ Load GPT config
  let gpt = null;
  if (chat.gptId) {
    gpt = await fetchQuery(api.gpts.getGpt, {
      gptId: chat.gptId
    });
  }

  // 5️⃣ Resolve default model
  const resolvedDefaultModel = chat.model ?? gpt?.model ?? "gpt-4o-mini";

  console.log("[GPT PAGE]", { chatId, gptId, resolvedDefaultModel });

  return (
    <AiChat
      key={chat._id}
      gptId={gptId} // GPT ID
      chatId={chat._id} // Chat ID
      projectId={chat.projectId}
      initialMessages={initialMessages}
      models={openaiModels} // Allow switching models
      showWebSearch
      defaultModel={resolvedDefaultModel} // Pass initial model to the hook
    />
  );
}
