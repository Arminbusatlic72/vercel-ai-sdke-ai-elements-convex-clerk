// "use client";

// import { useState } from "react";
// import { useQuery, useMutation } from "convex/react";
// import { api } from "@/convex/_generated/api";

// interface GPTConfig {
//   gptId: string;
//   model: string;
//   apiKey?: string;
//   systemPrompt: string;
//   vectorStoreId?: string;
//   pdfFiles?: {
//     fileName: string;
//     openaiFileId: string;
//     uploadedAt: number;
//   }[];
// }

// export default function AdminPage() {
//   const gpts = useQuery(api.gpts.listGpts) ?? [];
//   const upsertGpt = useMutation(api.gpts.upsertGpt);
//   const deleteGptMutation = useMutation(api.gpts.deleteGpt);

//   // Form state
//   const [gptId, setGptId] = useState("");
//   const [model, setModel] = useState("");
//   const [apiKey, setApiKey] = useState("");
//   const [systemPrompt, setSystemPrompt] = useState("");
//   const [isEditing, setIsEditing] = useState(false);

//   // ✅ PDF upload state
//   const [uploadingPdf, setUploadingPdf] = useState<string | null>(null);
//   const [pdfError, setPdfError] = useState<string | null>(null);

//   const resetForm = () => {
//     setGptId("");
//     setModel("");
//     setApiKey("");
//     setSystemPrompt("");
//     setIsEditing(false);
//     setPdfError(null);
//   };

//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();

//     await upsertGpt({
//       gptId,
//       model,
//       apiKey: apiKey || undefined,
//       systemPrompt
//     });

//     resetForm();
//   };

//   const handleEdit = (g: GPTConfig) => {
//     setGptId(g.gptId);
//     setModel(g.model);
//     setApiKey(g.apiKey || "");
//     setSystemPrompt(g.systemPrompt);
//     setIsEditing(true);
//   };

//   const handleDelete = async (gptId: string) => {
//     await deleteGptMutation({ gptId });
//     resetForm();
//   };

//   // ✅ PDF upload handler
//   const handlePdfUpload = async (gptId: string, files: FileList) => {
//     setUploadingPdf(gptId);
//     setPdfError(null);

//     const formData = new FormData();
//     Array.from(files).forEach((file) => {
//       formData.append("files", file);
//     });
//     formData.append("gptId", gptId);

//     try {
//       const response = await fetch("/api/upload-pdf", {
//         method: "POST",
//         body: formData
//       });

//       const data = await response.json();

//       if (!response.ok) {
//         throw new Error(data.error || "Upload failed");
//       }
//     } catch (error) {
//       setPdfError(error instanceof Error ? error.message : "Upload failed");
//     } finally {
//       setUploadingPdf(null);
//     }
//   };
//   const handleDeletePdf = async (gptId: string, openaiFileId: string) => {
//     try {
//       const response = await fetch("/api/delete-pdf", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ gptId, openaiFileId })
//       });

//       const data = await response.json();
//       if (!response.ok) throw new Error(data.error || "Delete failed");

//       console.log("PDF deleted successfully");
//     } catch (err) {
//       console.error(err);
//     }
//   };
//   // Add this new handler in your admin page
//   const handleReplacePdf = async (
//     gptId: string,
//     oldOpenaiFileId: string,
//     newFile: File
//   ) => {
//     setUploadingPdf(gptId);
//     setPdfError(null);

//     try {
//       // 1. Delete old file
//       await handleDeletePdf(gptId, oldOpenaiFileId);

//       // 2. Upload new file
//       const formData = new FormData();
//       formData.append("files", newFile);
//       formData.append("gptId", gptId);

//       const response = await fetch("/api/upload-pdf", {
//         method: "POST",
//         body: formData
//       });

//       const data = await response.json();

//       if (!response.ok) {
//         throw new Error(data.error || "Upload failed");
//       }

//       console.log("PDF replaced successfully");
//     } catch (error) {
//       setPdfError(error instanceof Error ? error.message : "Replace failed");
//     } finally {
//       setUploadingPdf(null);
//     }
//   };

//   return (
//     <div className="p-8 max-w-4xl mx-auto">
//       <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>

//       <form
//         onSubmit={handleSubmit}
//         className="space-y-4 border p-4 rounded shadow mb-8"
//       >
//         <h2 className="text-xl font-semibold">
//           {isEditing ? "Edit GPT" : "Add New GPT"}
//         </h2>

//         <div>
//           <label className="block font-semibold mb-1">GPT ID</label>
//           <input
//             type="text"
//             value={gptId}
//             onChange={(e) => setGptId(e.target.value)}
//             placeholder="e.g., sales"
//             className="w-full border rounded p-2"
//             required
//             disabled={isEditing}
//           />
//         </div>

//         <div>
//           <label className="block font-semibold mb-1">Model</label>
//           <input
//             type="text"
//             value={model}
//             onChange={(e) => setModel(e.target.value)}
//             placeholder="e.g., gpt-4o-mini"
//             className="w-full border rounded p-2"
//             required
//             autoComplete="off"
//             spellCheck={false}
//           />
//         </div>

//         <div>
//           <label className="block font-semibold mb-1">API Key (optional)</label>
//           <input
//             type="text"
//             value={apiKey}
//             onChange={(e) => setApiKey(e.target.value)}
//             placeholder="API key"
//             className="w-full border rounded p-2"
//           />
//         </div>

//         <div>
//           <label className="block font-semibold mb-1">System Prompt</label>
//           <textarea
//             value={systemPrompt}
//             onChange={(e) => setSystemPrompt(e.target.value)}
//             placeholder="Enter GPT instructions"
//             className="w-full border rounded p-2 h-32"
//             required
//           />
//         </div>

//         <div className="flex gap-2">
//           <button
//             type="submit"
//             className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
//           >
//             {isEditing ? "Update GPT" : "Add GPT"}
//           </button>
//           {gptId && (
//             <button
//               type="button"
//               onClick={resetForm}
//               className="bg-gray-400 text-white px-4 py-2 rounded hover:bg-gray-500"
//             >
//               Cancel
//             </button>
//           )}
//         </div>
//       </form>

//       {gpts.length > 0 && (
//         <div>
//           <h2 className="text-xl font-semibold mb-4">Saved GPTs</h2>
//           <ul className="space-y-4">
//             {gpts.map((g) => (
//               <li
//                 key={g.gptId}
//                 className="border rounded p-4 shadow flex justify-between items-start"
//               >
//                 <div className="flex-1">
//                   <strong className="text-lg">{g.gptId}</strong> —{" "}
//                   <em>{g.model}</em>
//                   <p className="text-sm mt-2">{g.systemPrompt}</p>
//                   {/* ✅ PDF Upload Section */}
//                   <div className="mt-3 space-y-2">
//                     {/* Upload */}
//                     <label className="cursor-pointer text-blue-600 hover:underline text-sm">
//                       📎 Upload PDF(s)
//                       <input
//                         type="file"
//                         accept=".pdf"
//                         multiple
//                         className="hidden"
//                         onChange={(e) => {
//                           if (e.target.files?.length) {
//                             handlePdfUpload(g.gptId, e.target.files);
//                           }
//                         }}
//                         disabled={uploadingPdf === g.gptId}
//                       />
//                     </label>

