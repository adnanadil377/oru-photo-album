import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface QRModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventTitle: string;
  eventUrl: string;
}

export function QRModal({ open, onOpenChange, eventTitle, eventUrl }: QRModalProps) {
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    await navigator.clipboard.writeText(eventUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{eventTitle}</DialogTitle>
          <DialogDescription>Share this with your guests</DialogDescription>
        </DialogHeader>

        <div className="mx-auto rounded-[8px] border border-charcoal/10 bg-ivory p-4">
          <QRCodeSVG value={eventUrl} size={220} bgColor="#FDFAF6" fgColor="#1C1917" level="M" />
        </div>

        <div className="rounded-[8px] border border-charcoal/10 bg-white/55 p-3 text-sm text-muted">
          <p className="break-all">{eventUrl}</p>
        </div>

        <DialogFooter>
          <Button type="button" onClick={copyLink} aria-label="Copy guest link">
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copied" : "Copy link"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
