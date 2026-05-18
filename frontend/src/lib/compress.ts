import imageCompression from "browser-image-compression";

export async function compressImage(
  file: File,
  onProgress?: (progress: number) => void
): Promise<File> {
  return imageCompression(file, {
    maxSizeMB: 2,
    maxWidthOrHeight: 2048,
    useWebWorker: true,
    fileType: "image/webp",
    onProgress,
  });
}
