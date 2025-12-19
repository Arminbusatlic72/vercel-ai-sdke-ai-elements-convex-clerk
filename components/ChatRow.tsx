"use client";
import Link from "next/link";
import { MessageSquare, Trash2 } from "lucide-react";
import { Button } from "./ui/button";
import { Id } from "@/convex/_generated/dataModel";

// Define a generic chat type that works for both agents
type ChatType = {
  _id: Id<"chats">;
  title: string;
  createdAt: number;
  userId: string;
};

interface ChatRowProps {
  chat: ChatType;
  onDelete: (id: Id<"chats">) => void;
  basePath: string;
}

export default function ChatRow({ chat, onDelete, basePath }: ChatRowProps) {
  return (
    <div className="group relative">
      <Link
        href={`${basePath}/chat/${chat._id}`}
        className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/50 transition-all duration-200 border border-transparent hover:border-gray-200/50"
      >
        <MessageSquare className="w-4 h-4 text-gray-400 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-700 truncate">{chat.title}</p>
          <p className="text-xs text-gray-400">
            {new Date(chat.createdAt).toLocaleDateString()}
          </p>
        </div>
      </Link>

      <Button
        variant="ghost"
        size="sm"
        onClick={(e) => {
          e.preventDefault();
          onDelete(chat._id);
        }}
        className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <Trash2 className="w-4 h-4 text-red-500" />
      </Button>
    </div>
  );
}
