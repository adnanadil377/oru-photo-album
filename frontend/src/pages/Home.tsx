import { FormEvent, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EventCard } from "@/components/EventCard";
import { QRModal } from "@/components/QRModal";
import { createEvent, friendlyApiError, type EventResponse } from "@/lib/api";

const HERO_IMAGE =
  "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1800&q=80";

function toLocalDateTimeInput(date: Date): string {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 60);
}

export function Home() {
  const defaultExpiry = useMemo(() => toLocalDateTimeInput(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)), []);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [expiresAt, setExpiresAt] = useState(defaultExpiry);
  const [uploadLimit, setUploadLimit] = useState("500");
  const [password, setPassword] = useState("");
  const [createdEvent, setCreatedEvent] = useState<EventResponse | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const payload = {
        title,
        slug,
        expires_at: new Date(expiresAt).toISOString(),
        max_uploads: Number(uploadLimit) || 500,
        ...(password.trim() ? { password: password.trim() } : {}),
      };
      const response = await createEvent(payload);
      setCreatedEvent(response);
      setModalOpen(true);
    } catch (submitError) {
      setError(friendlyApiError(submitError));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-background">
      <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 py-10 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative mx-auto w-full max-w-md text-left"
        >
          <p className="text-xs font-semibold tracking-wider uppercase text-muted">Create Your Film</p>
          <h1 className="mt-4 font-serif text-5xl font-semibold leading-tight text-foreground sm:text-6xl">
            Name your film.<br />Start capturing.
          </h1>

          <form
            onSubmit={handleSubmit}
            className="mt-10 flex flex-col gap-5"          
            >
            <div className="space-y-2">
              <Label htmlFor="title" className="text-foreground text-lg font-serif">What should we call this film?</Label>
              <Input
                id="title"
                value={title}
                onChange={(event) => {
                  const nextTitle = event.target.value;
                  setTitle(nextTitle);
                  if (!slugTouched) {
                    setSlug(slugify(nextTitle));
                  }
                }}
                placeholder="New Year's Eve Party"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">Custom link</Label>
              <Input
                id="slug"
                value={slug}
                onChange={(event) => {
                  setSlugTouched(true);
                  setSlug(slugify(event.target.value));
                }}
                placeholder="ava-noor"
                required
                pattern="[a-z0-9-]{1,60}"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="expiresAt">Expiry date</Label>
              <Input
                id="expiresAt"
                type="datetime-local"
                value={expiresAt}
                onChange={(event) => setExpiresAt(event.target.value)}
                required
              />
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="uploadLimit">Upload limit</Label>
                <Input
                  id="uploadLimit"
                  type="number"
                  min={1}
                  max={5000}
                  value={uploadLimit}
                  onChange={(event) => setUploadLimit(event.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Optional"
                />
              </div>
            </div>

            {error ? <p className="text-sm font-semibold text-destructive">{error}</p> : null}

            <div className="mt-4 flex justify-end">
              <Button type="submit" disabled={loading} className="w-full sm:w-auto">
                {loading ? "Creating..." : "Next"}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          </form>

          {createdEvent ? (
            <div className="mt-8">
              <EventCard event={createdEvent} />
            </div>
          ) : null}
        </motion.div>
      </section>

      {createdEvent ? (
        <QRModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          eventTitle={createdEvent.title}
          eventUrl={createdEvent.event_url}
        />
      ) : null}
    </main>
  );
}
