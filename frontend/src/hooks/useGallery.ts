import { useCallback, useEffect, useRef, useState } from "react";

import { friendlyApiError, getGallery, type UploadResponse } from "@/lib/api";

export function useGallery(slug: string, password?: string, enabled = true) {
  const [uploads, setUploads] = useState<UploadResponse[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadingRef = useRef(false);

  const fetchPage = useCallback(
    async (pageToLoad: number, replace: boolean) => {
      if (!enabled || loadingRef.current) {
        return;
      }

      loadingRef.current = true;
      setLoading(true);
      setError(null);

      try {
        const response = await getGallery(slug, pageToLoad, 20, password);
        setUploads((current) => (replace ? response.uploads : [...current, ...response.uploads]));
        setPage(response.page);
        setHasMore(response.has_more);
      } catch (fetchError) {
        setError(friendlyApiError(fetchError));
      } finally {
        loadingRef.current = false;
        setLoading(false);
      }
    },
    [enabled, password, slug]
  );

  useEffect(() => {
    if (!enabled) {
      setUploads([]);
      setPage(1);
      setHasMore(false);
      return;
    }

    void fetchPage(1, true);
  }, [enabled, fetchPage]);

  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      void fetchPage(page + 1, false);
    }
  }, [fetchPage, hasMore, loading, page]);

  return {
    uploads,
    loading,
    error,
    hasMore,
    loadMore,
  };
}
