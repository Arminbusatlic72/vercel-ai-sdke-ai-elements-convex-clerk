interface GeneralSettingsCardProps {
  generalApiKey: string;
  generalSystemPrompt: string;
  onApiKeyChange: (value: string) => void;
  onSystemPromptChange: (value: string) => void;
  onSave: () => void;
}

export function GeneralSettingsCard({
  generalApiKey,
  generalSystemPrompt,
  onApiKeyChange,
  onSystemPromptChange,
  onSave
}: GeneralSettingsCardProps) {
  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200 mb-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <svg
              className="w-6 h-6 text-blue-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            General Settings
          </h2>
          <p className="text-gray-500 text-sm mt-1">
            Default settings applied to all GPTs (can be overridden per GPT)
          </p>
        </div>
        <button
          onClick={onSave}
          className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg hover:shadow-xl"
        >
          Save Settings
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* General API Key */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Default API Key
          </label>
          <div className="relative">
            <input
              type="password"
              value={generalApiKey}
              onChange={(e) => onApiKeyChange(e.target.value)}
              placeholder="Enter default OpenAI API key for all GPTs"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
            />
            <div className="absolute right-3 top-3">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            This API key will be used as default for all GPTs unless overridden
          </p>
        </div>

        {/* General System Prompt */}
        <div className="space-y-2 md:col-span-2">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium text-gray-700">
              Default System Prompt
            </label>
            <span className="text-xs text-gray-500">
              {generalSystemPrompt.length} characters
            </span>
          </div>
          <textarea
            value={generalSystemPrompt}
            onChange={(e) => onSystemPromptChange(e.target.value)}
            placeholder="Enter default system prompt that will be prepended to all GPTs..."
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent h-32 resize-none"
          />
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <svg
              className="w-4 h-4 text-blue-500"
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
            This prompt will be automatically prepended to each GPT's specific
            prompt
          </div>
        </div>
      </div>
    </div>
  );
}
