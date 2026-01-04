// }

"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, MessageSquare, Trash2, Pencil } from "lucide-react";
import { Button } from "./ui/button";
import { Id } from "@/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

type ChatType = {
  _id: Id<"chats">;
  title: string;
  createdAt: number;
  userId: string;
  gptId?: string;
};

interface ChatRowProps {
  chat: ChatType;
  onDelete: (id: Id<"chats">) => void;
}

export default function ChatRow({ chat, onDelete }: ChatRowProps) {
  const renameChat = useMutation(api.chats.renameChat);

  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(chat.title);

  const inputRef = useRef<HTMLInputElement>(null);

  const href = chat.gptId
    ? `/gpt5/${chat.gptId}/chat/${chat._id}`
    : `/gpt5/chat/${chat._id}`;

  // Autofocus + select text
  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  const save = async () => {
    const trimmed = title.trim();
    if (!trimmed || trimmed === chat.title) {
      cancel();
      return;
    }

    await renameChat({
      id: chat._id,
      title: trimmed
    });

    setIsEditing(false);
  };

  const cancel = () => {
    setTitle(chat.title);
    setIsEditing(false);
  };

  return (
    <div className="group relative">
      {!isEditing ? (
        <Link
          href={href}
          onDoubleClick={(e) => {
            e.preventDefault();
            setIsEditing(true);
          }}
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
      ) : (
        <div className="flex items-center gap-3 p-3 rounded-lg bg-white border border-gray-200">
          <MessageSquare className="w-4 h-4 text-gray-400 shrink-0" />

          <input
            ref={inputRef}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") save();
              if (e.key === "Escape") cancel();
            }}
            onBlur={save}
            className="flex-1 text-sm border-none outline-none bg-transparent"
          />
        </div>
      )}

      {!isEditing && (
        <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => e.preventDefault()}
              >
                <MoreHorizontal className="w-4 h-4 text-gray-400" />
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-36">
              <DropdownMenuItem
                onClick={(e) => {
                  e.preventDefault();
                  setIsEditing(true);
                }}
              >
                <Pencil className="w-4 h-4 mr-2" />
                Rename
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={(e) => {
                  e.preventDefault();
                  onDelete(chat._id);
                }}
                className="text-red-600 focus:text-red-600"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </div>
  );
}
