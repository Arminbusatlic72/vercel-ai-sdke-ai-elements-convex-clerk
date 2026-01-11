// hooks/useChatSearch.ts
import { useState, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

interface UseChatSearchProps {
  projectId?: Id<"projects">;
  debounceMs?: number;
}

export function useChatSearch({
  projectId,
  debounceMs = 300
}: UseChatSearchProps = {}) {
  // Input value (what user types)
  const [searchQuery, setSearchQuery] = useState("");

  // Debounced value (what gets sent to Convex)
  const [debouncedQuery, setDebouncedQuery] = useState("");

  // Debounce the search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [searchQuery, debounceMs]);

  // Query Convex with the debounced search
  const chats = useQuery(api.chats.searchChats, {
    projectId,
    search: debouncedQuery
  });

  // Helper states
  const isSearching = searchQuery !== debouncedQuery;
  const isLoading = chats === undefined;
  const hasResults = chats && chats.length > 0;
  const isEmpty = chats && chats.length === 0;
  const hasSearchQuery = debouncedQuery.length > 0;

  // Clear search
  const clearSearch = () => {
    setSearchQuery("");
    setDebouncedQuery("");
  };

  return {
    // Search input
    searchQuery,
    setSearchQuery,
    clearSearch,

    // Query state
    debouncedQuery,
    isSearching,
    isLoading,

    // Results
    chats,
    hasResults,
    isEmpty,
    hasSearchQuery,
    resultCount: chats?.length ?? 0
  };
}
