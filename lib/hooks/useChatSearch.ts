import { useState, useEffect } from "react";
import { useQuery } from "convex/react";
import { Id } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";

export function useChatSearch({ projectId }: { projectId?: Id<"projects"> }) {
  const [searchQuery, setSearchQuery] = useState("");

  // Debounced search
  const [debouncedQuery, setDebouncedQuery] = useState(searchQuery);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Convex query returns array or undefined
  const chats =
    useQuery(api.chats.searchChats, {
      projectId,
      search: debouncedQuery
    }) ?? [];

  const isLoading = chats === undefined; // true while Convex has not returned

  return {
    searchQuery,
    setSearchQuery,
    debouncedQuery,
    chats,
    isLoading,
    hasSearchQuery: !!debouncedQuery,
    isEmpty: chats.length === 0,
    clearSearch: () => setSearchQuery("")
  };
}
