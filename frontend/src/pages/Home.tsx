import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Plus, Settings, QrCode, Image as ImageIcon, Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import { QRModal } from "@/components/QRModal";
import { CreateEventModal } from "@/components/CreateEventModal";
import { EventSettingsModal } from "@/components/EventSettingsModal";
import { getEventsBatch, type EventResponse, getDownloadZipUrl, getMe } from "@/lib/api";
import { Link } from "@/components/Link";

const DEFAULT_COVER = "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1800&q=80";

export function Home() {
  const [events, setEvents] = useState<EventResponse[]>([]);
  const [loading, setLoading] = useState(true);

  const [createModalOpen, setCreateModalOpen] = useState(false);
  
  const [selectedEventForQR, setSelectedEventForQR] = useState<EventResponse | null>(null);
  const [selectedEventForSettings, setSelectedEventForSettings] = useState<EventResponse | null>(null);

  useEffect(() => {
    async function loadEvents() {
      try {
        const myEvents = JSON.parse(localStorage.getItem("my_events") || "[]");
        if (myEvents.length > 0) {
          const fetchedEvents = await getEventsBatch(myEvents);
          // Sort by created_at descending
          fetchedEvents.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
          setEvents(fetchedEvents);
        }
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

  return (
    <main className="min-h-screen bg-background pb-24 max-w-5xl mx-auto">
      <header className="px-6 pt-12 pb-6">
        <p className="text-xs font-semibold tracking-wider uppercase text-muted">Ready to begin?</p>
        <h1 className="mt-2 font-serif text-4xl font-semibold leading-tight text-foreground sm:text-5xl">
          Start your<br />first film today.
        </h1>
      </header>

      <section className="px-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-semibold tracking-wider uppercase text-muted">Active Albums</h2>
        </div>

        {loading ? (
          <div className="animate-pulse space-y-4">
            <div className="h-48 rounded-3xl bg-muted/20" />
            <div className="h-48 rounded-3xl bg-muted/20" />
          </div>
        ) : events.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-muted/30 py-16 text-center">
            <ImageIcon className="h-12 w-12 text-muted/50 mb-4" />
            <p className="text-muted">No albums yet</p>
            <Button variant="ghost" onClick={() => setCreateModalOpen(true)} className="mt-2 underline">
              Create your first one
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
                      <h3 className="font-serif text-2xl font-medium text-white shadow-sm">{event.title}</h3>
                      <p className="mt-1 text-sm text-white/80 flex items-center">
                        <span className={`inline-block w-2 h-2 rounded-full mr-2 ${isActive ? 'bg-green-400' : 'bg-red-400'}`} />
                        {isActive ? `${hoursLeft} hours left` : 'Expired'}
                      </p>
                    </div>

                    <div className="flex items-center justify-between">
                      <Button asChild variant="secondary" className="rounded-full bg-white/20 backdrop-blur-md text-white hover:bg-white/30 border-none">
                         <Link href={`/e/${event.slug}/gallery`}>View Gallery</Link>
                      </Button>
                      
                      <div className="flex gap-2">
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
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="rounded-full bg-black/40 text-white hover:bg-black/60 cursor-pointer"
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
                          <Download className="h-4 w-4" />
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
  );
}
