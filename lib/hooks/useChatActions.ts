// hooks/useChatActions.ts
import { useState, useRef, useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

interface UseChatActionsProps {
  chatId: Id<"chats">;
  initialTitle: string;
  onDeleteSuccess?: (id: Id<"chats">) => void;
  onRenameSuccess?: (id: Id<"chats">, newTitle: string) => void;
}

export function useChatActions({
  chatId,
  initialTitle,
  onDeleteSuccess,
  onRenameSuccess
}: UseChatActionsProps) {
  // Convex mutations
  const renameChat = useMutation(api.chats.renameChat);

  // State
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(initialTitle);

  // Ref for input focus
  const inputRef = useRef<HTMLInputElement>(null);

  // Autofocus + select text when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  // Sync title if initialTitle changes externally
  useEffect(() => {
    setTitle(initialTitle);
  }, [initialTitle]);

  // Start editing
  const startEditing = () => {
    setIsEditing(true);
  };

  // Save rename
  const save = async () => {
    const trimmed = title.trim();

    // If no change or empty, just cancel
    if (!trimmed || trimmed === initialTitle) {
      cancel();
      return;
    }

    try {
      await renameChat({
        id: chatId,
        title: trimmed
      });

      setIsEditing(false);
      onRenameSuccess?.(chatId, trimmed);
    } catch (error) {
      console.error("Failed to rename chat:", error);
      // Revert to original title on error
      cancel();
    }
  };

  // Cancel editing
  const cancel = () => {
    setTitle(initialTitle);
    setIsEditing(false);
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      save();
    } else if (e.key === "Escape") {
      e.preventDefault();
      cancel();
    }
  };

  return {
    // State
    isEditing,
    title,
    inputRef,

    // Actions
    setTitle,
    startEditing,
    save,
    cancel,
    handleKeyDown,

    // For compatibility with onDelete prop pattern
    handleRename: save,
    handleCancel: cancel
  };
}
