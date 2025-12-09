import { Button } from "@/components/ui/button";

interface DeleteProjectModalProps {
  isOpen: boolean;
  projectName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function DeleteProjectModal({
  isOpen,
  projectName,
  onConfirm,
  onCancel
}: DeleteProjectModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-60 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Delete Project
        </h2>
        <p className="text-gray-600 mb-6">
          Are you sure you want to delete{" "}
          <span className="font-semibold text-gray-900">"{projectName}"</span>?
          This action cannot be undone and will delete all chats associated with
          this project.
        </p>
        <div className="flex justify-end gap-3">
          <Button
            type="button"
            onClick={onCancel}
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 border-0"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            className="bg-red-600 hover:bg-red-700 text-white border-0"
          >
            Delete Project
          </Button>
        </div>
      </div>
    </div>
  );
}
