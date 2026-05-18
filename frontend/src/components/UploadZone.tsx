import { ChangeEvent, DragEvent, KeyboardEvent, useRef, useState } from "react";
import { ImagePlus } from "lucide-react";
import { motion } from "framer-motion";

import { cn } from "@/lib/utils";

interface UploadZoneProps {
  onFilesSelected: (files: File[]) => void;
  disabled?: boolean;
}

const ACCEPTED_TYPES = "image/jpeg,image/png,image/heic,image/webp";

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
      aria-label="Drop your photos here or tap to browse"
      onClick={openFileDialog}
      onKeyDown={handleKeyDown}
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className={cn(
        "flex min-h-64 cursor-pointer flex-col items-center justify-center rounded-[8px] border border-dashed border-stone bg-ivory/75 px-6 py-12 text-center transition-colors focus:outline-none focus:ring-2 focus:ring-charcoal",
        dragging && "border-blush bg-blush/10",
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
      <ImagePlus className="h-10 w-10 text-charcoal" aria-hidden="true" />
      <p className="mt-5 font-serif text-3xl font-semibold text-charcoal">Drop your photos here</p>
      <p className="mt-2 text-sm text-muted">or tap to browse</p>
    </motion.div>
  );
}