//                     {/* Existing PDFs */}
//                     {g.pdfFiles?.map((pdf) => (
//                       <div
//                         key={pdf.openaiFileId}
//                         className="flex items-center gap-2 text-sm"
//                       >
//                         <span>📄 {pdf.fileName}</span>
//                         <button
//                           onClick={() =>
//                             handleDeletePdf(g.gptId, pdf.openaiFileId)
//                           }
//                           className="text-red-600 hover:underline"
//                         >
//                           Delete
//                         </button>
//                         <label className="cursor-pointer text-blue-600 hover:underline">
//                           Replace
//                           <input
//                             type="file"
//                             accept=".pdf"
//                             className="hidden"
//                             onChange={(e) => {
//                               const file = e.target.files?.[0];
//                               if (file) {
//                                 handleReplacePdf(
//                                   g.gptId,
//                                   pdf.openaiFileId,
//                                   file
//                                 );
//                               }
//                             }}
//                             disabled={uploadingPdf === g.gptId}
//                           />
//                         </label>
//                       </div>
//                     ))}

//                     {uploadingPdf === g.gptId && (
//                       <p className="text-xs text-gray-600">
//                         ⏳ Processing PDF(s)...
//                       </p>
//                     )}

//                     {pdfError && uploadingPdf === g.gptId && (
//                       <p className="text-xs text-red-600">❌ {pdfError}</p>
//                     )}
//                   </div>
//                 </div>

//                 <div className="flex gap-2">
//                   <button
//                     onClick={() => handleEdit(g)}
//                     className="bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-600"
//                   >
//                     Edit
//                   </button>
//                   <button
//                     onClick={() => handleDelete(g.gptId)}
//                     className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
//                   >
//                     Delete
//                   </button>
//                 </div>
//               </li>
//             ))}
//           </ul>
//         </div>
//       )}
//     </div>
//   );
// }

// "use client";

// import { useState, useEffect } from "react";
// import { useQuery, useMutation } from "convex/react";
// import Link from "next/link";
// import { api } from "@/convex/_generated/api";

// interface GPTConfig {
//   gptId: string;
//   model: string;
//   apiKey?: string;
//   systemPrompt: string;
//   vectorStoreId?: string;
//   pdfFiles?: {
//     fileName: string;
//     openaiFileId: string;
//     uploadedAt: number;
//   }[];
// }

// const sanitizeGptId = (value: string) => {
//   return value
//     .toLowerCase()
//     .trim()
//     .replace(/\s+/g, "-")
//     .replace(/[^a-z0-9-]/g, "")
//     .replace(/-+/g, "-")
//     .replace(/^-|-$/g, "");
// };

// export default function AdminPage() {
//   const gpts = useQuery(api.gpts.listGpts) ?? [];
//   const upsertGpt = useMutation(api.gpts.upsertGpt);
//   const deleteGptMutation = useMutation(api.gpts.deleteGpt);

//   const [gptId, setGptId] = useState("");
//   const [gptIdInput, setGptIdInput] = useState("");
//   const [model, setModel] = useState("gpt-4");
//   const [apiKey, setApiKey] = useState("");
//   const [systemPrompt, setSystemPrompt] = useState("");
//   const [isEditing, setIsEditing] = useState(false);
//   const [selectedGptId, setSelectedGptId] = useState<string | null>(
//     gpts[0]?.gptId ?? null
//   );
//   const [uploadingPdf, setUploadingPdf] = useState<string | null>(null);
//   const [pdfError, setPdfError] = useState<string | null>(null);
//   const [isSubmitting, setIsSubmitting] = useState(false);

//   const selectedGpt = gpts.find((g) => g.gptId === selectedGptId);

//   useEffect(() => {
//     if (!selectedGptId && gpts.length > 0) {
//       setSelectedGptId(gpts[0].gptId);
//     }
//   }, [gpts, selectedGptId]);

//   const resetForm = () => {
//     setGptId("");
//     setGptIdInput("");
//     setModel("gpt-4");
//     setApiKey("");
//     setSystemPrompt("");
//     setIsEditing(false);
//     setPdfError(null);
//     setIsSubmitting(false);
//   };

//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();
//     setIsSubmitting(true);

//     const finalGptId = sanitizeGptId(gptIdInput);

//     if (!finalGptId) {
//       alert("Please enter a valid GPT ID");
//       setIsSubmitting(false);
//       return;
//     }

//     try {
//       await upsertGpt({
//         gptId: finalGptId,
//         model,
//         apiKey: apiKey || undefined,
//         systemPrompt
//       });
//       resetForm();
//     } catch (error) {
//       console.error("Error saving GPT:", error);
//     } finally {
//       setIsSubmitting(false);
//     }
//   };

//   const handleEdit = (g: GPTConfig) => {
//     setGptId(g.gptId);
//     setGptIdInput(g.gptId);
//     setModel(g.model);
//     setApiKey(g.apiKey || "");
//     setSystemPrompt(g.systemPrompt);
//     setIsEditing(true);
//     window.scrollTo({ top: 0, behavior: "smooth" });
//   };

//   const handleDelete = async (gptId: string) => {
//     if (
//       window.confirm(
//         "Are you sure you want to delete this GPT? This action cannot be undone."
//       )
//     ) {
//       await deleteGptMutation({ gptId });
//       resetForm();
//     }
//   };

//   const handlePdfUpload = async (gptId: string, files: FileList) => {
//     setUploadingPdf(gptId);
//     setPdfError(null);

//     const formData = new FormData();
//     Array.from(files).forEach((file) => {
//       formData.append("files", file);
//     });
//     formData.append("gptId", gptId);

//     try {
//       const response = await fetch("/api/upload-pdf", {
//         method: "POST",
//         body: formData
//       });

//       const data = await response.json();

//       if (!response.ok) {
//         throw new Error(data.error || "Upload failed");
//       }
//     } catch (error) {
//       setPdfError(error instanceof Error ? error.message : "Upload failed");
//     } finally {
//       setUploadingPdf(null);
//     }
//   };

//   const handleDeletePdf = async (gptId: string, openaiFileId: string) => {
//     if (!window.confirm("Are you sure you want to delete this PDF?")) return;

//     try {
//       const response = await fetch("/api/delete-pdf", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ gptId, openaiFileId })
//       });

//       const data = await response.json();
//       if (!response.ok) throw new Error(data.error || "Delete failed");
//     } catch (err) {
//       console.error(err);
//       alert("Failed to delete PDF. Please try again.");
//     }
//   };

//   const handleReplacePdf = async (
//     gptId: string,
//     oldOpenaiFileId: string,
//     newFile: File
//   ) => {
//     setUploadingPdf(gptId);
//     setPdfError(null);

//     try {
//       await handleDeletePdf(gptId, oldOpenaiFileId);

//       const formData = new FormData();
//       formData.append("files", newFile);
//       formData.append("gptId", gptId);

//       const response = await fetch("/api/upload-pdf", {
//         method: "POST",
//         body: formData
//       });

//       const data = await response.json();

//       if (!response.ok) {
//         throw new Error(data.error || "Upload failed");
//       }
//     } catch (error) {
//       setPdfError(error instanceof Error ? error.message : "Replace failed");
//     } finally {
//       setUploadingPdf(null);
//     }
//   };

