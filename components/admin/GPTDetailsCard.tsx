import Link from "next/link";
import { GPTConfig } from "@/lib/types";

interface GPTDetailsCardProps {
  selectedGpt: GPTConfig;
  generalSystemPrompt: string;
}

export function GPTDetailsCard({
  selectedGpt,
  generalSystemPrompt
}: GPTDetailsCardProps) {
  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">GPT Details</h2>
          <p className="text-sm text-gray-500">Configuration and management</p>
        </div>
        <Link
          href={`/gpt5/${selectedGpt.gptId}`}
          className="inline-flex items-center gap-2 px-4 py-2 bg-linear-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all shadow-lg hover:shadow-xl"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
          Open Chat
        </Link>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium text-gray-500">
            Identifier
          </label>
          <p className="mt-1 font-mono bg-gray-50 p-2 rounded-lg text-sm">
            {selectedGpt.gptId}
          </p>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-500">Model</label>
          <div className="mt-1 inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-sm font-medium">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            {selectedGpt.model}
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-500">API Key</label>
          <div className="mt-1">
            {selectedGpt.apiKey ? (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-700 rounded-full text-sm font-medium">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                Custom API Key
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-sm font-medium">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                Using Default API Key
              </div>
            )}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-500">
              System Prompt
            </label>
            <span className="text-xs text-gray-400">
              {(selectedGpt.systemPrompt || "").length} chars
            </span>
          </div>
          <div className="mt-2 p-3 bg-gray-50 rounded-lg max-h-60 overflow-y-auto">
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
              {selectedGpt.systemPrompt}
            </p>
          </div>
          {generalSystemPrompt && (
            <div className="mt-2 text-xs text-blue-600 bg-blue-50 px-3 py-2 rounded-lg">
              <div className="flex items-center gap-1">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <span>
                  Default system prompt is prepended to this GPT's prompt
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
