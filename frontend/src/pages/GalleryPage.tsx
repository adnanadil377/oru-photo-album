import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Header } from "@/components/Header";
import { PhotoGrid } from "@/components/PhotoGrid";
import { ApiError, friendlyApiError, getEvent, getDownloadZipUrl, getMe, type EventResponse } from "@/lib/api";
import { Link } from "@/components/Link";
import { useGallery } from "@/hooks/useGallery";
import { useAuth } from "@/contexts/AuthContext";

interface GalleryPageProps {
  slug: string;
}

const FALLBACK_COVER =
  "https://images.unsplash.com/photo-1523438885200-e635ba2c371e?auto=format&fit=crop&w=1800&q=80";

function GallerySkeletons() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }, (_, index) => (
        <div
          key={index}
          className="h-72 animate-pulse rounded-[8px] bg-stone/35"
          aria-label="Loading photo"
        />
      ))}
    </div>
  );
}

export function GalleryPage({ slug }: GalleryPageProps) {
  const { host } = useAuth();
  const [event, setEvent] = useState<EventResponse | null>(null);
  const [loadingEvent, setLoadingEvent] = useState(true);
  const [eventError, setEventError] = useState<string | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const fetchEvent = useCallback(async () => {
    setLoadingEvent(true);
    setEventError(null);

    try {
      const response = await getEvent(slug);
      setEvent(response);
    } catch (fetchError) {
      if (fetchError instanceof ApiError && fetchError.status === 403) {
        setAccessDenied(true);
      }
      setEventError(friendlyApiError(fetchError));
    } finally {
      setLoadingEvent(false);
    }
  }, [slug]);

  useEffect(() => {
    void fetchEvent();
  }, [fetchEvent]);

  const { uploads, loading, error, hasMore, loadMore } = useGallery(slug, undefined, Boolean(event));

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const firstEntry = entries[0];
        if (firstEntry?.isIntersecting) {
          loadMore();
        }
      },
      { rootMargin: "360px" }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loadMore]);

  if (loadingEvent) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-6">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </main>
    );
  }

  if (accessDenied) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="flex min-h-[80vh] items-center justify-center px-6 text-center">
          <div className="max-w-md">
            <p className="font-serif text-4xl font-semibold text-foreground">
              You don&apos;t have access to this gallery.
            </p>
            <p className="mt-3 text-sm text-muted">
              Only the event host can view this gallery.
            </p>
            <Button asChild className="mt-6">
              <Link href="/dashboard">Back to dashboard</Link>
            </Button>
          </div>
        </main>
      </div>
    );
  }

  if (!event) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-6 text-center">
        <p className="max-w-md font-serif text-4xl font-semibold text-foreground">
          {eventError || "We could not find this event."}
        </p>
      </main>
    );
  }

  const coverImage = event.cover_image_url || FALLBACK_COVER;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="relative flex min-h-[46vh] items-end overflow-hidden px-5 pb-10 pt-24 sm:px-8">
            <img src={coverImage} alt="" className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-background to-background/20" />
            <div className="relative mx-auto flex w-full max-w-5xl flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <Link
                  href={`/e/${event.slug}`}
                  className="inline-flex rounded-md text-sm font-semibold text-foreground/80 underline-offset-4 hover:text-foreground hover:underline focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  Back to upload
                </Link>
                <p className="mt-10 text-sm font-semibold uppercase text-muted">Memoire</p>
                <h1 className="mt-3 max-w-3xl font-serif text-5xl font-semibold leading-tight text-foreground sm:text-7xl">
                  {event.title}
                </h1>
              </div>
              <div className="flex flex-col items-end gap-3">
                <p className="rounded-2xl border border-white/10 bg-surfaceHighlight/50 px-4 py-2 text-sm font-semibold text-foreground backdrop-blur-sm">
                  {event.current_uploads} photos
                </p>
                 {event.current_uploads > 0 && (
                  <Button 
                    variant="secondary" 
                    className="rounded-full bg-white/20 backdrop-blur-md text-white hover:bg-white/30 border-none cursor-pointer"
                    onClick={async (e) => {
                      e.preventDefault();
                      try {
                        await getMe();
                        window.location.href = getDownloadZipUrl(event.slug);
                      } catch (err) {
                        console.error("Failed to download zip:", err);
                      }
                    }}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download Album
                  </Button>
                )}
              </div>
            </div>
          </div>

          <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
            {uploads.length > 0 ? <PhotoGrid uploads={uploads} /> : null}
            {loading && uploads.length === 0 ? <GallerySkeletons /> : null}
            {!loading && uploads.length === 0 && !error ? (
              <div className="py-24 text-center">
                <p className="font-serif text-4xl font-semibold text-foreground">
                  No photos yet — be the first to share a moment
                </p>
              </div>
            ) : null}
            {error ? <p className="py-8 text-center text-sm font-semibold text-destructive">{error}</p> : null}
            {loading && uploads.length > 0 ? <p className="py-8 text-center text-sm text-muted">Loading more...</p> : null}
            <div ref={sentinelRef} className="h-4" />
            {hasMore && !loading ? (
              <div className="mt-8 text-center">
                <Button type="button" variant="outline" onClick={loadMore}>
                  Load more
                </Button>
              </div>
            ) : null}
          </div>
        </motion.section>
      </main>
    </div>
  );
}
