import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PhotoGrid } from "@/components/PhotoGrid";
import { ApiError, friendlyApiError, getEvent, type EventResponse } from "@/lib/api";
import { useGallery } from "@/hooks/useGallery";

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
  const [event, setEvent] = useState<EventResponse | null>(null);
  const [loadingEvent, setLoadingEvent] = useState(true);
  const [eventError, setEventError] = useState<string | null>(null);
  const [passwordRequired, setPasswordRequired] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [acceptedPassword, setAcceptedPassword] = useState<string | undefined>();
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const fetchEvent = useCallback(
    async (password?: string) => {
      setLoadingEvent(true);
      setEventError(null);

      try {
        const response = await getEvent(slug, password);
        setEvent(response);
        setPasswordRequired(false);
        setAcceptedPassword(password);
      } catch (fetchError) {
        if (fetchError instanceof ApiError && fetchError.status === 401) {
          setPasswordRequired(true);
        }
        setEventError(friendlyApiError(fetchError));
      } finally {
        setLoadingEvent(false);
      }
    },
    [slug]
  );

  useEffect(() => {
    void fetchEvent();
  }, [fetchEvent]);

  const { uploads, loading, error, hasMore, loadMore } = useGallery(slug, acceptedPassword, Boolean(event));

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

  async function handlePasswordSubmit(submitEvent: FormEvent<HTMLFormElement>) {
    submitEvent.preventDefault();
    await fetchEvent(passwordInput);
  }

  if (loadingEvent) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-ivory px-6">
        <p className="font-serif text-4xl font-semibold text-charcoal">Opening the gallery...</p>
      </main>
    );
  }

  if (passwordRequired && !event) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-ivory px-6">
        <form
          onSubmit={handlePasswordSubmit}
          className="w-full max-w-sm space-y-4 rounded-[8px] border border-ivory/65 bg-ivory/95 p-6 text-center shadow-soft backdrop-blur-sm"
        >
          <p className="font-serif text-4xl font-semibold text-charcoal">A private gallery</p>
          <div className="space-y-2 text-left">
            <Label htmlFor="galleryPassword">Password</Label>
            <Input
              id="galleryPassword"
              type="password"
              value={passwordInput}
              onChange={(event) => setPasswordInput(event.target.value)}
              autoFocus
              required
            />
          </div>
          {eventError ? <p className="text-sm font-semibold text-destructive">{eventError}</p> : null}
          <Button type="submit" className="w-full">
            Continue
          </Button>
        </form>
      </main>
    );
  }

  if (!event) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-ivory px-6 text-center">
        <p className="max-w-md font-serif text-4xl font-semibold text-charcoal">
          {eventError || "We could not find this event."}
        </p>
      </main>
    );
  }

  const coverImage = event.cover_image_url || FALLBACK_COVER;

  return (
    <main className="min-h-screen bg-ivory">
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="relative flex min-h-[46vh] items-end overflow-hidden px-5 pb-10 pt-24 sm:px-8">
          <img src={coverImage} alt="" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-charcoal/45" />
          <div className="relative mx-auto flex w-full max-w-5xl flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <a
                href={`/e/${event.slug}`}
                className="inline-flex rounded-[8px] text-sm font-semibold text-ivory/85 underline-offset-4 hover:text-ivory hover:underline focus:outline-none focus:ring-2 focus:ring-ivory"
              >
                Back to upload
              </a>
              <p className="mt-10 text-sm font-semibold uppercase text-ivory/80">Memoire</p>
              <h1 className="mt-3 max-w-3xl font-serif text-5xl font-semibold leading-tight text-ivory sm:text-7xl">
                {event.title}
              </h1>
            </div>
            <p className="rounded-[8px] border border-ivory/30 bg-charcoal/20 px-4 py-2 text-sm font-semibold text-ivory backdrop-blur-sm">
              {event.current_uploads} photos
            </p>
          </div>
        </div>

        <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
          {uploads.length > 0 ? <PhotoGrid uploads={uploads} /> : null}
          {loading && uploads.length === 0 ? <GallerySkeletons /> : null}
          {!loading && uploads.length === 0 && !error ? (
            <div className="py-24 text-center">
              <p className="font-serif text-4xl font-semibold text-charcoal">
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
  );
}
