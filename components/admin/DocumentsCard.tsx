import { GPTConfig } from "@/lib/types";

interface DocumentsCardProps {
  selectedGpt: GPTConfig;
  uploadingPdf: string | null;
  pdfError: string | null;
  onUpload: (files: FileList) => void;
  onReplace: (oldOpenaiFileId: string, file: File) => void;
  onDelete: (pdfName: string, openaiFileId: string) => void; // Accepts both params
}

export function DocumentsCard({
  selectedGpt,
  uploadingPdf,
  pdfError,
  onUpload,
  onReplace,
  onDelete
}: DocumentsCardProps) {
  const isUploading = uploadingPdf === selectedGpt.gptId;

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Documents</h2>
          <p className="text-sm text-gray-500">Manage PDF knowledge base</p>
        </div>
        <label
          className={`cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all ${
            isUploading ? "opacity-50 cursor-not-allowed" : ""
          }`}
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
              d="M12 4v16m8-8H4"
            />
          </svg>
          Upload PDF
          <input
            type="file"
            accept=".pdf"
            multiple
            className="hidden"
            disabled={isUploading}
            onChange={(e) => {
              if (e.target.files?.length) {
                onUpload(e.target.files);
              }
            }}
          />
        </label>
      </div>

      {isUploading && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-3">
            <div className="animate-spin">
              <svg
                className="w-5 h-5 text-blue-600"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            </div>
            <p className="text-sm text-blue-700">Processing PDF(s)...</p>
          </div>
        </div>
      )}

      {pdfError && isUploading && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700 flex items-center gap-2">
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
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            {pdfError}
          </p>
        </div>
      )}

      <div className="space-y-3">
        {selectedGpt.pdfFiles?.length ? (
          selectedGpt.pdfFiles.map((pdf) => (
            <div
              key={pdf.openaiFileId}
              className="group flex items-center justify-between p-3 bg-gray-50 hover:bg-blue-50 rounded-lg transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <svg
                    className="w-5 h-5 text-red-500 flex-shrink-0"
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
                  <p className="text-sm font-medium truncate">{pdf.fileName}</p>
                </div>
                <p className="text-xs text-gray-500 mt-1 ml-7">
                  Uploaded {new Date(pdf.uploadedAt).toLocaleDateString()}
                </p>
              </div>

              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <label className="cursor-pointer p-1.5 text-gray-600 hover:text-blue-600 hover:bg-blue-100 rounded-md transition-colors">
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
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  <input
                    type="file"
                    accept=".pdf"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        onReplace(pdf.openaiFileId, file);
                      }
                    }}
                  />
                </label>

                <button
                  onClick={() => onDelete(pdf.fileName, pdf.openaiFileId)} // Now passes both params
                  className="p-1.5 text-gray-600 hover:text-red-600 hover:bg-red-100 rounded-md transition-colors"
                >
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
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-8">
            <div className="w-12 h-12 mx-auto mb-4 text-gray-300">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <p className="text-gray-500">No documents uploaded</p>
            <p className="text-sm text-gray-400 mt-1">
              Upload PDFs to enhance knowledge
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
