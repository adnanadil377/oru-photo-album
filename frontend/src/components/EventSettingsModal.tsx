import { FormEvent, useEffect, useState } from "react";
import { Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateEvent, friendlyApiError, type EventResponse } from "@/lib/api";
import { uploadFile } from "@/lib/uploader";

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
  const [coverLink, setCoverLink] = useState("");
  const [coverFile, setCoverFile] = useState<File | null>(null);
  
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);

  async function uploadCover(file: File, eventSlug: string, eventPassword?: string) {
    const completed = await uploadFile(file, {
      slug: eventSlug,
      eventPassword,
      compress: false,
    });
    
    return completed.file_url;
  }

  useEffect(() => {
    if (open && event) {
      setExpiresAt(toLocalDateTimeInput(event.expires_at));
      setStartTime(toLocalDateTimeInput(event.start_time));
      setUploadLimit(String(event.max_uploads));
      setCoverLink(event.cover_image_url || "");
      setCoverFile(null);
      setError(null);
    }
  }, [open, event]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const password = localStorage.getItem(`event_password_${event.slug}`) || undefined;
      
      let finalCoverUrl = coverLink.trim() || undefined;
      
      if (coverFile) {
        setUploadingCover(true);
        finalCoverUrl = await uploadCover(coverFile, event.slug, password);
        setUploadingCover(false);
      }

      const payload = {
        expires_at: expiresAt ? new Date(expiresAt).toISOString() : undefined,
        start_time: startTime ? new Date(startTime).toISOString() : undefined,
        max_uploads: Number(uploadLimit) || undefined,
        cover_image_url: finalCoverUrl,
      };

      const response = await updateEvent(event.slug, payload, password);
      onUpdated(response);
      onOpenChange(false);
    } catch (submitError) {
      setError(friendlyApiError(submitError));
      setUploadingCover(false);
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
            <Label htmlFor="coverFile">Cover Image (Upload or Link)</Label>
            <div className="flex gap-2">
              <Input
                id="coverFile"
                type="file"
                accept="image/*"
                onChange={(e) => setCoverFile(e.target.files?.[0] || null)}
                className="flex-1"
              />
              <Input
                placeholder="Or paste image URL"
                value={coverLink}
                onChange={(e) => setCoverLink(e.target.value)}
                className="flex-1"
                disabled={!!coverFile}
              />
            </div>
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
            <Button type="submit" disabled={loading || uploadingCover} className="w-full sm:w-auto">
              <Save className="mr-2 h-4 w-4" aria-hidden="true" />
              {uploadingCover ? "Uploading Cover..." : loading ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
