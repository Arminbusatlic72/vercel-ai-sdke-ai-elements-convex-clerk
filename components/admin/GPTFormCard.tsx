import { LoadingSpinner } from "./LoadingSpinner";

interface GPTFormCardProps {
  isEditing: boolean;
  gptIdInput: string;
  model: string;
  apiKey: string;
  systemPrompt: string;
  generalSystemPrompt: string;
  isSubmitting: boolean;
  sanitizedPreview: string;
  showPreview: boolean;
  modelOptions: string[];
  onGptIdChange: (value: string) => void;
  onModelChange: (value: string) => void;
  onApiKeyChange: (value: string) => void;
  onSystemPromptChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onReset: () => void;
}

export function GPTFormCard({
  isEditing,
  gptIdInput,
  model,
  apiKey,
  systemPrompt,
  generalSystemPrompt,
  isSubmitting,
  sanitizedPreview,
  showPreview,
  modelOptions,
  onGptIdChange,
  onModelChange,
  onApiKeyChange,
  onSystemPromptChange,
  onSubmit,
  onReset
}: GPTFormCardProps) {
  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">
            {isEditing ? "✏️ Edit GPT" : "✨ Create New GPT"}
          </h2>
          <p className="text-gray-500 text-sm mt-1">
            {isEditing
              ? "Update your GPT configuration"
              : "Configure a new GPT instance with custom settings"}
          </p>
        </div>
        {isEditing && (
          <button
            type="button"
            onClick={onReset}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Cancel Edit
          </button>
        )}
      </div>

      <form onSubmit={onSubmit} className="space-y-6">
        {/* GPT ID */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            GPT Identifier
            <span className="text-red-500 ml-1">*</span>
          </label>
          <div className="relative">
            <input
              type="text"
              value={gptIdInput}
              onChange={(e) => onGptIdChange(e.target.value)}
              disabled={isEditing}
              placeholder="e.g., customer-support-assistant"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500 transition-all"
              required
            />
            {gptIdInput && !isEditing && (
              <div className="absolute right-3 top-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              </div>
            )}
          </div>

          {showPreview && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-500">Will be saved as:</span>
              <code className="px-2 py-1 bg-blue-50 text-blue-700 rounded-md font-mono">
                {sanitizedPreview}
              </code>
            </div>
          )}
          {gptIdInput && !sanitizedPreview && (
            <p className="text-sm text-red-600 flex items-center gap-1">
              <span>⚠️</span> Invalid format. Use letters, numbers, and hyphens
              only.
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Model Selection */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Model
              <span className="text-red-500 ml-1">*</span>
            </label>
            <div className="relative">
              <select
                value={model}
                onChange={(e) => onModelChange(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
                required
              >
                {modelOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
              <div className="absolute right-3 top-3 pointer-events-none">
                <svg
                  className="w-5 h-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </div>
            </div>
          </div>

          {/* API Key */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              API Key (Optional)
            </label>
            <div className="relative">
              <input
                type="password"
                value={apiKey}
                onChange={(e) => onApiKeyChange(e.target.value)}
                placeholder="Leave blank to use default"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
              />
              {!apiKey && (
                <div className="absolute right-3 top-3">
                  <div
                    className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"
                    title="Will use default API key"
                  ></div>
                </div>
              )}
            </div>
            <p className="text-xs text-gray-500">
              {!apiKey
                ? "Using default API key from General Settings"
                : "Overriding default API key"}
            </p>
          </div>
        </div>

        {/* System Prompt */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium text-gray-700">
              System Prompt
              <span className="text-red-500 ml-1">*</span>
            </label>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">
                {systemPrompt.length} characters
              </span>
              {!systemPrompt && (
                <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                  + Default prompt will be added
                </span>
              )}
            </div>
          </div>
          <textarea
            value={systemPrompt}
            onChange={(e) => onSystemPromptChange(e.target.value)}
            placeholder="Define the specific behavior and personality of this GPT (default prompt will be prepended)..."
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent h-40 resize-none"
            required
          />
          <div className="flex items-center gap-2 text-sm text-gray-500">
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
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            {generalSystemPrompt
              ? "Default prompt will be prepended to this GPT's specific instructions"
              : "This prompt guides how the GPT responds to users"}
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={
              isSubmitting ||
              !gptIdInput.trim() ||
              !model.trim() ||
              !systemPrompt.trim()
            }
            className={`flex-1 px-6 py-3 rounded-lg font-medium transition-all ${
              isSubmitting ||
              !gptIdInput.trim() ||
              !model.trim() ||
              !systemPrompt.trim()
                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                : "bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 shadow-lg hover:shadow-xl"
            }`}
          >
            {isSubmitting ? (
              <LoadingSpinner
                text={isEditing ? "Updating..." : "Creating..."}
              />
            ) : (
              <span className="flex items-center justify-center gap-2">
                {isEditing ? (
                  <>
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
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    Update GPT
                  </>
                ) : (
                  <>
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
                        d="M12 4v16m8-8H4"
                      />
                    </svg>
                    Create GPT
                  </>
                )}
              </span>
            )}
          </button>

          {gptIdInput.trim() && (
            <button
              type="button"
              onClick={onReset}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