//   const sanitizedPreview = sanitizeGptId(gptIdInput);
//   const showPreview = gptIdInput && sanitizedPreview !== gptIdInput;
//   const modelOptions = [
//     "gpt-4",
//     "gpt-4-turbo",
//     "gpt-3.5-turbo",
//     "gpt-4o",
//     "gpt-4o-mini"
//   ];

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-6">
//       <div className="max-w-7xl mx-auto">
//         {/* Header */}
//         <header className="mb-8">
//           <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
//             <div>
//               <h1 className="text-3xl font-bold text-gray-900">GPT Manager</h1>
//               <p className="text-gray-600 mt-2">
//                 Create and manage your custom GPT instances
//               </p>
//             </div>
//             <div className="flex items-center gap-2 text-sm text-gray-500">
//               <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
//               <span>{gpts.length} GPTs configured</span>
//             </div>
//           </div>
//         </header>

//         <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
//           {/* Left Column - Create/Edit Form */}
//           <div className="lg:col-span-2 space-y-6">
//             {/* Create/Edit Form */}
//             <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
//               <div className="flex items-center justify-between mb-6">
//                 <div>
//                   <h2 className="text-xl font-bold text-gray-900">
//                     {isEditing ? "✏️ Edit GPT" : "✨ Create New GPT"}
//                   </h2>
//                   <p className="text-gray-500 text-sm mt-1">
//                     {isEditing
//                       ? "Update your GPT configuration"
//                       : "Configure a new GPT instance with custom settings"}
//                   </p>
//                 </div>
//                 {isEditing && (
//                   <button
//                     type="button"
//                     onClick={resetForm}
//                     className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
//                   >
//                     Cancel Edit
//                   </button>
//                 )}
//               </div>

//               <form onSubmit={handleSubmit} className="space-y-6">
//                 {/* GPT ID */}
//                 <div className="space-y-2">
//                   <label className="block text-sm font-medium text-gray-700">
//                     GPT Identifier
//                     <span className="text-red-500 ml-1">*</span>
//                   </label>
//                   <div className="relative">
//                     <input
//                       type="text"
//                       value={gptIdInput}
//                       onChange={(e) => setGptIdInput(e.target.value)}
//                       disabled={isEditing}
//                       placeholder="e.g., customer-support-assistant"
//                       className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500 transition-all"
//                       required
//                     />
//                     {gptIdInput && !isEditing && (
//                       <div className="absolute right-3 top-3">
//                         <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
//                       </div>
//                     )}
//                   </div>

//                   {showPreview && (
//                     <div className="flex items-center gap-2 text-sm">
//                       <span className="text-gray-500">Will be saved as:</span>
//                       <code className="px-2 py-1 bg-blue-50 text-blue-700 rounded-md font-mono">
//                         {sanitizedPreview}
//                       </code>
//                     </div>
//                   )}
//                   {gptIdInput && !sanitizedPreview && (
//                     <p className="text-sm text-red-600 flex items-center gap-1">
//                       <span>⚠️</span> Invalid format. Use letters, numbers, and
//                       hyphens only.
//                     </p>
//                   )}
//                 </div>

//                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//                   {/* Model Selection */}
//                   <div className="space-y-2">
//                     <label className="block text-sm font-medium text-gray-700">
//                       Model
//                       <span className="text-red-500 ml-1">*</span>
//                     </label>
//                     <div className="relative">
//                       <select
//                         value={model}
//                         onChange={(e) => setModel(e.target.value)}
//                         className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
//                         required
//                       >
//                         {modelOptions.map((opt) => (
//                           <option key={opt} value={opt}>
//                             {opt}
//                           </option>
//                         ))}
//                       </select>
//                       <div className="absolute right-3 top-3 pointer-events-none">
//                         <svg
//                           className="w-5 h-5 text-gray-400"
//                           fill="none"
//                           stroke="currentColor"
//                           viewBox="0 0 24 24"
//                         >
//                           <path
//                             strokeLinecap="round"
//                             strokeLinejoin="round"
//                             strokeWidth={2}
//                             d="M19 9l-7 7-7-7"
//                           />
//                         </svg>
//                       </div>
//                     </div>
//                   </div>

//                   {/* API Key */}
//                   <div className="space-y-2">
//                     <label className="block text-sm font-medium text-gray-700">
//                       API Key (Optional)
//                     </label>
//                     <input
//                       type="password"
//                       value={apiKey}
//                       onChange={(e) => setApiKey(e.target.value)}
//                       placeholder="Leave blank to use default"
//                       className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
//                     />
//                   </div>
//                 </div>

//                 {/* System Prompt */}
//                 <div className="space-y-2">
//                   <div className="flex items-center justify-between">
//                     <label className="block text-sm font-medium text-gray-700">
//                       System Prompt
//                       <span className="text-red-500 ml-1">*</span>
//                     </label>
//                     <span className="text-xs text-gray-500">
//                       {systemPrompt.length} characters
//                     </span>
//                   </div>
//                   <textarea
//                     value={systemPrompt}
//                     onChange={(e) => setSystemPrompt(e.target.value)}
//                     placeholder="Define the behavior and personality of your GPT..."
//                     className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent h-40 resize-none"
//                     required
//                   />
//                   <div className="flex items-center gap-2 text-sm text-gray-500">
//                     <svg
//                       className="w-4 h-4"
//                       fill="none"
//                       stroke="currentColor"
//                       viewBox="0 0 24 24"
//                     >
//                       <path
//                         strokeLinecap="round"
//                         strokeLinejoin="round"
//                         strokeWidth={2}
//                         d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
//                       />
//                     </svg>
//                     This prompt guides how the GPT responds to users
//                   </div>
//                 </div>

//                 {/* Submit Button */}
//                 <div className="flex gap-3 pt-4">
//                   <button
//                     type="submit"
//                     disabled={
//                       isSubmitting ||
//                       !gptIdInput.trim() ||
//                       !model.trim() ||
//                       !systemPrompt.trim()
//                     }
//                     className={`flex-1 px-6 py-3 rounded-lg font-medium transition-all ${
//                       isSubmitting ||
//                       !gptIdInput.trim() ||
//                       !model.trim() ||
//                       !systemPrompt.trim()
//                         ? "bg-gray-300 text-gray-500 cursor-not-allowed"
//                         : "bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 shadow-lg hover:shadow-xl"
//                     }`}
//                   >
//                     {isSubmitting ? (
//                       <span className="flex items-center justify-center gap-2">
//                         <svg
//                           className="w-5 h-5 animate-spin"
//                           fill="none"
//                           viewBox="0 0 24 24"
//                         >
//                           <circle
//                             className="opacity-25"
//                             cx="12"
//                             cy="12"
//                             r="10"
//                             stroke="currentColor"
//                             strokeWidth="4"
//                           />
//                           <path
//                             className="opacity-75"
//                             fill="currentColor"
//                             d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
//                           />
//                         </svg>
//                         {isEditing ? "Updating..." : "Creating..."}
//                       </span>
//                     ) : (
//                       <span className="flex items-center justify-center gap-2">
//                         {isEditing ? (
//                           <>
//                             <svg
//                               className="w-5 h-5"
//                               fill="none"
//                               stroke="currentColor"
//                               viewBox="0 0 24 24"
//                             >
//                               <path
//                                 strokeLinecap="round"
//                                 strokeLinejoin="round"
//                                 strokeWidth={2}
//                                 d="M5 13l4 4L19 7"
//                               />
//                             </svg>
//                             Update GPT
//                           </>
//                         ) : (
//                           <>
//                             <svg
//                               className="w-5 h-5"
//                               fill="none"
//                               stroke="currentColor"
//                               viewBox="0 0 24 24"
//                             >
//                               <path
//                                 strokeLinecap="round"
//                                 strokeLinejoin="round"
//                                 strokeWidth={2}
//                                 d="M12 4v16m8-8H4"
//                               />
//                             </svg>
//                             Create GPT
//                           </>
//                         )}
//                       </span>
//                     )}
//                   </button>

