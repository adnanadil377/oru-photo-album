import { FormEvent, useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Check, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ProgressBar } from "@/components/ProgressBar";
import { UploadZone } from "@/components/UploadZone";
import { ApiError, friendlyApiError, getEvent, type EventResponse, type UploadResponse } from "@/lib/api";
import { type UploadItem, useUpload } from "@/hooks/useUpload";

const FALLBACK_COVER =
  "https://images.unsplash.com/photo-1523438885200-e635ba2c371e?auto=format&fit=crop&w=1800&q=80";

interface EventPageProps {
  slug: string;
}

function stageLabel(item: UploadItem): string {
  const labels: Record<UploadItem["stage"], string> = {
    queued: "Queued",
    compressing: "Compressing...",
    requesting: "Preparing...",
    uploading: "Uploading...",
    completing: "Finishing...",
    done: "Done",
    error: "Needs attention",
  };
  return item.error ?? labels[item.stage];
}

function UploadCard({ item, onRetry }: { item: UploadItem; onRetry: (id: string) => void }) {
  const isDone = item.stage === "done";
  const isError = item.stage === "error";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="grid gap-4 rounded-2xl border border-white/10 bg-surfaceHighlight p-3 shadow-sm sm:grid-cols-[88px_1fr_auto]"
    >
      <img src={item.previewUrl} alt="" className="h-24 w-full rounded-xl object-cover sm:h-[88px] sm:w-[88px]" />
      <div className="min-w-0 space-y-3">
        <div>
          <p className="truncate text-sm font-semibold text-foreground">{item.fileName}</p>
          <p className="mt-1 text-sm text-muted">{stageLabel(item)}</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <ProgressBar value={item.compressionProgress} label="Compression" />
          <ProgressBar value={item.uploadProgress} label="Upload" />
        </div>
      </div>
      <div className="flex items-center justify-end">
        {isDone ? (
          <motion.svg width="32" height="32" viewBox="0 0 32 32" aria-label="Upload complete">
            <motion.circle
              cx="16"
              cy="16"
              r="14"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="2"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.45 }}
            />
            <motion.path
              d="M9 16.5l4.2 4.2L23 11"
              fill="none"
              stroke="#FFFFFF"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2.4"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.35, delay: 0.2 }}
            />
          </motion.svg>
        ) : null}
        {isError ? (
          <Button type="button" variant="outline" size="sm" onClick={() => onRetry(item.id)}>
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Retry
          </Button>
        ) : null}
      </div>
    </motion.div>
  );
}

