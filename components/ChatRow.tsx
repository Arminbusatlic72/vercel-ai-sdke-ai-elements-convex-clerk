"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";

import { MessageSquare, Calendar, Clock } from "lucide-react";

import { cn } from "@/lib/utils";
import { Id } from "@/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { ChatActionButtons } from "./ChatActionButtons";

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
  variant?: "default" | "project";
  highlight?: string;
}

export default function ChatRow({
  chat,
  onDelete,
  variant = "default",
  highlight
}: ChatRowProps) {
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

  // Helper: Check if two dates are the same day
  const isSameDay = (date1: Date, date2: Date): boolean => {
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    );
  };

  // Helper: Get start of day (midnight)
  const getStartOfDay = (date: Date): Date => {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    return start;
  };

  // Format date to be compact and always fit
  const formatCompactDate = (timestamp: number): string => {
    const chatDate = new Date(timestamp);
    const now = new Date();
    const nowStart = getStartOfDay(now);
    const chatStart = getStartOfDay(chatDate);

    const diffTime = Math.abs(now.getTime() - chatDate.getTime());
    const diffDays = Math.ceil(
      Math.abs(nowStart.getTime() - chatStart.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Today (same calendar day)
    if (isSameDay(chatDate, now)) {
      const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
      if (diffHours === 0) {
        const diffMinutes = Math.floor(diffTime / (1000 * 60));
        return diffMinutes < 1 ? "Just now" : `${diffMinutes}m`;
      }
      return `${diffHours}h`;
    }

    // Yesterday (previous calendar day)
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (isSameDay(chatDate, yesterday)) return "1d";

    // This week (2-6 days ago)
    if (diffDays < 7) return `${diffDays}d`;

    // This month (1-4 weeks ago)
    if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7);
      return `${weeks}w`;
    }

    // This year (1-11 months ago)
    if (diffDays < 365) {
      const months = Math.floor(diffDays / 30);
      return `${months}mo`;
    }

    // Over a year
    const years = Math.floor(diffDays / 365);
    return `${years}y`;
  };

  // For full date display
  const formatFullDate = (timestamp: number): string => {
    const chatDate = new Date(timestamp);
    const now = new Date();
    const nowStart = getStartOfDay(now);
    const chatStart = getStartOfDay(chatDate);

    const diffDays = Math.ceil(
      Math.abs(nowStart.getTime() - chatStart.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7);
      return `${weeks} ${weeks === 1 ? "week" : "weeks"} ago`;
    }
    if (diffDays < 365) {
      const months = Math.floor(diffDays / 30);
      return `${months} ${months === 1 ? "month" : "months"} ago`;
    }

    const years = Math.floor(diffDays / 365);
    return `${years} ${years === 1 ? "year" : "years"} ago`;
  };

  // Format detailed date/time for tooltip
  const formatDetailedDateTime = (timestamp: number): string => {
    const date = new Date(timestamp);
    const options: Intl.DateTimeFormatOptions = {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    };
    return date.toLocaleDateString("en-US", options);
  };

  // Highlight search terms
  const highlightText = (text: string, searchTerm?: string) => {
    if (!searchTerm || !text) return text;

    // Escape special regex characters
    const escaped = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`(${escaped})`, "gi");

    return text.split(regex).map((part, i) =>
      regex.test(part) ? (
        <span
          key={i}
          className="bg-yellow-100 text-yellow-800 font-medium px-0.5 rounded"
        >
          {part}
        </span>
      ) : (
        part
      )
    );
  };

  const save = async () => {
    const trimmed = title.trim();
    if (!trimmed || trimmed === chat.title) {
      cancel();
      return;
    }

    try {
      await renameChat({
        id: chat._id,
        title: trimmed
      });
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to rename chat:", error);
      cancel();
    }
  };

  const cancel = () => {
    setTitle(chat.title);
    setIsEditing(false);
  };

  // Determine styling based on variant
  const containerClass = cn(
    "group relative transition-all duration-200",
    variant === "project" ? "pl-3" : "px-2"
  );

  const linkClass = cn(
    "flex items-center gap-3 p-1 rounded-lg transition-all duration-200",
    variant === "project"
      ? "hover:bg-blue-50 border-l-2 border-transparent hover:border-blue-300"
      : "hover:bg-gray-100 border border-transparent hover:border-gray-200",
    isEditing && "bg-white border-gray-300 shadow-sm"
  );

  return (
    <div className={containerClass}>
      {!isEditing ? (
        <Link
          href={href}
          onDoubleClick={(e) => {
            e.preventDefault();
            setIsEditing(true);
          }}
          className={linkClass}
        >
          {/* Chat Icon */}
          <div
            className={cn(
              "flex items-center justify-center w-8 h-8 rounded-lg shrink-0",
              variant === "project"
                ? "bg-blue-100 text-blue-600"
                : "bg-gray-100 text-gray-600"
            )}
          >
            <MessageSquare className="w-4 h-4" />
          </div>

          {/* Chat Details - RESPONSIVE DESIGN */}
          <div className="flex-1 min-w-0 space-y-1">
            {/* Title - Always fits, truncates if needed - FIX: Pass highlight prop */}
            <p className="text-sm font-medium text-gray-900 truncate">
              {highlightText(chat.title, highlight)}
            </p>

            {/* Date/Time Info - CLEAN LAYOUT */}
            <div className="flex items-center gap-2 text-xs text-gray-500">
              {/* Mobile/Compact: Just compact date with icon */}
              <div
                className="flex items-center gap-1 sm:hidden"
                title={formatDetailedDateTime(chat.createdAt)}
              >
                <Calendar className="w-4 h-4 flex-shrink-0" />
                <span className="truncate max-w-[50px]">
                  {formatCompactDate(chat.createdAt)}
                </span>
              </div>

              {/* Tablet+: Compact date + time */}
              <div
                className="hidden sm:flex sm:items-center sm:gap-1"
                title={formatDetailedDateTime(chat.createdAt)}
              >
                <Calendar className="w-3 h-3 flex-shrink-0" />
                <span className="truncate max-w-[60px]">
                  {formatCompactDate(chat.createdAt)}
                </span>
              </div>

              {/* Desktop: Full date info */}
              <div className="hidden md:flex md:items-center md:gap-2">
                <span className="text-gray-400">•</span>
                <span className="truncate max-w-[120px]">
                  {formatFullDate(chat.createdAt)}
                </span>
                <Clock className="w-3 h-3 flex-shrink-0 text-gray-400" />
                <span className="text-gray-600">
                  {new Date(chat.createdAt).toLocaleTimeString("en-US", {
                    hour: "numeric",
                    minute: "2-digit",
                    hour12: true
                  })}
                </span>
              </div>
            </div>
          </div>

          {/* GPT Badge - Shows on all screen sizes */}
          {chat.gptId && (
            <span
              className={cn(
                "text-xs px-1.5 py-0.5 rounded shrink-0",
                "hidden xs:inline-block",
                variant === "project"
                  ? "bg-blue-100 text-blue-700"
                  : "bg-gray-100 text-gray-700"
              )}
              title="GPT-specific chat"
            >
              GPT
            </span>
          )}
        </Link>
      ) : (
        /* Edit Mode */
        <div
          className={cn(
            "flex items-center gap-3 p-3 rounded-lg",
            variant === "project"
              ? "bg-blue-50 border border-blue-200"
              : "bg-white border border-gray-300"
          )}
        >
          <div
            className={cn(
              "flex items-center justify-center w-8 h-8 rounded-lg shrink-0",
              variant === "project"
                ? "bg-blue-100 text-blue-600"
                : "bg-gray-100 text-gray-600"
            )}
          >
            <MessageSquare className="w-4 h-4" />
          </div>

          <div className="flex-1">
            <input
              ref={inputRef}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") save();
                if (e.key === "Escape") cancel();
              }}
              onBlur={save}
              className="w-full text-sm font-medium text-gray-900 bg-transparent border-none outline-none"
              placeholder="Chat title..."
            />
            <p className="text-xs text-gray-500 mt-1">
              Press Enter to save, Esc to cancel
            </p>
          </div>
        </div>
      )}

      {/* Actions Dropdown */}
      {!isEditing && (
        <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
          <ChatActionButtons
            onRename={() => setIsEditing(true)}
            onDelete={() => onDelete(chat._id)}
          />
        </div>
      )}
    </div>
  );
}
