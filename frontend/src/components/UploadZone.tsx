import { ChangeEvent, DragEvent, KeyboardEvent, useRef, useState } from "react";
import { ImagePlus } from "lucide-react";
import { motion } from "framer-motion";

import { cn } from "@/lib/utils";

interface UploadZoneProps {
  onFilesSelected: (files: File[]) => void;
  disabled?: boolean;
}

const ACCEPTED_TYPES = "image/jpeg,image/png,image/heic,image/webp,video/mp4,video/quicktime,video/webm";

export function UploadZone({ onFilesSelected, disabled = false }: UploadZoneProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragging, setDragging] = useState(false);

  function openFileDialog() {
    if (!disabled) {
      inputRef.current?.click();
    }
  }

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) {
      return;
    }
    onFilesSelected(Array.from(files));
  }

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    handleFiles(event.target.files);
    event.target.value = "";
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    if (!disabled) {
      handleFiles(event.dataTransfer.files);
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openFileDialog();
    }
  }

  return (
    <motion.div
      animate={{ scale: dragging ? 1.02 : 1 }}
      transition={{ duration: 0.2 }}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-label="Drop your photos & videos here or tap to browse"
      onClick={openFileDialog}
      onKeyDown={handleKeyDown}
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className={cn(
        "flex min-h-64 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-white/20 bg-surfaceHighlight/50 px-6 py-12 text-center transition-colors focus:outline-none focus:ring-2 focus:ring-ring",
        dragging && "border-white/50 bg-white/5",
        disabled && "cursor-not-allowed opacity-60"
      )}
    >
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept={ACCEPTED_TYPES}
        multiple
        onChange={handleInputChange}
        disabled={disabled}
      />
      <ImagePlus className="h-10 w-10 text-foreground" aria-hidden="true" />
      <p className="mt-5 font-serif text-3xl font-semibold text-foreground">Drop your photos & videos here</p>
      <p className="mt-2 text-sm text-muted">or tap to browse</p>
    </motion.div>
  );
}
