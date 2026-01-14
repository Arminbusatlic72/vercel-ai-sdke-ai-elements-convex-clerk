"use client";

import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import { Folder } from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";

export default function ProjectHeader({
  projectId
}: {
  projectId: Id<"projects">;
}) {
  const project = useQuery(api.project.getProject, { id: projectId });

  if (!project) return null;

  return (
    <div className="p-6 border-b border-gray-200 bg-white">
      <div className="flex items-center gap-3">
        <Folder className="w-8 h-8 text-blue-500" />

        <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
      </div>
    </div>
  );
}
