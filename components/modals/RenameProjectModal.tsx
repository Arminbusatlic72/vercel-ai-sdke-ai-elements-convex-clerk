"use client";

import * as React from "react";
import { Button } from "../ui/button";

interface RenameProjectModalProps {
  isOpen: boolean;
  name: string;
  onNameChange: (name: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
}

export default function RenameProjectModal({
  isOpen,
  name,
  onNameChange,
  onSubmit,
  onCancel
}: RenameProjectModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-sm p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">
          Rename project
        </h3>

        <input
          autoFocus
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
          placeholder="Project name"
        />

        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={onCancel} type="button">
            Cancel
          </Button>

          <Button onClick={onSubmit} disabled={!name.trim()}>
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}
