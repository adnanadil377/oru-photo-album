import { FormEvent, useMemo, useState } from "react";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createEvent, requestUpload, completeUpload, updateEvent, friendlyApiError, type EventResponse } from "@/lib/api";
import { getGuestSessionId } from "@/lib/session";

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

interface CreateEventModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (event: EventResponse) => void;
}

export function CreateEventModal({ open, onOpenChange, onCreated }: CreateEventModalProps) {
  const defaultExpiry = useMemo(() => toLocalDateTimeInput(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)), []);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [expiresAt, setExpiresAt] = useState(defaultExpiry);
  const [uploadLimit, setUploadLimit] = useState("500");
  const [password, setPassword] = useState("");
  const [startTime, setStartTime] = useState("");
  const [coverLink, setCoverLink] = useState("");
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);

  async function uploadCover(file: File, eventSlug: string, eventPassword?: string) {
    const guestSessionId = getGuestSessionId();
    const requested = await requestUpload(
      eventSlug,
      {
        guest_session_id: guestSessionId,
        file_name: file.name,
        mime_type: file.type,
        file_size: file.size,
      },
      eventPassword
    );
    
    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("PUT", requested.signed_url);
      xhr.setRequestHeader("Content-Type", file.type);
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) resolve();
        else reject(new Error("Upload failed"));
      };
      xhr.onerror = () => reject(new Error("Network error"));
      xhr.send(file);
    });

    const completed = await completeUpload(
      eventSlug,
      {
        upload_id: requested.upload_id,
        guest_session_id: guestSessionId,
        file_size: file.size,
        compressed: false,
      },
      eventPassword
    );
    
    await updateEvent(eventSlug, { cover_image_url: completed.file_url }, eventPassword);
    return completed.file_url;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const payload = {
        title,
        slug,
        expires_at: new Date(expiresAt).toISOString(),
        start_time: startTime ? new Date(startTime).toISOString() : undefined,
        max_uploads: Number(uploadLimit) || 500,
        cover_image_url: coverLink.trim() || undefined,
        ...(password.trim() ? { password: password.trim() } : {}),
      };
      
      let response = await createEvent(payload);
      
      // Save to localStorage so we know we created it
      const myEvents = JSON.parse(localStorage.getItem("my_events") || "[]");
      if (!myEvents.includes(response.slug)) {
        myEvents.push(response.slug);
        localStorage.setItem("my_events", JSON.stringify(myEvents));
      }
      if (password.trim()) {
        localStorage.setItem(`event_password_${response.slug}`, password.trim());
      }

      if (coverFile) {
        setUploadingCover(true);
        try {
          const finalUrl = await uploadCover(coverFile, response.slug, password.trim() || undefined);
          response = { ...response, cover_image_url: finalUrl };
        } catch (uploadError) {
          console.error("Failed to upload cover", uploadError);
          // We don't fail the whole creation if the cover upload fails
        } finally {
          setUploadingCover(false);
        }
      }
      
      onCreated(response);
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
          <DialogTitle className="font-serif text-2xl">Create Your Film</DialogTitle>
          <DialogDescription>
            Set up a new album to start capturing memories.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
          <div className="space-y-2">
            <Label htmlFor="title">What should we call this film?</Label>
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

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="startTime">Start time (Optional)</Label>
              <Input
                id="startTime"
                type="datetime-local"
                value={startTime}
                onChange={(event) => setStartTime(event.target.value)}
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
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
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
            <Button type="submit" disabled={loading || uploadingCover} className="w-full sm:w-auto">
              {uploadingCover ? "Uploading Cover..." : loading ? "Creating..." : "Create"}
              <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
