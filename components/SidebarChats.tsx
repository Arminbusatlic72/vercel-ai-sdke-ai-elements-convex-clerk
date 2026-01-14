"use client";

import { useState } from "react";
import { Id } from "@/convex/_generated/dataModel";
import { Search, ChevronDown, MessageSquare, X, Loader2 } from "lucide-react";
import ChatRow from "./ChatRow";
import { cn } from "@/lib/utils";
import { useChatSearch } from "@/lib/hooks/useChatSearch";

type ChatId = Id<"chats">;

interface SidebarChatsProps {
  projectId?: Id<"projects">;
  onDeleteChat: (id: ChatId) => void;
}

export default function SidebarChats({
  projectId,
  onDeleteChat
}: SidebarChatsProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Use the search hook
  const {
    searchQuery,
    setSearchQuery,
    clearSearch,
    debouncedQuery,
    hasSearchQuery: isSearching,
    isLoading,
    chats,
    isEmpty,
    hasSearchQuery
  } = useChatSearch({ projectId });

  const displayChats = chats || [];
  const totalChatsCount = displayChats.length;

  const handleToggleDropdown = () => {
    setIsOpen((prev) => {
      const newIsOpen = !prev;
      // Clear search when closing the section
      if (!newIsOpen && isSearchOpen) {
        setIsSearchOpen(false);
        clearSearch();
      }
      return newIsOpen;
    });
  };

  const handleSearchClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsSearchOpen((prev) => !prev);
    if (isSearchOpen) {
      clearSearch();
    }
  };

  const handleCloseSearch = () => {
    setIsSearchOpen(false);
    clearSearch();
  };

  const handleClearSearch = (e: React.MouseEvent) => {
    e.stopPropagation();
    clearSearch();
  };

  if (!isLoading && totalChatsCount === 0 && !hasSearchQuery) {
    return null;
  }

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={handleToggleDropdown}
          className="flex items-center justify-between gap-2 hover:bg-gray-50 rounded-lg px-2 py-1 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-700 uppercase tracking-wider">
            <MessageSquare className="w-4 h-4" />
            All Chats ({isLoading ? "..." : totalChatsCount})
          </div>
          <ChevronDown
            className={cn(
              "w-4 h-4 text-gray-400 transition-transform duration-200",
              !isOpen && "rotate-180"
            )}
          />
        </button>

        {/* Only show search button when section is open */}
        {isOpen && (
          <button
            onClick={handleSearchClick}
            className={cn(
              "p-1.5 rounded-lg transition-colors cursor-pointer",
              isSearchOpen
                ? "bg-blue-100 text-blue-600"
                : "hover:bg-gray-100 text-gray-500"
            )}
            aria-label={isSearchOpen ? "Close search" : "Open search"}
          >
            <Search className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="space-y-2">
          {/* Search Input */}
          {isSearchOpen && (
            <div className="px-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  autoFocus
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      handleCloseSearch();
                    }
                  }}
                  placeholder="Search chats..."
                  className="w-full pl-10 pr-8 py-2 text-sm border border-gray-300 rounded-lg bg-white outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {searchQuery && (
                  <button
                    onClick={handleClearSearch}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 p-0.5 hover:bg-gray-100 rounded"
                    aria-label="Clear search"
                  >
                    {isSearching ? (
                      <Loader2 className="w-3 h-3 text-gray-400 animate-spin" />
                    ) : (
                      <X className="w-3 h-3 text-gray-400" />
                    )}
                  </button>
                )}
              </div>

              {hasSearchQuery && !isLoading && (
                <p className="text-xs text-gray-500 mt-2 px-1">
                  {isEmpty
                    ? "No chats found"
                    : `${totalChatsCount} ${
                        totalChatsCount === 1 ? "chat" : "chats"
                      } found`}
                </p>
              )}
            </div>
          )}

          {isLoading && (
            <div className="flex items-center justify-center p-4">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          )}

          {!isLoading && displayChats.length > 0 && (
            <div className="space-y-1">
              {displayChats.map((chat) => (
                <ChatRow
                  key={chat._id}
                  chat={chat}
                  onDelete={(id) => onDeleteChat(id as ChatId)}
                  highlight={isSearchOpen ? debouncedQuery : undefined}
                />
              ))}
            </div>
          )}

          {!isLoading && hasSearchQuery && isEmpty && (
            <div className="text-center p-4 border border-gray-200 rounded-lg bg-gray-50 mx-2">
              <p className="text-gray-500 text-sm">
                No chats found for{" "}
                <span className="font-medium">"{debouncedQuery}"</span>
              </p>
              <button
                onClick={() => clearSearch()}
                className="text-xs text-blue-600 hover:text-blue-700 mt-2"
              >
                Clear search
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
