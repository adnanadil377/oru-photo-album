import { FormEvent, useEffect, useState } from "react";
import { Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateEvent, friendlyApiError, type EventResponse } from "@/lib/api";

function toLocalDateTimeInput(dateString: string | null | undefined): string {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "";
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

interface EventSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: EventResponse;
  onUpdated: (event: EventResponse) => void;
}

export function EventSettingsModal({ open, onOpenChange, event, onUpdated }: EventSettingsModalProps) {
  const [expiresAt, setExpiresAt] = useState("");
  const [startTime, setStartTime] = useState("");
  const [uploadLimit, setUploadLimit] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && event) {
      setExpiresAt(toLocalDateTimeInput(event.expires_at));
      setStartTime(toLocalDateTimeInput(event.start_time));
      setUploadLimit(String(event.max_uploads));
      setCoverImageUrl(event.cover_image_url || "");
      setError(null);
    }
  }, [open, event]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const payload = {
        expires_at: expiresAt ? new Date(expiresAt).toISOString() : undefined,
        start_time: startTime ? new Date(startTime).toISOString() : undefined,
        max_uploads: Number(uploadLimit) || undefined,
        cover_image_url: coverImageUrl.trim() || undefined,
      };
      
      const password = localStorage.getItem(`event_password_${event.slug}`) || undefined;

      const response = await updateEvent(event.slug, payload, password);
      onUpdated(response);
      onOpenChange(false);
    } catch (submitError) {
      setError(friendlyApiError(submitError));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">Album Settings</DialogTitle>
          <DialogDescription>
            Update the settings for {event.title}.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
          <div className="space-y-2">
            <Label htmlFor="coverImage">Cover Image URL (Optional)</Label>
            <Input
              id="coverImage"
              value={coverImageUrl}
              onChange={(e) => setCoverImageUrl(e.target.value)}
              placeholder="https://example.com/image.jpg"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="startTime">Start Time (Optional)</Label>
            <Input
              id="startTime"
              type="datetime-local"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="expiresAt">Expiry date</Label>
            <Input
              id="expiresAt"
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="uploadLimit">Upload limit</Label>
            <Input
              id="uploadLimit"
              type="number"
              min={event.current_uploads || 1}
              max={5000}
              value={uploadLimit}
              onChange={(e) => setUploadLimit(e.target.value)}
              required
            />
          </div>

          {error ? <p className="text-sm font-semibold text-destructive">{error}</p> : null}

          <div className="mt-4 flex justify-end">
            <Button type="submit" disabled={loading} className="w-full sm:w-auto">
              <Save className="mr-2 h-4 w-4" aria-hidden="true" />
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
