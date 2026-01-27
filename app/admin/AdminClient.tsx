"use client";
import { Id } from "@/convex/_generated/dataModel";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useConvex } from "convex/react";
import { api } from "@/convex/_generated/api";
import { GPTConfig, ModelConfig } from "@/lib/types";
import { openaiModels } from "@/lib/ai-models";
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

export default function AdminClient() {
  const convex = useConvex();

  // Data fetching
  // const gpts = useQuery(api.gpts.listGpts) ?? ([] as GPTConfig[]);
  const gpts: GPTConfig[] = useQuery(api.gpts.listGpts) ?? [];
  const generalSettings = useQuery(api.gpts.getGeneralSettings);
  const upsertGpt = useMutation(api.gpts.upsertGpt);
  const deleteGptMutation = useMutation(api.gpts.deleteGpt);
  const upsertGeneralSettings = useMutation(api.gpts.upsertGeneralSettings);

  // Modal state
  const { state: modalState, actions: modalActions } = useAdminModals();

  // Form state
  const [gptId, setGptId] = useState("");
  const [gptIdInput, setGptIdInput] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
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
  // const selectedGpt = gpts.find((g) => g.gptId === selectedGptId);
  const selectedGpt = gpts.find((g) => g.gptId === selectedGptId);

  const sanitizedPreview = sanitizeGptId(gptIdInput);
  const showPreview = Boolean(gptIdInput && sanitizedPreview !== gptIdInput);
  const modelOptions: readonly ModelConfig[] = openaiModels;

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
    setName(""); // ✅ ADD THIS
    setDescription(""); // ✅ ADD THIS
    setModel("gpt-5");
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
        name: name || undefined, // ✅ ADD THIS
        description: description || undefined, // ✅ ADD THIS
        model,
        apiKey: apiKey || undefined,
        systemPrompt,
        packageId: selectedPackageId
          ? (selectedPackageId as Id<"packages">)
          : undefined // Send to Convex
      });
      resetForm();
      modalActions.openSuccess(
        "GPT Saved",
        isEditing ? "GPT updated successfully!" : "GPT created successfully!"
      );
    } catch (error) {
      console.error("Error saving GPT:", error);
      modalActions.openError("Error Saving GPT", "Failed to save GPT.");
    } finally {
      setIsSubmitting(false);
    }
  };
  const [selectedPackageId, setSelectedPackageId] = useState<
    Id<"packages"> | string | undefined
  >("");
  const handleEdit = (g: GPTConfig) => {
    setGptId(g.gptId);
    setGptIdInput(g.gptId);
    setName(g.name || ""); // ✅ ADD THIS
    setDescription(g.description || ""); // ✅ ADD THIS
    setModel(g.model);
    setApiKey(g.apiKey || "");
    setSystemPrompt(g.systemPrompt || "");
    setSelectedPackageId(g.packageId || ""); // Set package on edit
    setIsEditing(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDeleteClick = (gptId: string) => {
    setPendingDeleteGptId(gptId);
    setSelectedPackageId(undefined);
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
  // app/admin/page.tsx (or wherever your AdminClient is)

  // Find and REPLACE the handlePdfUpload function:

  const handlePdfUpload = async (gptId: string, files: FileList) => {
    setUploadingPdf(gptId);
    setPdfError(null);

    try {
      const fileArray = Array.from(files);

      for (let i = 0; i < fileArray.length; i++) {
        const file = fileArray[i];

        console.log(
          `[Upload ${i + 1}/${fileArray.length}] Starting: ${file.name}`
        );

        // ✅ Step 1: Get upload URL from Convex
        const uploadUrl = await convex.mutation(api.storage.generateUploadUrl);

        // ✅ Step 2: Upload file directly to Convex Storage
        const uploadResult = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": file.type },
          body: file
        });

        if (!uploadResult.ok) {
          throw new Error(`Upload to Convex failed for ${file.name}`);
        }

        const { storageId } = await uploadResult.json();
        console.log(`[Convex Storage] File uploaded: ${storageId}`);

        // ✅ Step 3: Process and send to OpenAI
        const processResponse = await fetch("/api/process-convex-pdf", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            gptId,
            storageId,
            fileName: file.name,
            fileSize: file.size
          })
        });

        if (!processResponse.ok) {
          const errorData = await processResponse.json();
          throw new Error(errorData.error || "Processing failed");
        }

        const processData = await processResponse.json();
        console.log(
          `[Success] ${file.name} → OpenAI: ${processData.openaiFileId}`
        );
      }

      modalActions.openSuccess(
        "✅ PDFs Uploaded",
        `Successfully uploaded ${fileArray.length} file(s) to "${gptId}"!`
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Upload failed";
      setPdfError(errorMessage);
      modalActions.openError("❌ Upload Failed", errorMessage);
      console.error("[Upload Error]", error);
    } finally {
      setUploadingPdf(null);
    }
  };

  // Find and REPLACE the handleReplacePdf function:

  const handleReplacePdf = async (
    gptId: string,
    oldOpenaiFileId: string,
    newFile: File
  ) => {
    setUploadingPdf(gptId);
    setPdfError(null);

    try {
      console.log(`[Replace] Deleting old file: ${oldOpenaiFileId}`);

      // ✅ Delete old PDF (this now also deletes from Convex storage)
      const deleteResponse = await fetch("/api/delete-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gptId, openaiFileId: oldOpenaiFileId })
      });

      if (!deleteResponse.ok) {
        const deleteData = await deleteResponse.json();
        throw new Error(deleteData.error || "Delete failed");
      }

      console.log(`[Replace] Old file deleted, uploading new file...`);

      // ✅ Upload new PDF using new flow
      const uploadUrl = await convex.mutation(api.storage.generateUploadUrl);

      const uploadResult = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": newFile.type },
        body: newFile
      });

      if (!uploadResult.ok) {
        throw new Error("Upload to Convex failed");
      }

      const { storageId } = await uploadResult.json();

      const processResponse = await fetch("/api/process-convex-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gptId,
          storageId,
          fileName: newFile.name,
          fileSize: newFile.size
        })
      });

      if (!processResponse.ok) {
        const errorData = await processResponse.json();
        throw new Error(errorData.error || "Processing failed");
      }

      console.log(`[Replace] Success!`);

      modalActions.openSuccess("✅ PDF Replaced", "PDF replaced successfully!");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Replace failed";
      setPdfError(errorMessage);
      modalActions.openError("❌ Replace Failed", errorMessage);
      console.error("[Replace Error]", error);
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

  // General settings handler
  const handleSaveGeneralSettings = async () => {
    setIsSavingGeneralSettings(true);
    try {
      //   const userId = "admin-user"; // TODO: Replace with actual user ID

      await upsertGeneralSettings({
        defaultApiKey: generalApiKey || undefined,
        defaultSystemPrompt: generalSystemPrompt || undefined
        // userId
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
    <div className="min-h-screen bg-linear-to-br from-gray-50 to-gray-100 p-4 md:p-6">
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
              name={name} // ✅ ADD THIS
              description={description} // ✅ ADD THIS
              model={model}
              apiKey={apiKey}
              systemPrompt={systemPrompt}
              generalSystemPrompt={generalSystemPrompt}
              isSubmitting={isSubmitting}
              sanitizedPreview={sanitizedPreview}
              selectedPackageId={selectedPackageId}
              onPackageChange={setSelectedPackageId}
              showPreview={showPreview}
              modelOptions={modelOptions}
              onGptIdChange={setGptIdInput}
              onNameChange={setName} // ✅ ADD THIS
              onDescriptionChange={setDescription} // ✅ ADD THIS
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