//                   {gptIdInput.trim() && (
//                     <button
//                       type="button"
//                       onClick={resetForm}
//                       className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
//                     >
//                       Clear
//                     </button>
//                   )}
//                 </div>
//               </form>
//             </div>

//             {/* GPT List */}
//             <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
//               <div className="p-6 border-b border-gray-200">
//                 <h2 className="text-xl font-bold text-gray-900">
//                   Configured GPTs
//                 </h2>
//                 <p className="text-gray-500 text-sm mt-1">
//                   Select a GPT to view details and manage documents
//                 </p>
//               </div>

//               <div className="divide-y divide-gray-100">
//                 {gpts.length === 0 ? (
//                   <div className="p-8 text-center">
//                     <div className="w-16 h-16 mx-auto mb-4 text-gray-300">
//                       <svg
//                         fill="none"
//                         stroke="currentColor"
//                         viewBox="0 0 24 24"
//                       >
//                         <path
//                           strokeLinecap="round"
//                           strokeLinejoin="round"
//                           strokeWidth={1}
//                           d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
//                         />
//                       </svg>
//                     </div>
//                     <p className="text-gray-500">No GPTs configured yet</p>
//                     <p className="text-sm text-gray-400 mt-1">
//                       Create your first GPT above
//                     </p>
//                   </div>
//                 ) : (
//                   gpts.map((g) => (
//                     <div
//                       key={g.gptId}
//                       className={`p-4 hover:bg-gray-50 transition-colors cursor-pointer ${
//                         selectedGptId === g.gptId
//                           ? "bg-blue-50 border-l-4 border-l-blue-500"
//                           : ""
//                       }`}
//                       onClick={() => setSelectedGptId(g.gptId)}
//                     >
//                       <div className="flex items-center justify-between">
//                         <div className="flex-1 min-w-0">
//                           <div className="flex items-center gap-2">
//                             <h3 className="font-semibold text-gray-900 truncate">
//                               {g.gptId}
//                             </h3>
//                             <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
//                               {g.model}
//                             </span>
//                           </div>
//                           <p className="text-sm text-gray-600 mt-1 line-clamp-2">
//                             {g.systemPrompt.substring(0, 120)}...
//                           </p>
//                           <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
//                             <span className="flex items-center gap-1">
//                               <svg
//                                 className="w-4 h-4"
//                                 fill="none"
//                                 stroke="currentColor"
//                                 viewBox="0 0 24 24"
//                               >
//                                 <path
//                                   strokeLinecap="round"
//                                   strokeLinejoin="round"
//                                   strokeWidth={2}
//                                   d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
//                                 />
//                               </svg>
//                               {g.pdfFiles?.length || 0} documents
//                             </span>
//                             <span>
//                               Created {new Date().toLocaleDateString()}
//                             </span>
//                           </div>
//                         </div>

//                         <div className="flex items-center gap-2 ml-4">
//                           <button
//                             onClick={(e) => {
//                               e.stopPropagation();
//                               handleEdit(g);
//                             }}
//                             className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
//                             title="Edit"
//                           >
//                             <svg
//                               className="w-5 h-5"
//                               fill="none"
//                               stroke="currentColor"
//                               viewBox="0 0 24 24"
//                             >
//                               <path
//                                 strokeLinecap="round"
//                                 strokeLinejoin="round"
//                                 strokeWidth={2}
//                                 d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
//                               />
//                             </svg>
//                           </button>
//                           <button
//                             onClick={(e) => {
//                               e.stopPropagation();
//                               handleDelete(g.gptId);
//                             }}
//                             className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
//                             title="Delete"
//                           >
//                             <svg
//                               className="w-5 h-5"
//                               fill="none"
//                               stroke="currentColor"
//                               viewBox="0 0 24 24"
//                             >
//                               <path
//                                 strokeLinecap="round"
//                                 strokeLinejoin="round"
//                                 strokeWidth={2}
//                                 d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
//                               />
//                             </svg>
//                           </button>
//                         </div>
//                       </div>
//                     </div>
//                   ))
//                 )}
//               </div>
//             </div>
//           </div>

//           {/* Right Column - GPT Details & Documents */}
//           <div className="lg:col-span-1">
//             {selectedGpt ? (
//               <div className="sticky top-6 space-y-6">
//                 {/* GPT Details Card */}
//                 <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
//                   <div className="flex items-center justify-between mb-6">
//                     <div>
//                       <h2 className="text-xl font-bold text-gray-900">
//                         GPT Details
//                       </h2>
//                       <p className="text-sm text-gray-500">
//                         Configuration and management
//                       </p>
//                     </div>
//                     <Link
//                       href={`/gpt5/${selectedGpt.gptId}`}
//                       className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all shadow-lg hover:shadow-xl"
//                     >
//                       <svg
//                         className="w-5 h-5"
//                         fill="none"
//                         stroke="currentColor"
//                         viewBox="0 0 24 24"
//                       >
//                         <path
//                           strokeLinecap="round"
//                           strokeLinejoin="round"
//                           strokeWidth={2}
//                           d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
//                         />
//                       </svg>
//                       Open Chat
//                     </Link>
//                   </div>

//                   <div className="space-y-4">
//                     <div>
//                       <label className="text-sm font-medium text-gray-500">
//                         Identifier
//                       </label>
//                       <p className="mt-1 font-mono bg-gray-50 p-2 rounded-lg text-sm">
//                         {selectedGpt.gptId}
//                       </p>
//                     </div>

//                     <div>
//                       <label className="text-sm font-medium text-gray-500">
//                         Model
//                       </label>
//                       <div className="mt-1 inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-sm font-medium">
//                         <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
//                         {selectedGpt.model}
//                       </div>
//                     </div>

//                     <div>
//                       <div className="flex items-center justify-between">
//                         <label className="text-sm font-medium text-gray-500">
//                           System Prompt
//                         </label>
//                         <span className="text-xs text-gray-400">
//                           {selectedGpt.systemPrompt.length} chars
//                         </span>
//                       </div>
//                       <div className="mt-2 p-3 bg-gray-50 rounded-lg max-h-60 overflow-y-auto">
//                         <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
//                           {selectedGpt.systemPrompt}
//                         </p>
//                       </div>
//                     </div>
//                   </div>
//                 </div>

