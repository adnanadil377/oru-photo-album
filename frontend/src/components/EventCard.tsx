import { CalendarDays, Images } from "lucide-react";

import type { EventResponse } from "@/lib/api";

interface EventCardProps {
  event: EventResponse;
}

export function EventCard({ event }: EventCardProps) {
  const expiresAt = new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(event.expires_at));

  return (
    <div className="rounded-[8px] border border-charcoal/10 bg-ivory p-4 text-left shadow-sm">
      <p className="font-serif text-2xl font-semibold text-charcoal">{event.title}</p>
      <div className="mt-4 grid gap-3 text-sm text-muted sm:grid-cols-2">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4" aria-hidden="true" />
          <span>Open until {expiresAt}</span>
        </div>
        <div className="flex items-center gap-2">
          <Images className="h-4 w-4" aria-hidden="true" />
          <span>
            {event.current_uploads}/{event.max_uploads} photos
          </span>
        </div>
      </div>
    </div>
  );
}
