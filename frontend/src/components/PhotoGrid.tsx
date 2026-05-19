import { useEffect, useState } from "react";
import Masonry from "react-masonry-css";
import { X } from "lucide-react";
import { motion } from "framer-motion";

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
  const [selectedPhoto, setSelectedPhoto] = useState<UploadResponse | null>(null);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setSelectedPhoto(null);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <>
      <motion.div initial="hidden" animate="show" variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05 } } }}>
        <Masonry breakpointCols={masonryBreakpoints} className="masonry-grid" columnClassName="masonry-grid_column">
          {uploads.map((upload) => (
            <motion.button
              key={upload.id}
              type="button"
              variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }}
              className="group relative mb-4 block w-full overflow-hidden rounded-[8px] bg-stone/20 text-left shadow-sm focus:outline-none focus:ring-2 focus:ring-charcoal md:mb-6"
              onClick={() => setSelectedPhoto(upload)}
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

      {selectedPhoto ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Photo preview"
          onClick={() => setSelectedPhoto(null)}
        >
          <Button
            type="button"
            size="icon"
            variant="secondary"
            className="absolute right-4 top-4"
            onClick={() => setSelectedPhoto(null)}
            aria-label="Close photo preview"
          >
            <X className="h-5 w-5" />
          </Button>
          <img
            src={selectedPhoto.file_url}
            alt="Guest upload enlarged"
            className="max-h-[86vh] max-w-[92vw] rounded-[8px] object-contain shadow-soft"
          />
        </div>
      ) : null}
    </>
  );
}