//                 {/* Documents Card */}
//                 <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
//                   <div className="flex items-center justify-between mb-6">
//                     <div>
//                       <h2 className="text-xl font-bold text-gray-900">
//                         Documents
//                       </h2>
//                       <p className="text-sm text-gray-500">
//                         Manage PDF knowledge base
//                       </p>
//                     </div>
//                     <label
//                       className={`cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all ${
//                         uploadingPdf === selectedGpt.gptId
//                           ? "opacity-50 cursor-not-allowed"
//                           : ""
//                       }`}
//                     >
//                       <svg
//                         className="w-5 h-5"
//                         fill="none"
//                         stroke="currentColor"
//                         viewBox="0 0 24 24"
//                       >
//                         <path
//                           strokeLinecap="round"
//                           strokeLinejoin="round"
//                           strokeWidth={2}
//                           d="M12 4v16m8-8H4"
//                         />
//                       </svg>
//                       Upload PDF
//                       <input
//                         type="file"
//                         accept=".pdf"
//                         multiple
//                         className="hidden"
//                         disabled={uploadingPdf === selectedGpt.gptId}
//                         onChange={(e) => {
//                           if (e.target.files?.length) {
//                             handlePdfUpload(selectedGpt.gptId, e.target.files);
//                           }
//                         }}
//                       />
//                     </label>
//                   </div>

//                   {uploadingPdf === selectedGpt.gptId && (
//                     <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
//                       <div className="flex items-center gap-3">
//                         <div className="animate-spin">
//                           <svg
//                             className="w-5 h-5 text-blue-600"
//                             fill="none"
//                             viewBox="0 0 24 24"
//                           >
//                             <circle
//                               className="opacity-25"
//                               cx="12"
//                               cy="12"
//                               r="10"
//                               stroke="currentColor"
//                               strokeWidth="4"
//                             />
//                             <path
//                               className="opacity-75"
//                               fill="currentColor"
//                               d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
//                             />
//                           </svg>
//                         </div>
//                         <p className="text-sm text-blue-700">
//                           Processing PDF(s)...
//                         </p>
//                       </div>
//                     </div>
//                   )}

//                   {pdfError && uploadingPdf === selectedGpt.gptId && (
//                     <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
//                       <p className="text-sm text-red-700 flex items-center gap-2">
//                         <svg
//                           className="w-5 h-5"
//                           fill="none"
//                           stroke="currentColor"
//                           viewBox="0 0 24 24"
//                         >
//                           <path
//                             strokeLinecap="round"
//                             strokeLinejoin="round"
//                             strokeWidth={2}
//                             d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
//                           />
//                         </svg>
//                         {pdfError}
//                       </p>
//                     </div>
//                   )}

//                   <div className="space-y-3">
//                     {selectedGpt.pdfFiles?.length ? (
//                       selectedGpt.pdfFiles.map((pdf) => (
//                         <div
//                           key={pdf.openaiFileId}
//                           className="group flex items-center justify-between p-3 bg-gray-50 hover:bg-blue-50 rounded-lg transition-colors"
//                         >
//                           <div className="flex-1 min-w-0">
//                             <div className="flex items-center gap-2">
//                               <svg
//                                 className="w-5 h-5 text-red-500 flex-shrink-0"
//                                 fill="none"
//                                 stroke="currentColor"
//                                 viewBox="0 0 24 24"
//                               >
//                                 <path
//                                   strokeLinecap="round"
//                                   strokeLinejoin="round"
//                                   strokeWidth={2}
//                                   d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
//                                 />
//                               </svg>
//                               <p className="text-sm font-medium truncate">
//                                 {pdf.fileName}
//                               </p>
//                             </div>
//                             <p className="text-xs text-gray-500 mt-1 ml-7">
//                               Uploaded{" "}
//                               {new Date(pdf.uploadedAt).toLocaleDateString()}
//                             </p>
//                           </div>

//                           <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
//                             <label className="cursor-pointer p-1.5 text-gray-600 hover:text-blue-600 hover:bg-blue-100 rounded-md transition-colors">
//                               <svg
//                                 className="w-4 h-4"
//                                 fill="none"
//                                 stroke="currentColor"
//                                 viewBox="0 0 24 24"
//                               >
//                                 <path
//                                   strokeLinecap="round"
//                                   strokeLinejoin="round"
//                                   strokeWidth={2}
//                                   d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
//                                 />
//                               </svg>
//                               <input
//                                 type="file"
//                                 accept=".pdf"
//                                 className="hidden"
//                                 onChange={(e) => {
//                                   const file = e.target.files?.[0];
//                                   if (file) {
//                                     handleReplacePdf(
//                                       selectedGpt.gptId,
//                                       pdf.openaiFileId,
//                                       file
//                                     );
//                                   }
//                                 }}
//                               />
//                             </label>

//                             <button
//                               onClick={() =>
//                                 handleDeletePdf(
//                                   selectedGpt.gptId,
//                                   pdf.openaiFileId
//                                 )
//                               }
//                               className="p-1.5 text-gray-600 hover:text-red-600 hover:bg-red-100 rounded-md transition-colors"
//                             >
//                               <svg
//                                 className="w-4 h-4"
//                                 fill="none"
//                                 stroke="currentColor"
//                                 viewBox="0 0 24 24"
//                               >
//                                 <path
//                                   strokeLinecap="round"
//                                   strokeLinejoin="round"
//                                   strokeWidth={2}
//                                   d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
//                                 />
//                               </svg>
//                             </button>
//                           </div>
//                         </div>
//                       ))
//                     ) : (
//                       <div className="text-center py-8">
//                         <div className="w-12 h-12 mx-auto mb-4 text-gray-300">
//                           <svg
//                             fill="none"
//                             stroke="currentColor"
//                             viewBox="0 0 24 24"
//                           >
//                             <path
//                               strokeLinecap="round"
//                               strokeLinejoin="round"
//                               strokeWidth={1}
//                               d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
//                             />
//                           </svg>
//                         </div>
//                         <p className="text-gray-500">No documents uploaded</p>
//                         <p className="text-sm text-gray-400 mt-1">
//                           Upload PDFs to enhance knowledge
//                         </p>
//                       </div>
//                     )}
//                   </div>
//                 </div>
//               </div>
//             ) : (
//               <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 text-center">
//                 <div className="w-16 h-16 mx-auto mb-4 text-gray-300">
//                   <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                     <path
//                       strokeLinecap="round"
//                       strokeLinejoin="round"
//                       strokeWidth={1}
//                       d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
//                     />
//                   </svg>
//                 </div>
//                 <h3 className="font-medium text-gray-700">No GPT Selected</h3>
//                 <p className="text-sm text-gray-500 mt-1">
//                   Select a GPT from the list to view details
//                 </p>
//               </div>
//             )}
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }

// "use client";

// import { useState, useEffect } from "react";
// import { useQuery, useMutation } from "convex/react";
// import { api } from "@/convex/_generated/api";
// import { GPTConfig } from "@/lib/types";
// import { Header } from "@/components/admin/Header";
// import { GeneralSettingsCard } from "@/components/admin/GeneralSettingsCard";
// import { GPTFormCard } from "@/components/admin/GPTFormCard";
// import { GPTListCard } from "@/components/admin/GPTListCard";
// import { GPTDetailsCard } from "@/components/admin/GPTDetailsCard";
// import { DocumentsCard } from "@/components/admin/DocumentsCard";
// import { EmptyState } from "@/components/admin/EmptyState";

// const sanitizeGptId = (value: string) => {
//   return value
//     .toLowerCase()
//     .trim()
//     .replace(/\s+/g, "-")
//     .replace(/[^a-z0-9-]/g, "")
//     .replace(/-+/g, "-")
//     .replace(/^-|-$/g, "");
// };

