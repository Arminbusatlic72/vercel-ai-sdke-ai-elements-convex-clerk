// "use client";

// import { useState } from "react";
// import Link from "next/link";
// import { MessageSquare, Calendar, Check, X } from "lucide-react";
// import { cn } from "@/lib/utils";
// import { Id } from "@/convex/_generated/dataModel";
// import { useChatActions } from "@/lib/hooks/useChatActions";
// import { ChatActionButtons } from "@/components/ChatActionButtons";

// type ChatType = {
//   _id: Id<"chats">;
//   title: string;
//   _creationTime: number;
//   gptId?: string;
// };

// interface ProjectChatCardProps {
//   chat: ChatType;
//   gptId: string;
//   projectId: Id<"projects">;
//   userId: string;
//   onDelete?: (chatId: Id<"chats">) => void;
// }

// export default function ProjectChatCard({
//   chat,
//   gptId,
//   projectId,
//   userId,
//   onDelete
// }: ProjectChatCardProps) {
//   const {
//     isEditing,
//     isDeleting,
//     isRenaming,
//     isDeleted,
//     title,
//     setTitle,
//     inputRef,
//     handleRename,
//     handleDelete,
//     startEditing,
//     cancelEditing
//   } = useChatActions({
//     chatId: chat._id,
//     initialTitle: chat.title
//   });
//  // Add local states for these if useChatActions doesn't provide them
//   const [isDeleting, setIsDeleting] = useState(false);
//   const [isRenaming, setIsRenaming] = useState(false);
//   const [isDeleted, setIsDeleted] = useState(false);
//   const href = `/gpt5/${gptId}/project/${projectId}?chatId=${chat._id}`;

//   // Format date
//   const formatCompactDate = (timestamp: number): string => {
//     const chatDate = new Date(timestamp);
//     const now = new Date();

//     const diffTime = Math.abs(now.getTime() - chatDate.getTime());
//     const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

//     if (diffDays === 0) {
//       const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
//       if (diffHours === 0) {
//         const diffMinutes = Math.floor(diffTime / (1000 * 60));
//         return diffMinutes < 1 ? "Just now" : `${diffMinutes}m`;
//       }
//       return `${diffHours}h`;
//     }

//     if (diffDays === 1) return "1d";
//     if (diffDays < 7) return `${diffDays}d`;
//     if (diffDays < 30) return `${Math.floor(diffDays / 7)}w`;
//     if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo`;
//     return `${Math.floor(diffDays / 365)}y`;
//   };

//   // Enhanced delete handler to notify parent
//   const enhancedDelete = async () => {
//     const success = await handleDelete();
//     if (success && onDelete) {
//       onDelete(chat._id);
//     }
//   };

//   // Save function - same logic as ChatRow
//   const save = async () => {
//     const trimmed = title.trim();
//     if (!trimmed || trimmed === chat.title) {
//       cancel();
//       return;
//     }

//     try {
//       await handleRename(title);
//     } catch (error) {
//       console.error("Failed to rename chat:", error);
//       cancel();
//     }
//   };

//   // Cancel function
//   const cancel = () => {
//     setTitle(chat.title);
//     cancelEditing();
//   };

//   // Handle Enter and Escape keys
//   const handleKeyDown = (e: React.KeyboardEvent) => {
//     if (e.key === "Enter") {
//       save();
//     }
//     if (e.key === "Escape") {
//       cancel();
//     }
//   };

//   // If chat is deleted, don't render anything
//   if (isDeleted) {
//     return null;
//   }

//   return (
//     <div
//       className={cn(
//         "group relative transition-all duration-200",
//         isDeleting && "opacity-50 pointer-events-none",
//         isRenaming && "opacity-80"
//       )}
//     >
//       {!isEditing ? (
//         <>
//           <Link
//             href={href}
//             onDoubleClick={(e) => {
//               e.preventDefault();
//               startEditing();
//             }}
//             className="block p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all duration-200"
//           >
//             <div className="flex items-start gap-3">
//               <div className="flex-shrink-0 p-2 bg-blue-100 rounded-lg">
//                 <MessageSquare className="w-5 h-5 text-blue-600" />
//               </div>

