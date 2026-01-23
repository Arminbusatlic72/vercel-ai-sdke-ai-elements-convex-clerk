import { GPTConfig } from "@/lib/types";

// interface GPTListCardProps {
//   gpts: GPTConfig[];
//   selectedGptId: string | null;
//   generalSystemPrompt: string;
//   onSelect: (gptId: string) => void;
//   onEdit: (gpt: GPTConfig) => void;
//   onDelete: (gptId: string) => void;
// }

interface GPTListCardProps {
  gpts: GPTConfig[];
  selectedGptId: string | null;
  generalSystemPrompt: string;
  onSelect: (gptId: string) => void;
  onEdit: (gpt: GPTConfig) => void;
  onDelete: (gptId: string) => void;
}

export function GPTListCard({
  gpts,
  selectedGptId,
  generalSystemPrompt,
  onSelect,
  onEdit,
  onDelete
}: GPTListCardProps) {
  if (gpts.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Configured GPTs</h2>
          <p className="text-gray-500 text-sm mt-1">
            Select a GPT to view details and manage documents
          </p>
        </div>
        <div className="p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 text-gray-300">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              />
            </svg>
          </div>
          <p className="text-gray-500">No GPTs configured yet</p>
          <p className="text-sm text-gray-400 mt-1">
            Create your first GPT above
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-xl font-bold text-gray-900">Configured GPTs</h2>
        <p className="text-gray-500 text-sm mt-1">
          Select a GPT to view details and manage documents
        </p>
      </div>

      <div className="divide-y divide-gray-100">
        {gpts.map((g) => (
          <div
            key={g.gptId}
            className={`p-4 hover:bg-gray-50 transition-colors cursor-pointer ${
              selectedGptId === g.gptId
                ? "bg-blue-50 border-l-4 border-l-blue-500"
                : ""
            }`}
            onClick={() => onSelect(g.gptId)}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-gray-900 truncate">
                    {g.gptId}
                  </h3>
                  <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                    {g.model}
                  </span>
                  {!g.apiKey && (
                    <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                      Using Default API
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                  {(g.systemPrompt || "").substring(0, 120)}...
                </p>
                <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
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
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    {g.pdfFiles?.length || 0} documents
                  </span>
                  <span>Created {new Date().toLocaleDateString()}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 ml-4">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(g);
                  }}
                  className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  title="Edit"
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
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    />
                  </svg>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(g.gptId);
                  }}
                  className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Delete"
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
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