// export default function AdminPage() {
//   // Data fetching
//   const gpts = useQuery(api.gpts.listGpts) ?? [];
//   const upsertGpt = useMutation(api.gpts.upsertGpt);
//   const deleteGptMutation = useMutation(api.gpts.deleteGpt);

//   // Form state
//   const [gptId, setGptId] = useState("");
//   const [gptIdInput, setGptIdInput] = useState("");
//   const [model, setModel] = useState("gpt-4");
//   const [apiKey, setApiKey] = useState("");
//   const [systemPrompt, setSystemPrompt] = useState("");
//   const [isEditing, setIsEditing] = useState(false);
//   const [selectedGptId, setSelectedGptId] = useState<string | null>(
//     gpts[0]?.gptId ?? null
//   );
//   const [isSubmitting, setIsSubmitting] = useState(false);

//   // General settings state
//   const [generalApiKey, setGeneralApiKey] = useState("");
//   const [generalSystemPrompt, setGeneralSystemPrompt] = useState("");

//   // PDF state
//   const [uploadingPdf, setUploadingPdf] = useState<string | null>(null);
//   const [pdfError, setPdfError] = useState<string | null>(null);

//   // Derived state
//   const selectedGpt = gpts.find((g) => g.gptId === selectedGptId);
//   const sanitizedPreview = sanitizeGptId(gptIdInput);
//   const showPreview = Boolean(gptIdInput && sanitizedPreview !== gptIdInput);
//   const modelOptions = [
//     "gpt-4",
//     "gpt-4-turbo",
//     "gpt-3.5-turbo",
//     "gpt-4o",
//     "gpt-4o-mini"
//   ];

//   // Effects
//   useEffect(() => {
//     if (!selectedGptId && gpts.length > 0) {
//       setSelectedGptId(gpts[0].gptId);
//     }
//   }, [gpts, selectedGptId]);

//   // Form handlers
//   const resetForm = () => {
//     setGptId("");
//     setGptIdInput("");
//     setModel("gpt-4");
//     setApiKey("");
//     setSystemPrompt("");
//     setIsEditing(false);
//     setPdfError(null);
//     setIsSubmitting(false);
//   };

//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();
//     setIsSubmitting(true);

//     const finalGptId = sanitizeGptId(gptIdInput);

//     if (!finalGptId) {
//       alert("Please enter a valid GPT ID");
//       setIsSubmitting(false);
//       return;
//     }

//     try {
//       await upsertGpt({
//         gptId: finalGptId,
//         model,
//         apiKey: apiKey || undefined,
//         systemPrompt
//       });
//       resetForm();
//     } catch (error) {
//       console.error("Error saving GPT:", error);
//     } finally {
//       setIsSubmitting(false);
//     }
//   };

//   const handleEdit = (g: GPTConfig) => {
//     setGptId(g.gptId);
//     setGptIdInput(g.gptId);
//     setModel(g.model);
//     setApiKey(g.apiKey || "");
//     setSystemPrompt(g.systemPrompt);
//     setIsEditing(true);
//     window.scrollTo({ top: 0, behavior: "smooth" });
//   };

//   const handleDelete = async (gptId: string) => {
//     if (
//       window.confirm(
//         "Are you sure you want to delete this GPT? This action cannot be undone."
//       )
//     ) {
//       await deleteGptMutation({ gptId });
//       resetForm();
//     }
//   };

//   // PDF handlers
//   const handlePdfUpload = async (gptId: string, files: FileList) => {
//     setUploadingPdf(gptId);
//     setPdfError(null);

//     const formData = new FormData();
//     Array.from(files).forEach((file) => {
//       formData.append("files", file);
//     });
//     formData.append("gptId", gptId);

//     try {
//       const response = await fetch("/api/upload-pdf", {
//         method: "POST",
//         body: formData
//       });

//       const data = await response.json();

//       if (!response.ok) {
//         throw new Error(data.error || "Upload failed");
//       }
//     } catch (error) {
//       setPdfError(error instanceof Error ? error.message : "Upload failed");
//     } finally {
//       setUploadingPdf(null);
//     }
//   };

//   const handleDeletePdf = async (gptId: string, openaiFileId: string) => {
//     if (!window.confirm("Are you sure you want to delete this PDF?")) return;

//     try {
//       const response = await fetch("/api/delete-pdf", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ gptId, openaiFileId })
//       });

//       const data = await response.json();
//       if (!response.ok) throw new Error(data.error || "Delete failed");
//     } catch (err) {
//       console.error(err);
//       alert("Failed to delete PDF. Please try again.");
//     }
//   };

//   const handleReplacePdf = async (
//     gptId: string,
//     oldOpenaiFileId: string,
//     newFile: File
//   ) => {
//     setUploadingPdf(gptId);
//     setPdfError(null);

//     try {
//       await handleDeletePdf(gptId, oldOpenaiFileId);

//       const formData = new FormData();
//       formData.append("files", newFile);
//       formData.append("gptId", gptId);

//       const response = await fetch("/api/upload-pdf", {
//         method: "POST",
//         body: formData
//       });

//       const data = await response.json();

//       if (!response.ok) {
//         throw new Error(data.error || "Upload failed");
//       }
//     } catch (error) {
//       setPdfError(error instanceof Error ? error.message : "Replace failed");
//     } finally {
//       setUploadingPdf(null);
//     }
//   };

//   // General settings handler
//   const handleSaveGeneralSettings = () => {
//     // TODO: Implement mutation to save general settings
//     console.log("Saving general settings:", {
//       apiKey: generalApiKey,
//       systemPrompt: generalSystemPrompt
//     });
//     alert(
//       "General settings saved! (This is a placeholder - implement mutation)"
//     );
//   };

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-6">
//       <div className="max-w-7xl mx-auto">
//         <Header gptCount={gpts.length} />

//         {/* General Settings */}
//         <GeneralSettingsCard
//           generalApiKey={generalApiKey}
//           generalSystemPrompt={generalSystemPrompt}
//           onApiKeyChange={setGeneralApiKey}
//           onSystemPromptChange={setGeneralSystemPrompt}
//           onSave={handleSaveGeneralSettings}
//         />

//         <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
//           {/* Left Column - Create/Edit Form & GPT List */}
//           <div className="lg:col-span-2 space-y-6">
//             {/* Create/Edit Form */}
//             <GPTFormCard
//               isEditing={isEditing}
//               gptIdInput={gptIdInput}
//               model={model}
//               apiKey={apiKey}
//               systemPrompt={systemPrompt}
//               generalSystemPrompt={generalSystemPrompt}
//               isSubmitting={isSubmitting}
//               sanitizedPreview={sanitizedPreview}
//               showPreview={showPreview}
//               modelOptions={modelOptions}
//               onGptIdChange={setGptIdInput}
//               onModelChange={setModel}
//               onApiKeyChange={setApiKey}
//               onSystemPromptChange={setSystemPrompt}
//               onSubmit={handleSubmit}
//               onReset={resetForm}
//             />

//             {/* GPT List */}
//             <GPTListCard
//               gpts={gpts}
//               selectedGptId={selectedGptId}
//               generalSystemPrompt={generalSystemPrompt}
//               onSelect={setSelectedGptId}
//               onEdit={handleEdit}
//               onDelete={handleDelete}
//             />
//           </div>