//               <div className="flex-1 min-w-0">
//                 <div className="flex items-center gap-2 mb-1">
//                   <h3 className="text-sm font-semibold text-gray-900 truncate">
//                     {title || "Untitled Chat"}
//                   </h3>
//                   {isRenaming && (
//                     <span className="text-xs text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
//                       Saving...
//                     </span>
//                   )}
//                 </div>

//                 <div className="flex items-center justify-between">
//                   <div className="flex items-center gap-1 text-xs text-gray-400">
//                     <Calendar className="w-3 h-3" />
//                     <span>{formatCompactDate(chat._creationTime)}</span>
//                   </div>

//                   <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
//                     <span className="text-xs text-blue-600 font-medium">
//                       Open →
//                     </span>
//                   </div>
//                 </div>
//               </div>
//             </div>
//           </Link>

//           {/* Actions Dropdown - ONLY show when NOT editing, NOT deleting, and NOT renaming */}
//           {!isDeleting && !isRenaming && (
//             <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
//               <ChatActionButtons
//                 onRename={startEditing}
//                 onDelete={enhancedDelete}
//               />
//             </div>
//           )}
//         </>
//       ) : (
//         /* Edit Mode - Show input field with save/cancel buttons */
//         <div className="p-4 rounded-lg border border-blue-200 bg-blue-50">
//           <div className="flex items-start gap-3">
//             <div className="flex-shrink-0 p-2 bg-blue-100 rounded-lg">
//               <MessageSquare className="w-5 h-5 text-blue-600" />
//             </div>

//             <div className="flex-1">
//               <input
//                 ref={inputRef}
//                 value={title}
//                 onChange={(e) => setTitle(e.target.value)}
//                 onKeyDown={handleKeyDown}
//                 onBlur={save}
//                 className="w-full text-sm font-medium text-gray-900 bg-transparent border-none outline-none mb-1"
//                 placeholder="Chat title..."
//               />
//               <div className="flex items-center gap-3">
//                 <button
//                   onClick={save}
//                   className="text-xs text-green-600 hover:text-green-700 font-medium flex items-center gap-1"
//                 >
//                   <Check className="w-3 h-3" />
//                   Save
//                 </button>
//                 <button
//                   onClick={cancel}
//                   className="text-xs text-gray-500 hover:text-gray-700 font-medium flex items-center gap-1"
//                 >
//                   <X className="w-3 h-3" />
//                   Cancel
//                 </button>
//                 <span className="text-xs text-gray-400">
//                   Press Enter to save
//                 </span>
//               </div>
//             </div>
//           </div>
//         </div>
//       )}

//       {/* Deleting overlay */}
//       {isDeleting && (
//         <div className="absolute inset-0 bg-gray-50 bg-opacity-90 rounded-lg flex items-center justify-center">
//           <div className="text-sm text-gray-600">Deleting...</div>
//         </div>
//       )}
//     </div>
//   );
// }

"use client";

import { useState } from "react";
import Link from "next/link";
import { MessageSquare, Calendar, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Id } from "@/convex/_generated/dataModel";
import { useChatActions } from "@/lib/hooks/useChatActions";
import { ChatActionButtons } from "@/components/ChatActionButtons";

// Import Convex delete mutation
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

type ChatType = {
  _id: Id<"chats">;
  title: string;
  _creationTime: number;
  gptId?: string;
};

interface ProjectChatCardProps {
  chat: ChatType;
  gptId: string;
  projectId: Id<"projects">;
  userId: string;
  onDelete?: (chatId: Id<"chats">) => void;
}

