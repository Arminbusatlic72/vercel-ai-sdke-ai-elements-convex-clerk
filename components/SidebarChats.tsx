// "use client";

// import { Id } from "@/convex/_generated/dataModel";
// import { Search } from "lucide-react";
// import ChatRow from "./ChatRow";
// import { NewChatItem } from "./NewChatItem";

// type ChatId = Id<"chats">;

// interface SidebarChatsProps {
//   chats: any[];
//   displayChats: any[];
//   isSearchOpen: boolean;
//   searchTerm: string;
//   debouncedSearch: string;
//   onSearchToggle: () => void;
//   onSearchChange: (value: string) => void;
//   onCloseSearch: () => void;
//   onNewChat: () => void;
//   onDeleteChat: (id: ChatId) => void;
// }

// export default function SidebarChats({
//   chats,
//   displayChats,
//   isSearchOpen,
//   searchTerm,
//   debouncedSearch,
//   onSearchToggle,
//   onSearchChange,
//   onCloseSearch,
//   onNewChat,
//   onDeleteChat
// }: SidebarChatsProps) {
//   if (chats.length === 0) return null;

//   return (
//     <div className="space-y-2">
//       <div className="flex items-center justify-between px-2">
//         <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
//           Chats
//         </h4>

//         <button
//           onClick={onSearchToggle}
//           className="p-1 rounded hover:bg-gray-100 transition-colors"
//           aria-label={isSearchOpen ? "Close search" : "Open search"}
//         >
//           <Search className="w-4 h-4 text-gray-500" />
//         </button>
//       </div>

//       {isSearchOpen && (
//         <div className="px-2">
//           <input
//             autoFocus
//             value={searchTerm}
//             onChange={(e) => onSearchChange(e.target.value)}
//             onKeyDown={(e) => {
//               if (e.key === "Escape") {
//                 onCloseSearch();
//               }
//             }}
//             placeholder="Search chats..."
//             className="w-full px-3 py-2 text-sm border rounded-lg bg-white outline-none focus:ring-2 focus:ring-blue-500"
//           />
//         </div>
//       )}

//       <NewChatItem onCreate={onNewChat} />

//       {displayChats.map((chat) => (
//         <ChatRow
//           key={chat._id}
//           chat={chat}
//           onDelete={(id) => onDeleteChat(id as ChatId)}
//         />
//       ))}

//       {isSearchOpen && debouncedSearch && displayChats.length === 0 && (
//         <div className="text-center text-gray-400 text-sm py-4">
//           No chats found for "{debouncedSearch}"
//         </div>
//       )}
//     </div>
//   );
// }

"use client";

import { useState } from "react";
import { Id } from "@/convex/_generated/dataModel";
import { Search, ChevronDown } from "lucide-react";
import ChatRow from "./ChatRow";
import { NewChatItem } from "./NewChatItem";
import { cn } from "@/lib/utils";

type ChatId = Id<"chats">;

interface SidebarChatsProps {
  chats: any[];
  displayChats: any[];
  isSearchOpen: boolean;
  searchTerm: string;
  debouncedSearch: string;
  onSearchToggle: () => void;
  onSearchChange: (value: string) => void;
  onCloseSearch: () => void;
  onNewChat: () => void;
  onDeleteChat: (id: ChatId) => void;
}

export default function SidebarChats({
  chats,
  displayChats,
  isSearchOpen,
  searchTerm,
  debouncedSearch,
  onSearchToggle,
  onSearchChange,
  onCloseSearch,
  onNewChat,
  onDeleteChat
}: SidebarChatsProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (chats.length === 0) return null;

  const handleToggleDropdown = () => {
    setIsOpen((prev) => {
      if (prev && isSearchOpen) {
        onCloseSearch();
      }
      return !prev;
    });
  };

  const handleSearchClick = () => {
    if (!isOpen) setIsOpen(true);
    onSearchToggle();
  };

  return (
    <div className="space-y-2">
      {/* <NewChatItem onCreate={onNewChat} /> */}

      {/* Header */}
      <div className="flex items-center justify-between px-2">
        <button
          onClick={handleToggleDropdown}
          className="flex items-center gap-1 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-700 transition-colors"
        >
          Chats
          <ChevronDown
            className={cn(
              "w-4 h-4 transition-transform duration-200",
              isOpen && "rotate-180"
            )}
          />
        </button>

        <button
          onClick={handleSearchClick}
          className="p-1 rounded hover:bg-gray-100 transition-colors"
          aria-label={isSearchOpen ? "Close search" : "Open search"}
        >
          <Search className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="space-y-2">
          {isSearchOpen && (
            <div className="px-2">
              <input
                autoFocus
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    onCloseSearch();
                  }
                }}
                placeholder="Search chats..."
                className="w-full px-3 py-2 text-sm border rounded-lg bg-white outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          {displayChats.map((chat) => (
            <ChatRow
              key={chat._id}
              chat={chat}
              onDelete={(id) => onDeleteChat(id as ChatId)}
            />
          ))}

          {isSearchOpen && debouncedSearch && displayChats.length === 0 && (
            <div className="text-center text-gray-400 text-sm py-4">
              No chats found for "{debouncedSearch}"
            </div>
          )}
        </div>
      )}
    </div>
  );
}
