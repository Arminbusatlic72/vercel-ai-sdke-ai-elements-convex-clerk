// import { Id } from "@/convex/_generated/dataModel";
// import { api } from "@/convex/_generated/api";
// import { getConvexClient } from "@/lib/convex";
// import { redirect } from "next/navigation";
// import { auth } from "@clerk/nextjs/server";
// import AiChat from "@/components/AiChat";
// import { googleModels } from "@/lib/ai-models";
// import { Folder } from "lucide-react";
// interface ProjectPageProps {
//   params: { projectId: Id<"projects"> };
// }

// export default async function ProjectPage({ params }: ProjectPageProps) {
//   const { projectId } = await params;

//   const { userId } = await auth();
//   if (!userId) redirect("/");

//   const convex = getConvexClient();

//   // Fetch the project details
//   const project = await convex.query(api.project.getProject, {
//     id: projectId
//   });

//   // If project doesn't exist or user doesn't have access, redirect
//   if (!project) {
//     redirect("/dashboard");
//   }

//   return (
//     <div className="flex flex-col h-full">
//       {/* Project Header */}
//       <div className="flex justify-center items-center bg-white border-b border-gray-200 px-6 py-4">
//         <Folder className="w-8 h-8 mr-2" />
//         <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
//       </div>

//       {/* Chat Interface - Empty by default */}
//       <div className="flex-1">
//         <AiChat
//           projectId={projectId}
//           chatId={undefined} // No chat selected - empty state
//           initialMessages={[]} // Empty messages
//           models={googleModels}
//           showWebSearch={true}
//           defaultModel="gemini-2.5-flash"
//           // apiEndpoint="/api/chat"
//         />
//       </div>
//     </div>
//   );
// }

import { Id } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";
import { getConvexClient } from "@/lib/convex";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import AiChat from "@/components/AiChat";
import { googleModels } from "@/lib/ai-models";
import { Folder } from "lucide-react";

interface ProjectPageProps {
  params: {
    gptId: string; // ✅ NOW EXISTS
    projectId: Id<"projects">;
  };
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { gptId, projectId } = await params;

  const { userId } = await auth();
  if (!userId) redirect("/");

  const convex = getConvexClient();

  const project = await convex.query(api.project.getProject, {
    id: projectId
  });

  if (!project) redirect("/dashboard");

  return (
    <div className="flex flex-col h-full">
      {/* Project Header */}
      <div className="flex items-center gap-2 border-b px-6 py-4">
        <Folder className="w-7 h-7" />
        <h1 className="text-2xl font-bold">{project.name}</h1>
      </div>

      {/* Chat */}
      <div className="flex-1">
        <AiChat
          gptId={gptId} // ✅ FIXED
          projectId={projectId} // ✅ FIXED
          chatId={undefined}
          initialMessages={[]}
          models={googleModels}
          showWebSearch
          defaultModel="gemini-2.5-flash"
        />
      </div>
    </div>
  );
}