export default function ProjectChatCard({
  chat,
  gptId,
  projectId,
  userId,
  onDelete
}: ProjectChatCardProps) {
  // ✅ CORRECT: Pass parameters to useChatActions
  const {
    isEditing,
    title,
    inputRef,
    setTitle,
    startEditing,
    save,
    cancel,
    handleKeyDown,
    handleRename,
    handleCancel
  } = useChatActions({
    chatId: chat._id,
    initialTitle: chat.title,
    onRenameSuccess: (id, newTitle) => {
      console.log(`Chat ${id} renamed to: ${newTitle}`);
    }
  });

  // Add local states for loading states
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [isDeleted, setIsDeleted] = useState(false);

  // Import delete mutation
  const deleteChat = useMutation(api.chats.deleteChat);

  const href = `/gpt5/${gptId}/project/${projectId}?chatId=${chat._id}`;

  // Format date
  const formatCompactDate = (timestamp: number): string => {
    const chatDate = new Date(timestamp);
    const now = new Date();

    const diffTime = Math.abs(now.getTime() - chatDate.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
      if (diffHours === 0) {
        const diffMinutes = Math.floor(diffTime / (1000 * 60));
        return diffMinutes < 1 ? "Just now" : `${diffMinutes}m`;
      }
      return `${diffHours}h`;
    }

    if (diffDays === 1) return "1d";
    if (diffDays < 7) return `${diffDays}d`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo`;
    return `${Math.floor(diffDays / 365)}y`;
  };

  // Delete function using Convex mutation
  const handleDelete = async (): Promise<boolean> => {
    try {
      await deleteChat({ id: chat._id }); // Note: Might need { chatId: chat._id } depending on your API
      return true;
    } catch (error) {
      console.error("Failed to delete chat:", error);
      return false;
    }
  };

  // Enhanced delete handler to notify parent
  const enhancedDelete = async () => {
    setIsDeleting(true);
    try {
      const success = await handleDelete();
      if (success) {
        setIsDeleted(true);
        if (onDelete) {
          onDelete(chat._id);
        }
      }
    } catch (error) {
      console.error("Failed to delete chat:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  // Save function - modified to use hook's save
  const saveHandler = async () => {
    setIsRenaming(true);
    try {
      await save(); // Uses the save function from useChatActions
    } catch (error) {
      console.error("Failed to rename chat:", error);
    } finally {
      setIsRenaming(false);
    }
  };

  // Cancel function
  const cancelHandler = () => {
    cancel(); // Uses the cancel function from useChatActions
  };

  // If chat is deleted, don't render anything
  if (isDeleted) {
    return null;
  }

  return (
    <div
      className={cn(
        "group relative transition-all duration-200",
        isDeleting && "opacity-50 pointer-events-none",
        isRenaming && "opacity-80"
      )}
    >
      {!isEditing ? (
        <>
          <Link
            href={href}
            onDoubleClick={(e) => {
              e.preventDefault();
              startEditing();
            }}
            className="block p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all duration-200"
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 p-2 bg-blue-100 rounded-lg">
                <MessageSquare className="w-5 h-5 text-blue-600" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-sm font-semibold text-gray-900 truncate">
                    {title || "Untitled Chat"}
                  </h3>
                  {isRenaming && (
                    <span className="text-xs text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                      Saving...
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 text-xs text-gray-400">
                    <Calendar className="w-3 h-3" />
                    <span>{formatCompactDate(chat._creationTime)}</span>
                  </div>

                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-xs text-blue-600 font-medium">
                      Open →
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </Link>

          {/* Actions Dropdown - ONLY show when NOT editing, NOT deleting, and NOT renaming */}
          {!isDeleting && !isRenaming && (
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <ChatActionButtons
                onRename={startEditing}
                onDelete={enhancedDelete}
              />
            </div>
          )}
        </>
      ) : (
        /* Edit Mode - Show input field with save/cancel buttons */
        <div className="p-4 rounded-lg border border-blue-200 bg-blue-50">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 p-2 bg-blue-100 rounded-lg">
              <MessageSquare className="w-5 h-5 text-blue-600" />
            </div>

            <div className="flex-1">
              <input
                ref={inputRef}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={saveHandler}
                className="w-full text-sm font-medium text-gray-900 bg-transparent border-none outline-none mb-1"
                placeholder="Chat title..."
              />
              <div className="flex items-center gap-3">
                <button
                  onClick={saveHandler}
                  className="text-xs text-green-600 hover:text-green-700 font-medium flex items-center gap-1"
                >
                  <Check className="w-3 h-3" />
                  Save
                </button>
                <button
                  onClick={cancelHandler}
                  className="text-xs text-gray-500 hover:text-gray-700 font-medium flex items-center gap-1"
                >
                  <X className="w-3 h-3" />
                  Cancel
                </button>
                <span className="text-xs text-gray-400">
                  Press Enter to save
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Deleting overlay */}
      {isDeleting && (
        <div className="absolute inset-0 bg-gray-50 bg-opacity-90 rounded-lg flex items-center justify-center">
          <div className="text-sm text-gray-600">Deleting...</div>
        </div>
      )}
    </div>
  );
}
