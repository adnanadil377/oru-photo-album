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
    <main className="min-h-screen bg-ivory">
      <section className="relative flex min-h-screen items-center overflow-hidden px-4 py-10 sm:px-6">
        <img src={HERO_IMAGE} alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-charcoal/45" />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative mx-auto w-full max-w-3xl text-center"
        >
          <p className="text-sm font-semibold uppercase text-ivory/80">Memoire</p>
          <h1 className="mt-4 font-serif text-5xl font-semibold leading-[1.02] text-ivory sm:text-7xl">
            Your day, beautifully remembered.
          </h1>

          <form
            onSubmit={handleSubmit}
            className="mx-auto mt-8 grid max-w-2xl gap-4 rounded-[20px] border border-white/50 bg-white/70 p-4 text-left shadow-[0_8px_40px_rgba(0,0,0,0.18)] ring-1 ring-white/10 backdrop-blur-2xl backdrop-saturate-200 sm:grid-cols-2 sm:p-6"          
            >
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="title">Event title</Label>
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
                placeholder="Ava & Noor"
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

            {error ? <p className="text-sm font-semibold text-destructive sm:col-span-2">{error}</p> : null}

            <Button type="submit" disabled={loading} className="sm:col-span-2">
              {loading ? "Creating..." : "Create event"}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </form>

          {createdEvent ? (
            <div className="mx-auto mt-5 max-w-2xl">
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
