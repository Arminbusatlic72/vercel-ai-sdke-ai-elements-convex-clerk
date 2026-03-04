import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../convex/_generated/server", () => ({
  query: (config: unknown) => config,
  mutation: (config: unknown) => config
}));

import { addPdfToProject, removePdfFromProject } from "../convex/project";

describe("project PDF mutations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function makeCtx() {
    const getUserIdentity = vi.fn(async () => ({ subject: "user_1" }));
    const get = vi.fn();
    const patch = vi.fn(async () => null);
    const storageDelete = vi.fn(async () => null);

    return {
      ctx: {
        auth: { getUserIdentity },
        db: { get, patch },
        storage: { delete: storageDelete }
      },
      get,
      patch,
      storageDelete
    };
  }

  it("addPdfToProject appends metadata and sets vectorStoreId", async () => {
    const { ctx, get, patch } = makeCtx();

    get.mockResolvedValueOnce({
      _id: "project_1",
      userId: "user_1",
      pdfFiles: []
    });

    const result = await (addPdfToProject as any).handler(ctx, {
      projectId: "project_1",
      vectorStoreId: "vs_1",
      fileName: "file.pdf",
      openaiFileId: "file_openai_1",
      convexStorageId: "storage_1",
      fileSize: 1234
    });

    expect(patch).toHaveBeenCalledWith(
      "project_1",
      expect.objectContaining({
        vectorStoreId: "vs_1",
        pdfFiles: expect.arrayContaining([
          expect.objectContaining({
            fileName: "file.pdf",
            openaiFileId: "file_openai_1",
            convexStorageId: "storage_1",
            fileSize: 1234
          })
        ])
      })
    );

    expect(result).toBe("project_1");
  });

  it("removePdfFromProject deletes storage object and removes metadata", async () => {
    const { ctx, get, patch, storageDelete } = makeCtx();

    get.mockResolvedValueOnce({
      _id: "project_1",
      userId: "user_1",
      pdfFiles: [
        {
          fileName: "file-a.pdf",
          openaiFileId: "file_openai_a",
          convexStorageId: "storage_a",
          fileSize: 100,
          uploadedAt: Date.now()
        },
        {
          fileName: "file-b.pdf",
          openaiFileId: "file_openai_b",
          convexStorageId: "storage_b",
          fileSize: 200,
          uploadedAt: Date.now()
        }
      ]
    });

    const result = await (removePdfFromProject as any).handler(ctx, {
      projectId: "project_1",
      openaiFileId: "file_openai_a"
    });

    expect(storageDelete).toHaveBeenCalledWith("storage_a");
    expect(patch).toHaveBeenCalledWith("project_1", {
      pdfFiles: [
        expect.objectContaining({
          openaiFileId: "file_openai_b"
        })
      ]
    });
    expect(result).toBe("project_1");
  });
});
