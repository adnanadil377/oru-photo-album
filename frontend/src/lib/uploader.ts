import { completeUpload, requestUpload, type UploadResponse } from "@/lib/api";
import { compressImage } from "@/lib/compress";
import { getGuestSessionId } from "@/lib/session";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/heic", "image/webp", "video/mp4", "video/quicktime", "video/webm"]);
const MAX_PHOTO_SIZE = 20 * 1024 * 1024;
const MAX_VIDEO_SIZE = 500 * 1024 * 1024;

export interface UploadOptions {
  slug: string;
  eventPassword?: string;
  guestName?: string;
  compress?: boolean;
  validate?: boolean;
  onStageChange?: (stage: "compressing" | "requesting" | "uploading" | "completing") => void;
  onCompressProgress?: (progress: number) => void;
  onUploadProgress?: (progress: number) => void;
}

function toWebpFile(file: File, originalName: string): File {
  if (file.type !== "image/webp") {
    return file;
  }

  const baseName = originalName.replace(/\.[^.]+$/, "") || "photo";
  return new File([file], `${baseName}.webp`, { type: "image/webp", lastModified: Date.now() });
}

function uploadToSignedUrl(file: File, signedUrl: string, onProgress?: (progress: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", signedUrl);
    xhr.setRequestHeader("Content-Type", file.type);

    if (onProgress) {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          onProgress((event.loaded / event.total) * 100);
        }
      };
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.(100);
        resolve();
        return;
      }
      reject(new Error("R2 upload failed"));
    };

    xhr.onerror = () => reject(new Error("Network error during upload"));
    xhr.send(file);
  });
}

export async function uploadFile(file: File, options: UploadOptions): Promise<UploadResponse> {
  const {
    slug,
    eventPassword,
    guestName,
    compress = true,
    validate = true,
    onStageChange,
    onCompressProgress,
    onUploadProgress,
  } = options;

  const isVideo = file.type.startsWith("video/");

  if (validate) {
    if (!ALLOWED_TYPES.has(file.type)) {
      throw new Error("Only JPEG, PNG, HEIC, WebP, and common video files are supported.");
    }
    const maxSize = isVideo ? MAX_VIDEO_SIZE : MAX_PHOTO_SIZE;
    if (file.size > maxSize) {
      throw new Error(`Please upload photos under 20MB and videos under 500MB.`);
    }
  }

  let uploadFile = file;
  let compressed = false;

  if (compress && !isVideo) {
    onStageChange?.("compressing");
    try {
      const compressedFile = await compressImage(file, onCompressProgress);
      uploadFile = toWebpFile(compressedFile, file.name);
      compressed = uploadFile.type === "image/webp";
    } catch (error) {
      if (file.type !== "image/heic") {
        throw error;
      }
      // Some browsers cannot decode HEIC for client compression; R2 still receives only a validated image file.
      onCompressProgress?.(100);
    }
  } else if (isVideo) {
    onCompressProgress?.(100);
  }

  onStageChange?.("requesting");
  const guestSessionId = getGuestSessionId();
  const requested = await requestUpload(
    slug,
    {
      guest_session_id: guestSessionId,
      guest_name: guestName,
      file_name: uploadFile.name,
      mime_type: uploadFile.type || file.type,
      file_size: uploadFile.size,
    },
    eventPassword
  );

  onStageChange?.("uploading");
  await uploadToSignedUrl(uploadFile, requested.signed_url, onUploadProgress);

  onStageChange?.("completing");
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

  return completed;
}
