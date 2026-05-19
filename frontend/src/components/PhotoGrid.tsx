import { useEffect, useState, useCallback } from "react";
import Masonry from "react-masonry-css";
import { X, ChevronLeft, ChevronRight, Download } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { Button } from "@/components/ui/button";
import type { UploadResponse } from "@/lib/api";

interface PhotoGridProps {
  uploads: UploadResponse[];
}

const masonryBreakpoints = {
  default: 3,
  1024: 2,
  640: 1,
};

export function PhotoGrid({ uploads }: PhotoGridProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const handleNext = useCallback((e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (selectedIndex !== null) {
      setSelectedIndex((prev) => (prev! + 1) % uploads.length);
    }
  }, [selectedIndex, uploads.length]);

  const handlePrev = useCallback((e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (selectedIndex !== null) {
      setSelectedIndex((prev) => (prev! - 1 + uploads.length) % uploads.length);
    }
  }, [selectedIndex, uploads.length]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (selectedIndex === null) return;
      if (event.key === "Escape") setSelectedIndex(null);
      if (event.key === "ArrowRight") handleNext();
      if (event.key === "ArrowLeft") handlePrev();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedIndex, handleNext, handlePrev]);

  async function handleDownload(e: React.MouseEvent, upload: UploadResponse) {
    e.stopPropagation();
    if (isDownloading) return;
    
    setIsDownloading(true);
    try {
      const response = await fetch(upload.file_url);
      if (!response.ok) throw new Error("Failed to fetch image");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = upload.object_key.split('/').pop() || 'photo.jpg';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download failed, falling back to new tab", err);
      window.open(upload.file_url, '_blank');
    } finally {
      setIsDownloading(false);
    }
  }

  const selectedPhoto = selectedIndex !== null ? uploads[selectedIndex] : null;

  return (
    <>
      <motion.div initial="hidden" animate="show" variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05 } } }}>
        <Masonry breakpointCols={masonryBreakpoints} className="masonry-grid" columnClassName="masonry-grid_column">
          {uploads.map((upload, index) => (
            <motion.button
              key={upload.id}
              type="button"
              variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }}
              className="group relative mb-4 block w-full overflow-hidden rounded-[8px] bg-stone/20 text-left shadow-sm focus:outline-none focus:ring-2 focus:ring-charcoal md:mb-6"
              onClick={() => setSelectedIndex(index)}
              aria-label="Open photo"
            >
              <img
                src={upload.file_url}
                alt="Guest upload"
                loading="lazy"
                className="h-auto w-full object-cover transition duration-500 group-hover:scale-[1.03]"
              />
              <span className="pointer-events-none absolute inset-0 bg-blush/0 transition group-hover:bg-blush/20" />
            </motion.button>
          ))}
        </Masonry>
      </motion.div>

      <AnimatePresence>
        {selectedPhoto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 p-4 backdrop-blur-md"
            role="dialog"
            aria-modal="true"
            aria-label="Photo preview"
            onClick={() => setSelectedIndex(null)}
          >
            {/* Top right actions */}
            <div className="absolute right-4 top-4 flex items-center gap-3 z-10">
              <Button
                type="button"
                size="icon"
                variant="secondary"
                className="bg-white/10 hover:bg-white/20 text-foreground border-none backdrop-blur-md"
                onClick={(e) => handleDownload(e, selectedPhoto)}
                disabled={isDownloading}
                aria-label="Download photo"
              >
                <Download className="h-5 w-5" />
              </Button>
              <Button
                type="button"
                size="icon"
                variant="secondary"
                className="bg-white/10 hover:bg-white/20 text-foreground border-none backdrop-blur-md"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedIndex(null);
                }}
                aria-label="Close photo preview"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Navigation Arrows */}
            {uploads.length > 1 && (
              <>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="absolute left-4 top-1/2 -translate-y-1/2 z-10 h-14 w-14 rounded-full bg-black/20 hover:bg-black/40 text-white border-none"
                  onClick={handlePrev}
                  aria-label="Previous photo"
                >
                  <ChevronLeft className="h-8 w-8" />
                </Button>
                
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="absolute right-4 top-1/2 -translate-y-1/2 z-10 h-14 w-14 rounded-full bg-black/20 hover:bg-black/40 text-white border-none"
                  onClick={handleNext}
                  aria-label="Next photo"
                >
                  <ChevronRight className="h-8 w-8" />
                </Button>
              </>
            )}

            {/* Photo */}
            <motion.div 
              key={selectedPhoto.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative flex h-full w-full items-center justify-center p-8"
            >
              <img
                src={selectedPhoto.file_url}
                alt="Guest upload enlarged"
                className="max-h-full max-w-full rounded-[12px] object-contain shadow-soft"
                onClick={(e) => e.stopPropagation()} // Prevent closing when clicking the image itself
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
