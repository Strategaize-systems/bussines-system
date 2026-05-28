"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/**
 * V8.8 SLC-881 — Modal fuer einen einzelnen Hotspot (FEAT-881, DEC-242).
 *
 * Wraps the Base UI Dialog stack. Body comes pre-rendered as HTML from the
 * server (loader runs renderLegalMarkdown), so the Client-Component only
 * mounts the HTML via dangerouslySetInnerHTML. Reuses `.help-content` CSS
 * from globals.css (V8.3) for typography parity with the help detail page.
 *
 * Single-instance state lives in the parent (HotspotImage): only one modal
 * can be open at a time, switching hotspots replaces the content.
 */
interface HotspotModalProps {
  hotspot: { title: string; bodyHtml: string; videoUrl?: string } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function HotspotModal({ hotspot, open, onOpenChange }: HotspotModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        {hotspot ? (
          <>
            <DialogHeader>
              <DialogTitle>{hotspot.title}</DialogTitle>
            </DialogHeader>
            <div
              className="help-content"
              dangerouslySetInnerHTML={{ __html: hotspot.bodyHtml }}
            />
            {hotspot.videoUrl ? (
              <video
                controls
                className="mt-4 w-full rounded-lg"
                src={hotspot.videoUrl}
              />
            ) : null}
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
