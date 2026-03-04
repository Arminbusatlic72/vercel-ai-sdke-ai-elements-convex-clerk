"use client";

import { useState } from "react";
import { useConvex, useQuery } from "convex/react";
import { Id } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";

interface ProjectKnowledgeBaseCardProps {
  projectId: Id<"projects">;
}

export default function ProjectKnowledgeBaseCard({
  projectId
}: ProjectKnowledgeBaseCardProps) {
  const convex = useConvex();
  const project = useQuery(api.project.getProject, { id: projectId });

  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uploadFiles = async (files: File[]) => {
    if (!project) return;

    for (const file of files) {
      const uploadUrl = await convex.mutation(api.storage.generateUploadUrl);

      const uploadResult = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file
      });

      if (!uploadResult.ok) {
        throw new Error(`Upload to Convex failed for ${file.name}`);
      }

      const { storageId } = await uploadResult.json();

      const processResponse = await fetch("/api/process-convex-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          storageId,
          fileName: file.name,
          fileSize: file.size
        })
      });

      if (!processResponse.ok) {
        const errorData = await processResponse.json();
        throw new Error(errorData.error || "Processing failed");
      }
    }
  };

  const handleUpload = async (files: FileList) => {
    setUploading(true);
    setError(null);

    try {
      await uploadFiles(Array.from(files));
    } catch (uploadError) {
      setError(
        uploadError instanceof Error ? uploadError.message : "Upload failed"
      );
    } finally {
      setUploading(false);
    }
  };

  const handleReplace = async (oldOpenaiFileId: string, file: File) => {
    setUploading(true);
    setError(null);

    try {
      const deleteResponse = await fetch("/api/delete-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, openaiFileId: oldOpenaiFileId })
      });

      if (!deleteResponse.ok) {
        const deleteData = await deleteResponse.json();
        throw new Error(deleteData.error || "Delete failed");
      }

      await uploadFiles([file]);
    } catch (replaceError) {
      setError(
        replaceError instanceof Error ? replaceError.message : "Replace failed"
      );
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (openaiFileId: string) => {
    setUploading(true);
    setError(null);

    try {
      const response = await fetch("/api/delete-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, openaiFileId })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Delete failed");
      }
    } catch (deleteError) {
      setError(
        deleteError instanceof Error ? deleteError.message : "Delete failed"
      );
    } finally {
      setUploading(false);
    }
  };

  if (!project) return null;

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">
            Project Knowledge Base
          </h2>
          <p className="text-sm text-gray-500">Manage project PDF knowledge</p>
        </div>
        <label
          className={`cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-linear-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all ${
            uploading ? "opacity-50 cursor-not-allowed" : ""
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
            disabled={uploading}
            onChange={(event) => {
              if (event.target.files?.length) {
                void handleUpload(event.target.files);
              }
            }}
          />
        </label>
      </div>

      {uploading && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-700">Processing PDF(s)...</p>
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <div className="space-y-3">
        {project.pdfFiles?.length ? (
          project.pdfFiles.map((pdf) => (
            <div
              key={pdf.openaiFileId}
              className="group flex items-center justify-between p-3 bg-gray-50 hover:bg-blue-50 rounded-lg transition-colors"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{pdf.fileName}</p>
                <p className="text-xs text-gray-500 mt-1">
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
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) {
                        void handleReplace(pdf.openaiFileId, file);
                      }
                    }}
                  />
                </label>

                <button
                  onClick={() => void handleDelete(pdf.openaiFileId)}
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
              Upload PDFs to enhance project knowledge
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
