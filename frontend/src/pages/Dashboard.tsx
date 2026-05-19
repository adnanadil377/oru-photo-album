import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Plus, QrCode, Settings, Image as ImageIcon, Copy, Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Header } from "@/components/Header";
import { QRModal } from "@/components/QRModal";
import { CreateEventModal } from "@/components/CreateEventModal";
import { EventSettingsModal } from "@/components/EventSettingsModal";
import { getMyEvents, type EventResponse } from "@/lib/api";

const DEFAULT_COVER = "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1800&q=80";

export function Dashboard() {
  const [events, setEvents] = useState<EventResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedEventForQR, setSelectedEventForQR] = useState<EventResponse | null>(null);
  const [selectedEventForSettings, setSelectedEventForSettings] = useState<EventResponse | null>(null);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  useEffect(() => {
    async function loadEvents() {
      try {
        const fetchedEvents = await getMyEvents();
        setEvents(fetchedEvents);
      } catch (err) {
        console.error("Failed to load events", err);
      } finally {
        setLoading(false);
      }
    }
    loadEvents();
  }, []);

  function handleEventCreated(newEvent: EventResponse) {
    setEvents((prev) => [newEvent, ...prev]);
  }

  function handleEventUpdated(updatedEvent: EventResponse) {
    setEvents((prev) => prev.map((e) => (e.id === updatedEvent.id ? updatedEvent : e)));
  }

  async function copyGuestLink(event: EventResponse) {
    await navigator.clipboard.writeText(event.event_url);
    setCopiedSlug(event.slug);
    setTimeout(() => setCopiedSlug(null), 2000);
  }

  function formatExpiry(dateStr: string) {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="pb-24">
        <header className="px-6 pt-10 pb-6">
          <p className="text-xs font-semibold tracking-wider uppercase text-muted">Dashboard</p>
          <h1 className="mt-2 font-serif text-4xl font-semibold leading-tight text-foreground sm:text-5xl">
            Your Events.
          </h1>
          <p className="mt-1 text-sm text-muted">Manage and share your event galleries.</p>
        </header>

        <section className="px-6">
          {loading ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }, (_, i) => (
                <div key={i} className="animate-pulse rounded-3xl bg-muted/20 aspect-[3/4]" />
              ))}
            </div>
          ) : events.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-muted/30 py-16 text-center">
              <ImageIcon className="h-12 w-12 text-muted/50 mb-4" />
              <p className="font-serif text-xl text-foreground">No events yet</p>
              <p className="text-sm text-muted mt-1">Create your first one to get started.</p>
              <Button onClick={() => setCreateModalOpen(true)} className="mt-4">
                <Plus className="mr-2 h-4 w-4" />
                Create Event
              </Button>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {events.map((event) => {
                const isActive = new Date(event.expires_at).getTime() > Date.now();
                const hoursLeft = Math.max(0, Math.floor((new Date(event.expires_at).getTime() - Date.now()) / (1000 * 60 * 60)));

                return (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="group relative overflow-hidden rounded-3xl aspect-[3/4] bg-muted/20"
                  >
                    <img
                      src={event.cover_image_url || DEFAULT_COVER}
                      alt={event.title}
                      className="absolute inset-0 h-full w-full object-cover opacity-80 transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/60" />

                    <div className="absolute inset-0 flex flex-col justify-between p-6">
                      <div>
                        <h3 className="font-serif text-2xl font-medium text-white">{event.title}</h3>
                        <p className="mt-1 text-sm text-white/80 flex items-center">
                          <span className={`inline-block w-2 h-2 rounded-full mr-2 ${isActive ? "bg-green-400" : "bg-red-400"}`} />
                          {isActive ? `${hoursLeft}h left` : "Expired"}
                        </p>
                        <p className="mt-0.5 text-xs text-white/60">
                          Expires {formatExpiry(event.expires_at)} · {event.current_uploads} photos
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Button
                          asChild
                          variant="secondary"
                          className="w-full rounded-full bg-white/20 backdrop-blur-md text-white hover:bg-white/30 border-none"
                        >
                          <a href={`/e/${event.slug}/gallery`}>View Gallery</a>
                        </Button>

                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="flex-1 rounded-full bg-black/40 text-white hover:bg-black/60 text-xs"
                            onClick={() => copyGuestLink(event)}
                          >
                            {copiedSlug === event.slug ? (
                              <><Check className="h-3 w-3 mr-1" /> Copied</>
                            ) : (
                              <><Copy className="h-3 w-3 mr-1" /> Guest link</>
                            )}
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="rounded-full bg-black/40 text-white hover:bg-black/60"
                            onClick={() => setSelectedEventForQR(event)}
                          >
                            <QrCode className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="rounded-full bg-black/40 text-white hover:bg-black/60"
                            onClick={() => setSelectedEventForSettings(event)}
                          >
                            <Settings className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </section>

        {/* Floating Action Button */}
        <div className="fixed bottom-8 left-0 right-0 flex justify-center pointer-events-none">
          <Button
            size="lg"
            onClick={() => setCreateModalOpen(true)}
            className="pointer-events-auto shadow-2xl shadow-primary/20 rounded-full px-8 h-14"
          >
            <Plus className="mr-2 h-5 w-5" />
            Create Album
          </Button>
        </div>

        <CreateEventModal
          open={createModalOpen}
          onOpenChange={setCreateModalOpen}
          onCreated={handleEventCreated}
        />

        {selectedEventForSettings ? (
          <EventSettingsModal
            open={!!selectedEventForSettings}
            onOpenChange={(open) => !open && setSelectedEventForSettings(null)}
            event={selectedEventForSettings}
            onUpdated={handleEventUpdated}
          />
        ) : null}

        {selectedEventForQR ? (
          <QRModal
            open={!!selectedEventForQR}
            onOpenChange={(open) => !open && setSelectedEventForQR(null)}
            eventTitle={selectedEventForQR.title}
            eventUrl={selectedEventForQR.event_url}
          />
        ) : null}
      </main>
    </div>
  );
}
