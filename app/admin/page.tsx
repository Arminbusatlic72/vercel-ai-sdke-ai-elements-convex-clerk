"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

interface GPTConfig {
  gptId: string;
  model: string;
  apiKey?: string;
  systemPrompt: string;
}

export default function AdminPage() {
  const gpts = useQuery(api.gpts.listGpts) ?? [];
  const upsertGpt = useMutation(api.gpts.upsertGpt);
  const deleteGptMutation = useMutation(api.gpts.deleteGpt);

  // Form state
  const [gptId, setGptId] = useState("");
  const [model, setModel] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  const resetForm = () => {
    setGptId("");
    setModel("");
    setApiKey("");
    setSystemPrompt("");
    setIsEditing(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    await upsertGpt({
      gptId,
      model,
      apiKey: apiKey || undefined,
      systemPrompt
    });

    resetForm();
  };

  const handleEdit = (g: GPTConfig) => {
    setGptId(g.gptId);
    setModel(g.model);
    setApiKey(g.apiKey || "");
    setSystemPrompt(g.systemPrompt);
    setIsEditing(true);
  };

  const handleDelete = async (gptId: string) => {
    await deleteGptMutation({ gptId });
    resetForm();
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>

      <form
        onSubmit={handleSubmit}
        className="space-y-4 border p-4 rounded shadow mb-8"
      >
        <h2 className="text-xl font-semibold">
          {isEditing ? "Edit GPT" : "Add New GPT"}
        </h2>

        <div>
          <label className="block font-semibold mb-1">GPT ID</label>
          <input
            type="text"
            value={gptId}
            onChange={(e) => setGptId(e.target.value)}
            placeholder="e.g., sales"
            className="w-full border rounded p-2"
            required
            disabled={isEditing}
          />
        </div>

        <div>
          <label className="block font-semibold mb-1">Model</label>
          <input
            type="text"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder="e.g., gpt-4o-mini"
            className="w-full border rounded p-2"
            required
          />
        </div>

        <div>
          <label className="block font-semibold mb-1">API Key (optional)</label>
          <input
            type="text"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="API key"
            className="w-full border rounded p-2"
          />
        </div>

        <div>
          <label className="block font-semibold mb-1">System Prompt</label>
          <textarea
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            placeholder="Enter GPT instructions"
            className="w-full border rounded p-2 h-32"
            required
          />
        </div>

        <div className="flex gap-2">
          <button
            type="submit"
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            {isEditing ? "Update GPT" : "Add GPT"}
          </button>
          {gptId && (
            <button
              type="button"
              onClick={resetForm}
              className="bg-gray-400 text-white px-4 py-2 rounded hover:bg-gray-500"
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      {gpts.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Saved GPTs</h2>
          <ul className="space-y-4">
            {gpts.map((g) => (
              <li
                key={g.gptId}
                className="border rounded p-4 shadow flex justify-between items-start"
              >
                <div>
                  <strong className="text-lg">{g.gptId}</strong> —{" "}
                  <em>{g.model}</em>
                  <p className="text-sm mt-2">{g.systemPrompt}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(g)}
                    className="bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-600"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(g.gptId)}
                    className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
