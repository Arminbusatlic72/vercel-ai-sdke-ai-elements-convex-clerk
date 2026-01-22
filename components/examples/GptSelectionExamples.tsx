// components/examples/GptSelectionExamples.tsx
/**
 * Real-world examples of using subscription-based GPT selection
 */

"use client";

import { useSubscriptionGpts } from "@/components/GptSelector";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState } from "react";

// ═══════════════════════════════════════════════════════════════════════════
// EXAMPLE 1: Chat Page with GPT Selector
// ═══════════════════════════════════════════════════════════════════════════

export function ChatPageExample() {
  const { gpts, isLoading, isEmpty } = useSubscriptionGpts();
  const [selectedGptId, setSelectedGptId] = useState<string>("");

  if (isLoading) {
    return <div className="animate-pulse">Loading GPTs...</div>;
  }

  if (isEmpty) {
    return (
      <div className="p-4 bg-blue-50 border border-blue-200 rounded">
        <h2 className="font-bold">No GPTs Available</h2>
        <p>
          You don't have an active subscription. Visit the{" "}
          <a href="/subscribe" className="text-blue-600 underline">
            subscribe page
          </a>{" "}
          to upgrade.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-2">Choose a GPT</label>
        <select
          value={selectedGptId}
          onChange={(e) => setSelectedGptId(e.target.value)}
          className="w-full px-3 py-2 border rounded"
        >
          <option value="">Select a GPT...</option>
          {gpts.map((gpt) => (
            <option key={gpt._id} value={gpt._id}>
              {gpt.gptId} ({gpt.model})
            </option>
          ))}
        </select>
      </div>

      {selectedGptId && (
        <button
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          onClick={() => {
            // Start chat with selected GPT
            console.log("Starting chat with GPT:", selectedGptId);
          }}
        >
          Start Chat
        </button>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// EXAMPLE 2: Dashboard showing subscription info + available GPTs
// ═══════════════════════════════════════════════════════════════════════════

export function SubscriptionDashboard() {
  const { gpts } = useSubscriptionGpts();
  const subscriptionData = useQuery(api.users.getUserSubscription);

  if (subscriptionData === undefined) return <div>Loading...</div>;

  const subscription = subscriptionData.subscription;
  const planLabel = subscriptionData.planLabel;

  return (
    <div className="space-y-6">
      {/* Subscription Info */}
      <div className="p-4 border rounded">
        <h2 className="font-bold mb-2">Your Plan</h2>
        <div className="space-y-1 text-sm">
          <p>
            <strong>Plan:</strong> {planLabel}
          </p>
          {subscription && (
            <>
              <p>
                <strong>Status:</strong>{" "}
                <span
                  className={
                    subscription.status === "active"
                      ? "text-green-600"
                      : "text-red-600"
                  }
                >
                  {subscription.status}
                </span>
              </p>
              <p>
                <strong>Max GPTs:</strong> {subscription.maxGpts}
              </p>
              {subscription.currentPeriodEnd && (
                <p>
                  <strong>Renews:</strong>{" "}
                  {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                </p>
              )}
            </>
          )}
        </div>
      </div>

      {/* Available GPTs */}
      <div className="p-4 border rounded">
        <h2 className="font-bold mb-3">Available GPTs ({gpts.length})</h2>
        {gpts.length === 0 ? (
          <p className="text-gray-500">No GPTs available for your plan</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {gpts.map((gpt) => (
              <div
                key={gpt._id}
                className="p-2 bg-gray-50 border rounded text-sm"
              >
                <p className="font-medium">{gpt.gptId}</p>
                <p className="text-gray-600">{gpt.model}</p>
                {gpt.systemPrompt && (
                  <p className="text-gray-500 text-xs mt-1 truncate">
                    {gpt.systemPrompt}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// EXAMPLE 3: GPT Grid with ability to start new chat
// ═══════════════════════════════════════════════════════════════════════════

export function GptGridExample() {
  const { gpts, isEmpty } = useSubscriptionGpts();

  if (isEmpty) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 mb-4">
          Subscribe to unlock GPTs for your workspace
        </p>
        <a
          href="/subscribe"
          className="inline-block px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          View Plans
        </a>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {gpts.map((gpt) => (
        <div
          key={gpt._id}
          className="p-4 border rounded-lg hover:shadow-lg transition"
        >
          <h3 className="font-bold text-lg mb-1">{gpt.gptId}</h3>
          <p className="text-sm text-gray-600 mb-3">{gpt.model}</p>
          {gpt.systemPrompt && (
            <p className="text-sm text-gray-700 mb-4 line-clamp-3">
              {gpt.systemPrompt}
            </p>
          )}
          <button
            className="w-full px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
            onClick={() => {
              // Navigate to chat with this GPT
              console.log("Starting chat with:", gpt.gptId);
            }}
          >
            Chat with {gpt.gptId}
          </button>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// EXAMPLE 4: Sidebar with user's GPTs
// ═══════════════════════════════════════════════════════════════════════════

export function SidebarGptList() {
  const { gpts } = useSubscriptionGpts();
  const [activeGptId, setActiveGptId] = useState<string>("");

  return (
    <div className="w-64 bg-gray-50 border-r p-4 h-screen flex flex-col">
      <h2 className="font-bold mb-4">Available GPTs</h2>

      <div className="flex-1 overflow-y-auto space-y-2">
        {gpts.length === 0 ? (
          <p className="text-sm text-gray-500">No GPTs available</p>
        ) : (
          gpts.map((gpt) => (
            <button
              key={gpt._id}
              onClick={() => setActiveGptId(gpt._id)}
              className={`w-full text-left px-3 py-2 rounded text-sm transition ${
                activeGptId === gpt._id
                  ? "bg-blue-600 text-white"
                  : "hover:bg-gray-200"
              }`}
            >
              {gpt.gptId}
            </button>
          ))
        )}
      </div>

      <a
        href="/subscribe"
        className="text-sm text-blue-600 hover:underline mt-4"
      >
        Upgrade Plan
      </a>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// EXAMPLE 5: New Chat Button with GPT Selection
// ═══════════════════════════════════════════════════════════════════════════

export function NewChatButton() {
  const { gpts, isEmpty } = useSubscriptionGpts();
  const [showDropdown, setShowDropdown] = useState(false);

  if (isEmpty) {
    return (
      <button
        disabled
        className="px-4 py-2 bg-gray-300 text-gray-600 rounded cursor-not-allowed"
        title="Subscribe to create a chat"
      >
        No GPTs Available
      </button>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        New Chat ▼
      </button>

      {showDropdown && (
        <div className="absolute top-full left-0 mt-2 w-48 bg-white border rounded shadow-lg z-10">
          {gpts.map((gpt) => (
            <button
              key={gpt._id}
              onClick={() => {
                console.log("Create chat with:", gpt._id);
                setShowDropdown(false);
              }}
              className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm"
            >
              Chat with {gpt.gptId}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// USAGE SUMMARY
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Import any of these components:
 *
 * import { ChatPageExample } from "@/components/examples/GptSelectionExamples"
 * import { SubscriptionDashboard } from "@/components/examples/GptSelectionExamples"
 * import { GptGridExample } from "@/components/examples/GptSelectionExamples"
 * import { SidebarGptList } from "@/components/examples/GptSelectionExamples"
 * import { NewChatButton } from "@/components/examples/GptSelectionExamples"
 *
 * All use the same hook: useSubscriptionGpts()
 * All show only GPTs from the user's active subscription
 * All automatically update when subscription changes
 */