//           {/* Right Column - GPT Details & Documents */}
//           <div className="lg:col-span-1">
//             {selectedGpt ? (
//               <div className="sticky top-6 space-y-6">
//                 <GPTDetailsCard
//                   selectedGpt={selectedGpt}
//                   generalSystemPrompt={generalSystemPrompt}
//                 />

//                 <DocumentsCard
//                   selectedGpt={selectedGpt}
//                   uploadingPdf={uploadingPdf}
//                   pdfError={pdfError}
//                   onUpload={(files) =>
//                     handlePdfUpload(selectedGpt.gptId, files)
//                   }
//                   onReplace={(oldOpenaiFileId, file) =>
//                     handleReplacePdf(selectedGpt.gptId, oldOpenaiFileId, file)
//                   }
//                   onDelete={(openaiFileId) =>
//                     handleDeletePdf(selectedGpt.gptId, openaiFileId)
//                   }
//                 />
//               </div>
//             ) : (
//               <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
//                 <EmptyState
//                   icon={
//                     <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                       <path
//                         strokeLinecap="round"
//                         strokeLinejoin="round"
//                         strokeWidth={1}
//                         d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
//                       />
//                     </svg>
//                   }
//                   title="No GPT Selected"
//                   description="Select a GPT from the list to view details"
//                 />
//               </div>
//             )}
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }

"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { GPTConfig } from "@/lib/types";
import { useAdminModals } from "@/lib/hooks/useAdminModals";
import { Header } from "@/components/admin/Header";
import { GeneralSettingsCard } from "@/components/admin/GeneralSettingsCard";
import { GPTFormCard } from "@/components/admin/GPTFormCard";
import { GPTListCard } from "@/components/admin/GPTListCard";
import { GPTDetailsCard } from "@/components/admin/GPTDetailsCard";
import { DocumentsCard } from "@/components/admin/DocumentsCard";
import { EmptyState } from "@/components/admin/EmptyState";
import { ConfirmModal } from "@/components/admin/modals/ConfirmModal";
import { AlertModal } from "@/components/admin/modals/AlertModal";

const sanitizeGptId = (value: string) => {
  return value
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
};

