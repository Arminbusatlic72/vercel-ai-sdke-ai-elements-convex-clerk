// components/GptSelector.tsx
// Example component showing how to use the subscription GPTs query
"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState } from "react";

export type Gpt = {
  _id: string;
  _creationTime: number;
  gptId: string;
  model: string;
  apiKey?: string;
  packageId?: string;
  vectorStoreId?: string;
  systemPrompt?: string;
  createdAt: number;
  updatedAt: number;
};

/**
 * Component that displays GPTs available from the user's subscription package
 *
 * This query automatically:
 * - Gets the current user
 * - Checks their active subscription
 * - Finds the matching package
 * - Returns only GPTs from that package
 */
export function GptSelector() {
  const [selectedGptId, setSelectedGptId] = useState<string | null>(null);

  // Query returns GPTs from user's subscription package (or empty if no subscription)
  const subscriptionGpts = useQuery(api.packages.getSubscriptionGpts) as
    | Gpt[]
    | undefined;

  // Loading state
  if (subscriptionGpts === undefined) {
    return (
      <div className="p-4">
        <div className="animate-pulse bg-gray-200 h-10 rounded" />
      </div>
    );
  }

  // No GPTs available
  if (subscriptionGpts.length === 0) {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded">
        <p className="text-yellow-800">
          No GPTs available. Please check your subscription.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium">Select a GPT</label>

      <select
        value={selectedGptId || ""}
        onChange={(e) => setSelectedGptId(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
      >
        <option value="">Choose a GPT...</option>
        {subscriptionGpts.map((gpt) => (
          <option key={gpt._id} value={gpt._id}>
            {gpt.gptId} ({gpt.model})
          </option>
        ))}
      </select>

      {selectedGptId && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
          <p className="text-sm text-blue-900">
            Selected:{" "}
            {subscriptionGpts.find((g) => g._id === selectedGptId)?.gptId}
          </p>
        </div>
      )}

      {/* Debug: Show count */}
      <p className="text-xs text-gray-500 mt-2">
        {subscriptionGpts.length} GPT{subscriptionGpts.length !== 1 ? "s" : ""}{" "}
        available
      </p>
    </div>
  );
}

/**
 * Alternative: Hook for using GPTs in other components
 */
export function useSubscriptionGpts() {
  const gpts = useQuery(api.packages.getSubscriptionGpts) as Gpt[] | undefined;

  return {
    gpts: gpts || [],
    isLoading: gpts === undefined,
    isEmpty: gpts !== undefined && gpts.length === 0
  };
}

/**
 * Usage examples:
 *
 * // In a dropdown selector
 * <GptSelector />
 *
 * // In a custom component
 * const { gpts, isLoading } = useSubscriptionGpts();
 * if (isLoading) return <Skeleton />;
 * return gpts.map(gpt => <div key={gpt._id}>{gpt.gptId}</div>);
 */
