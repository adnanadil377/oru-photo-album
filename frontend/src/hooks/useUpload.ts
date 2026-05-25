import { useCallback, useState } from "react";

import { ApiError, friendlyApiError, type UploadResponse } from "@/lib/api";
import { uploadFile } from "@/lib/uploader";

const MAX_CONCURRENT_UPLOADS = 3;

export type UploadStage = "queued" | "compressing" | "requesting" | "uploading" | "completing" | "done" | "error";

export interface UploadItem {
  id: string;
  file: File;
  fileName: string;
  previewUrl: string;
  stage: UploadStage;
  compressionProgress: number;
  uploadProgress: number;
  error?: string;
  response?: UploadResponse;
}

interface UseUploadOptions {
  slug: string;
  eventPassword?: string;
  guestName?: string;
  onUploadComplete?: (upload: UploadResponse) => void;
}

async function runPool(items: UploadItem[], limit: number, worker: (item: UploadItem) => Promise<void>): Promise<void> {
  let nextIndex = 0;

  async function runWorker() {
    while (nextIndex < items.length) {
      const item = items[nextIndex];
      nextIndex += 1;
      await worker(item);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, runWorker));
}

export function useUpload({ slug, eventPassword, guestName, onUploadComplete }: UseUploadOptions) {
  const [items, setItems] = useState<UploadItem[]>([]);

  const updateItem = useCallback((id: string, patch: Partial<UploadItem>) => {
    setItems((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }, []);

  const processItem = useCallback(
    async (item: UploadItem) => {
      try {
        updateItem(item.id, { stage: "queued", compressionProgress: 0, uploadProgress: 0, error: undefined });

        const completed = await uploadFile(item.file, {
          slug,
          eventPassword,
          guestName,
          onStageChange: (stage) => {
            updateItem(item.id, { stage });
          },
          onCompressProgress: (progress) => {
            updateItem(item.id, { compressionProgress: progress });
          },
          onUploadProgress: (progress) => {
            updateItem(item.id, { uploadProgress: progress });
          },
        });

        updateItem(item.id, { stage: "done", response: completed });
        onUploadComplete?.(completed);
      } catch (error) {
        updateItem(item.id, {
          stage: "error",
          error:
            error instanceof ApiError
              ? friendlyApiError(error)
              : error instanceof Error
                ? error.message
                : "Something went wrong. Please try again.",
        });
      }
    },
    [eventPassword, guestName, onUploadComplete, slug, updateItem]
  );

  const uploadFiles = useCallback(
    (files: File[]) => {
      const newItems: UploadItem[] = files.map((file) => ({
        id: crypto.randomUUID(),
        file,
        fileName: file.name,
        previewUrl: URL.createObjectURL(file),
        stage: "queued",
        compressionProgress: 0,
        uploadProgress: 0,
      }));

      setItems((current) => [...newItems, ...current]);
      void runPool(newItems, MAX_CONCURRENT_UPLOADS, processItem);
    },
    [processItem]
  );

  const retryUpload = useCallback(
    (id: string) => {
      const item = items.find((candidate) => candidate.id === id);
      if (!item) {
        return;
      }

      updateItem(id, {
        stage: "queued",
        error: undefined,
        compressionProgress: 0,
        uploadProgress: 0,
      });
      void processItem(item);
    },
    [items, processItem, updateItem]
  );

  return {
    items,
    uploadFiles,
    retryUpload,
  };
}