export default function AdminPage() {
  // Data fetching
  const gpts = useQuery(api.gpts.listGpts) ?? [];
  const generalSettings = useQuery(api.gpts.getGeneralSettings);
  const upsertGpt = useMutation(api.gpts.upsertGpt);
  const deleteGptMutation = useMutation(api.gpts.deleteGpt);
  const upsertGeneralSettings = useMutation(api.gpts.upsertGeneralSettings);

  // Modal state
  const { state: modalState, actions: modalActions } = useAdminModals();

  // Form state
  const [gptId, setGptId] = useState("");
  const [gptIdInput, setGptIdInput] = useState("");
  const [model, setModel] = useState("gpt-4");
  const [apiKey, setApiKey] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [selectedGptId, setSelectedGptId] = useState<string | null>(
    gpts[0]?.gptId ?? null
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingGeneralSettings, setIsSavingGeneralSettings] = useState(false);
  const [pendingDeleteGptId, setPendingDeleteGptId] = useState<string | null>(
    null
  );

  // General settings state
  const [generalApiKey, setGeneralApiKey] = useState("");
  const [generalSystemPrompt, setGeneralSystemPrompt] = useState("");

  // PDF state
  const [uploadingPdf, setUploadingPdf] = useState<string | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);

  // Derived state
  const selectedGpt = gpts.find((g) => g.gptId === selectedGptId);
  const sanitizedPreview = sanitizeGptId(gptIdInput);
  const showPreview = Boolean(gptIdInput && sanitizedPreview !== gptIdInput);
  const modelOptions = [
    "gpt-4",
    "gpt-4-turbo",
    "gpt-3.5-turbo",
    "gpt-4o",
    "gpt-4o-mini",
    "gpt-5",
    "gpt-5-mini"
  ];

  // Effects
  useEffect(() => {
    if (!selectedGptId && gpts.length > 0) {
      setSelectedGptId(gpts[0].gptId);
    }
  }, [gpts, selectedGptId]);

  useEffect(() => {
    if (generalSettings) {
      setGeneralApiKey(generalSettings.defaultApiKey || "");
      setGeneralSystemPrompt(generalSettings.defaultSystemPrompt || "");
    }
  }, [generalSettings]);

  // Form handlers
  const resetForm = () => {
    setGptId("");
    setGptIdInput("");
    setModel("gpt-4");
    setApiKey("");
    setSystemPrompt("");
    setIsEditing(false);
    setPdfError(null);
    setIsSubmitting(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const finalGptId = sanitizeGptId(gptIdInput);

    if (!finalGptId) {
      modalActions.openError("Invalid GPT ID", "Please enter a valid GPT ID");
      setIsSubmitting(false);
      return;
    }

    try {
      await upsertGpt({
        gptId: finalGptId,
        model,
        apiKey: apiKey || undefined,
        systemPrompt
      });
      resetForm();
      modalActions.openSuccess(
        "GPT Saved",
        isEditing ? "GPT updated successfully!" : "GPT created successfully!"
      );
    } catch (error) {
      console.error("Error saving GPT:", error);
      modalActions.openError(
        "Error Saving GPT",
        "Failed to save GPT. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (g: GPTConfig) => {
    setGptId(g.gptId);
    setGptIdInput(g.gptId);
    setModel(g.model);
    setApiKey(g.apiKey || "");
    setSystemPrompt(g.systemPrompt);
    setIsEditing(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDeleteClick = (gptId: string) => {
    setPendingDeleteGptId(gptId);
    modalActions.openConfirmDeleteGPT({
      gptId,
      name: gptId
    });
  };

  const handleConfirmDeleteGPT = async () => {
    if (!pendingDeleteGptId) return;

    try {
      await deleteGptMutation({ gptId: pendingDeleteGptId });
      resetForm();
      modalActions.openSuccess("GPT Deleted", "GPT was deleted successfully!");
    } catch (error) {
      console.error("Error deleting GPT:", error);
      modalActions.openError(
        "Error Deleting GPT",
        "Failed to delete GPT. Please try again."
      );
    } finally {
      setPendingDeleteGptId(null);
      modalActions.closeConfirmDeleteGPT();
    }
  };

  // PDF handlers
  const handlePdfUpload = async (gptId: string, files: FileList) => {
    setUploadingPdf(gptId);
    setPdfError(null);

    const formData = new FormData();
    Array.from(files).forEach((file) => {
      formData.append("files", file);
    });
    formData.append("gptId", gptId);

    try {
      const response = await fetch("/api/upload-pdf", {
        method: "POST",
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Upload failed");
      }

      modalActions.openSuccess("PDF Uploaded", "PDF(s) uploaded successfully!");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Upload failed";
      setPdfError(errorMessage);
      modalActions.openError("Upload Failed", errorMessage);
    } finally {
      setUploadingPdf(null);
    }
  };

  const handleDeletePdfClick = (
    gptId: string,
    pdfName: string,
    openaiFileId: string
  ) => {
    modalActions.openConfirmDeletePDF(gptId, pdfName, openaiFileId);
  };

  const handleConfirmDeletePDF = async () => {
    const { gptId, pdfName, openaiFileId } = modalState.confirmDeletePDF;

    try {
      const response = await fetch("/api/delete-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gptId, openaiFileId })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Delete failed");

      modalActions.openSuccess(
        "PDF Deleted",
        `"${pdfName}" was deleted successfully!`
      );
    } catch (err) {
      console.error(err);
      modalActions.openError(
        "Delete Failed",
        "Failed to delete PDF. Please try again."
      );
    } finally {
      modalActions.closeConfirmDeletePDF();
    }
  };

  const handleReplacePdf = async (
    gptId: string,
    oldOpenaiFileId: string,
    newFile: File
  ) => {
    setUploadingPdf(gptId);
    setPdfError(null);

    try {
      // Delete old PDF
      const deleteResponse = await fetch("/api/delete-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gptId, openaiFileId: oldOpenaiFileId })
      });

      const deleteData = await deleteResponse.json();
      if (!deleteResponse.ok)
        throw new Error(deleteData.error || "Delete failed");

      // Upload new PDF
      const formData = new FormData();
      formData.append("files", newFile);
      formData.append("gptId", gptId);

      const uploadResponse = await fetch("/api/upload-pdf", {
        method: "POST",
        body: formData
      });

      const uploadData = await uploadResponse.json();
      if (!uploadResponse.ok)
        throw new Error(uploadData.error || "Upload failed");

      modalActions.openSuccess("PDF Replaced", "PDF replaced successfully!");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Replace failed";
      setPdfError(errorMessage);
      modalActions.openError("Replace Failed", errorMessage);
    } finally {
      setUploadingPdf(null);
    }
  };

  // General settings handler
  const handleSaveGeneralSettings = async () => {
    setIsSavingGeneralSettings(true);
    try {
      const userId = "admin-user"; // TODO: Replace with actual user ID

      await upsertGeneralSettings({
        defaultApiKey: generalApiKey || undefined,
        defaultSystemPrompt: generalSystemPrompt || undefined,
        userId
      });

      modalActions.openSuccess(
        "Settings Saved",
        "General settings saved successfully!"
      );
    } catch (error) {
      console.error("Error saving general settings:", error);
      modalActions.openError(
        "Error Saving Settings",
        "Failed to save general settings. Please try again."
      );
    } finally {
      setIsSavingGeneralSettings(false);
      modalActions.closeConfirmSaveSettings();
    }
  };

  const handleResetClick = () => {
    modalActions.openConfirmReset();
  };

  const handleConfirmReset = () => {
    resetForm();
    modalActions.closeConfirmReset();
    modalActions.openSuccess(
      "Form Reset",
      "Form has been reset to default values."
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        <Header gptCount={gpts.length} />

        {/* General Settings */}
        <GeneralSettingsCard
          generalApiKey={generalApiKey}
          generalSystemPrompt={generalSystemPrompt}
          onApiKeyChange={setGeneralApiKey}
          onSystemPromptChange={setGeneralSystemPrompt}
          onSave={() => modalActions.openConfirmSaveSettings()}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Create/Edit Form & GPT List */}
          <div className="lg:col-span-2 space-y-6">
            {/* Create/Edit Form */}
            <GPTFormCard
              isEditing={isEditing}
              gptIdInput={gptIdInput}
              model={model}
              apiKey={apiKey}
              systemPrompt={systemPrompt}
              generalSystemPrompt={generalSystemPrompt}
              isSubmitting={isSubmitting}
              sanitizedPreview={sanitizedPreview}
              showPreview={showPreview}
              modelOptions={modelOptions}
              onGptIdChange={setGptIdInput}
              onModelChange={setModel}
              onApiKeyChange={setApiKey}
              onSystemPromptChange={setSystemPrompt}
              onSubmit={handleSubmit}
              onReset={handleResetClick}
            />

            {/* GPT List */}
            <GPTListCard
              gpts={gpts}
              selectedGptId={selectedGptId}
              generalSystemPrompt={generalSystemPrompt}
              onSelect={setSelectedGptId}
              onEdit={handleEdit}
              onDelete={handleDeleteClick}
            />
          </div>

          {/* Right Column - GPT Details & Documents */}
          <div className="lg:col-span-1">
            {selectedGpt ? (
              <div className="sticky top-6 space-y-6">
                <GPTDetailsCard
                  selectedGpt={selectedGpt}
                  generalSystemPrompt={generalSystemPrompt}
                />

                <DocumentsCard
                  selectedGpt={selectedGpt}
                  uploadingPdf={uploadingPdf}
                  pdfError={pdfError}
                  onUpload={(files) =>
                    handlePdfUpload(selectedGpt.gptId, files)
                  }
                  onReplace={(oldOpenaiFileId, file) =>
                    handleReplacePdf(selectedGpt.gptId, oldOpenaiFileId, file)
                  }
                  onDelete={(pdfName, openaiFileId) =>
                    handleDeletePdfClick(
                      selectedGpt.gptId,
                      pdfName,
                      openaiFileId
                    )
                  }
                />
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
                <EmptyState
                  icon={
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1}
                        d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                      />
                    </svg>
                  }
                  title="No GPT Selected"
                  description="Select a GPT from the list to view details"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      {/* Delete GPT Confirmation */}
      <ConfirmModal
        isOpen={modalState.confirmDeleteGPT.isOpen}
        title="Delete GPT"
        message={`Are you sure you want to delete "${modalState.confirmDeleteGPT.gpt?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        isDestructive={true}
        onConfirm={handleConfirmDeleteGPT}
        onCancel={() => {
          setPendingDeleteGptId(null);
          modalActions.closeConfirmDeleteGPT();
        }}
      />

      {/* Delete PDF Confirmation */}
      <ConfirmModal
        isOpen={modalState.confirmDeletePDF.isOpen}
        title="Delete PDF"
        message={`Are you sure you want to delete "${modalState.confirmDeletePDF.pdfName}"?`}
        confirmText="Delete"
        cancelText="Cancel"
        isDestructive={true}
        onConfirm={handleConfirmDeletePDF}
        onCancel={modalActions.closeConfirmDeletePDF}
      />

      {/* Reset Form Confirmation */}
      <ConfirmModal
        isOpen={modalState.confirmReset.isOpen}
        title="Reset Form"
        message="Are you sure you want to reset the form? All unsaved changes will be lost."
        confirmText="Reset"
        cancelText="Cancel"
        onConfirm={handleConfirmReset}
        onCancel={modalActions.closeConfirmReset}
      />

      {/* Save Settings Confirmation */}
      <ConfirmModal
        isOpen={modalState.confirmSaveSettings.isOpen}
        title="Save General Settings"
        message="Save the default API key and system prompt for all GPTs?"
        confirmText="Save Settings"
        cancelText="Cancel"
        onConfirm={handleSaveGeneralSettings}
        onCancel={modalActions.closeConfirmSaveSettings}
      />

      {/* Success Modal */}
      <AlertModal
        isOpen={modalState.success.isOpen}
        title={modalState.success.title}
        message={modalState.success.message}
        type="success"
        onClose={modalActions.closeSuccess}
      />

      {/* Error Modal */}
      <AlertModal
        isOpen={modalState.error.isOpen}
        title={modalState.error.title}
        message={modalState.error.message}
        type="error"
        onClose={modalActions.closeError}
      />
    </div>
  );
}
