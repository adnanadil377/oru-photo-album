import { useCallback, useState } from "react";

import { ApiError, completeUpload, friendlyApiError, requestUpload, type UploadResponse } from "@/lib/api";
import { compressImage } from "@/lib/compress";
import { getGuestSessionId } from "@/lib/session";

const MAX_CONCURRENT_UPLOADS = 3;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/heic", "image/webp"]);
const MAX_FILE_SIZE = 20 * 1024 * 1024;

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
  onUploadComplete?: (upload: UploadResponse) => void;
}

function toWebpFile(file: File, originalName: string): File {
  if (file.type !== "image/webp") {
    return file;
  }

  const baseName = originalName.replace(/\.[^.]+$/, "") || "photo";
  return new File([file], `${baseName}.webp`, { type: "image/webp", lastModified: Date.now() });
}

function uploadToSignedUrl(file: File, signedUrl: string, onProgress: (progress: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", signedUrl);
    xhr.setRequestHeader("Content-Type", file.type);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress((event.loaded / event.total) * 100);
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress(100);
        resolve();
        return;
      }
      reject(new Error("R2 upload failed"));
    };

    xhr.onerror = () => reject(new Error("Network error during upload"));
    xhr.send(file);
  });
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

export function useUpload({ slug, eventPassword, onUploadComplete }: UseUploadOptions) {
  const [items, setItems] = useState<UploadItem[]>([]);

  const updateItem = useCallback((id: string, patch: Partial<UploadItem>) => {
    setItems((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }, []);

  const processItem = useCallback(
    async (item: UploadItem) => {
      try {
        if (!ALLOWED_TYPES.has(item.file.type)) {
          throw new Error("Only JPEG, PNG, HEIC, and WebP files are supported.");
        }
        if (item.file.size > MAX_FILE_SIZE) {
          throw new Error("Please upload photos under 20MB.");
        }

        updateItem(item.id, { stage: "compressing", compressionProgress: 0, uploadProgress: 0, error: undefined });

        let uploadFile = item.file;
        let compressed = false;

        try {
          const compressedFile = await compressImage(item.file, (progress) => {
            updateItem(item.id, { compressionProgress: progress });
          });
          uploadFile = toWebpFile(compressedFile, item.file.name);
          compressed = uploadFile.type === "image/webp";
        } catch (error) {
          if (item.file.type !== "image/heic") {
            throw error;
          }
          // Some browsers cannot decode HEIC for client compression; R2 still receives only a validated image file.
          updateItem(item.id, { compressionProgress: 100 });
        }

        updateItem(item.id, { stage: "requesting", compressionProgress: 100 });
        const guestSessionId = getGuestSessionId();
        const requested = await requestUpload(
          slug,
          {
            guest_session_id: guestSessionId,
            file_name: uploadFile.name,
            mime_type: uploadFile.type || item.file.type,
            file_size: uploadFile.size,
          },
          eventPassword
        );

        updateItem(item.id, { stage: "uploading", uploadProgress: 0 });
        await uploadToSignedUrl(uploadFile, requested.signed_url, (progress) => {
          updateItem(item.id, { uploadProgress: progress });
        });

        updateItem(item.id, { stage: "completing", uploadProgress: 100 });
        const completed = await completeUpload(
          slug,
          {
            upload_id: requested.upload_id,
            guest_session_id: guestSessionId,
            file_size: uploadFile.size,
            compressed,
          },
          eventPassword
        );

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
    [eventPassword, onUploadComplete, slug, updateItem]
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