export function EventPage({ slug }: EventPageProps) {
  const [event, setEvent] = useState<EventResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [passwordRequired, setPasswordRequired] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [acceptedPassword, setAcceptedPassword] = useState<string | undefined>();
  const [showThankYou, setShowThankYou] = useState(false);

  const fetchEvent = useCallback(
    async (password?: string) => {
      setLoading(true);
      setError(null);

      try {
        const response = await getEvent(slug, password);
        setEvent(response);
        setPasswordRequired(false);
        setAcceptedPassword(password);
      } catch (fetchError) {
        if (fetchError instanceof ApiError && fetchError.status === 401) {
          setPasswordRequired(true);
          setError(friendlyApiError(fetchError));
        } else {
          setError(friendlyApiError(fetchError));
        }
      } finally {
        setLoading(false);
      }
    },
    [slug]
  );

  useEffect(() => {
    void fetchEvent();
  }, [fetchEvent]);

  const handleCompletedUpload = useCallback((upload: UploadResponse) => {
    setEvent((current) =>
      current
        ? {
            ...current,
            current_uploads: current.current_uploads + 1,
            current_storage_bytes: current.current_storage_bytes + upload.file_size,
          }
        : current
    );
  }, []);

  const { items, uploadFiles, retryUpload } = useUpload({
    slug,
    eventPassword: acceptedPassword,
    onUploadComplete: handleCompletedUpload,
  });

  useEffect(() => {
    if (items.length > 0 && items.every((item) => item.stage === "done")) {
      const timer = setTimeout(() => setShowThankYou(true), 1500);
      return () => clearTimeout(timer);
    }
  }, [items]);

  async function handlePasswordSubmit(submitEvent: FormEvent<HTMLFormElement>) {
    submitEvent.preventDefault();
    await fetchEvent(passwordInput);
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-6">
        <p className="font-serif text-4xl font-semibold text-foreground">Preparing the album...</p>
      </main>
    );
  }

  if (passwordRequired && !event) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-6">
        <form
          onSubmit={handlePasswordSubmit}
          className="w-full max-w-sm space-y-4 rounded-2xl border border-white/10 bg-surfaceHighlight/50 p-6 text-center shadow-soft backdrop-blur-sm"
        >
          <p className="font-serif text-4xl font-semibold text-foreground">A private album</p>
          <div className="space-y-2 text-left">
            <Label htmlFor="eventPassword">Password</Label>
            <Input
              id="eventPassword"
              type="password"
              value={passwordInput}
              onChange={(event) => setPasswordInput(event.target.value)}
              autoFocus
              required
            />
          </div>
          {error ? <p className="text-sm font-semibold text-destructive">{error}</p> : null}
          <Button type="submit" className="w-full">
            Continue
          </Button>
        </form>
      </main>
    );
  }

  if (!event) {
    const isNotStarted = error === "This event hasn't started yet. Check back later!";
    const isEnded = error === "This event has ended. Thank you for being part of this day.";
    
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-6 text-center">
        <div className="max-w-md">
          <p className="font-serif text-4xl font-semibold text-foreground">
            {isNotStarted ? error : isEnded ? error : "We could not find this event."}
          </p>
        </div>
      </main>
    );
  }

  const coverImage = event.cover_image_url || FALLBACK_COVER;

  if (showThankYou) {
    return (
      <main className="min-h-screen bg-background relative overflow-hidden flex items-center justify-center p-6">
        <img src={coverImage} alt="" className="absolute inset-0 h-full w-full object-cover opacity-30" />
        <div className="absolute inset-0 bg-background/80 backdrop-blur-md" />
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative max-w-md w-full rounded-3xl bg-surfaceHighlight/80 p-10 text-center shadow-2xl border border-white/10 backdrop-blur-xl"
        >
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-500/20 text-green-400 mb-6">
            <Check className="h-10 w-10" />
          </div>
          <h2 className="font-serif text-4xl font-semibold text-foreground mb-4">Thank You!</h2>
          <p className="text-muted text-lg mb-8">
            Your photos have been added to the album. Thanks for sharing these memories!
          </p>
          <div className="flex flex-col gap-3">
            <Button variant="secondary" size="lg" onClick={() => setShowThankYou(false)} className="w-full text-lg rounded-xl">
              Upload More
            </Button>
          </div>
        </motion.div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="relative flex min-h-[56vh] items-end overflow-hidden px-5 pb-10 pt-28 sm:px-8">
          <img src={coverImage} alt="" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-background to-background/20" />
          <div className="relative mx-auto w-full max-w-5xl">
            <p className="text-sm font-semibold uppercase text-muted">Memoire</p>
            <h1 className="mt-3 max-w-3xl font-serif text-5xl font-semibold leading-tight text-foreground sm:text-7xl">
              {event.title}
            </h1>
          </div>
        </div>

        <section className="mx-auto max-w-2xl px-5 py-12 sm:px-8">
          <div className="space-y-8">
            <div className="text-center space-y-3">
              <h2 className="font-serif text-3xl font-semibold text-foreground">Add to the memories</h2>
              <p className="text-muted text-lg">Your photos help complete the story. We'd love to see this day through your eyes!</p>
            </div>
            
            <div className="space-y-6">
              <UploadZone onFilesSelected={uploadFiles} />
              <p className="text-sm font-semibold text-muted text-center">Share your best moments - up to 30 photos</p>
              <div className="space-y-3">
                {items.map((item) => (
                  <UploadCard key={item.id} item={item} onRetry={retryUpload} />
                ))}
              </div>
            </div>
          </div>
        </section>
      </motion.section>
    </main>
  );
}
