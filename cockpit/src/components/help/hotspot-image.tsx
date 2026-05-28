"use client";

import { useState } from "react";
import { HotspotModal } from "@/components/help/hotspot-modal";
import type { HotspotPageData } from "@/lib/help/hotspot-loader";

/**
 * V8.8 SLC-881 — Annotated screenshot with clickable hotspots (FEAT-881).
 *
 * Single component renders both viewports via Tailwind's CSS-only responsive
 * utilities (no useMediaQuery / no JS branch / no hydration mismatch — DEC-247
 * Capture-Resolution context, IMP-819 Pattern-Lehre):
 *
 *   - >= 768px: image with absolute-positioned button overlays.
 *   - <  768px: same image plus a numbered `<ol>` list below it (overlays
 *     hidden) so touch users still get the explanations without tiny tap
 *     targets on top of the image.
 *
 * Single-instance modal state lives here; switching hotspots simply swaps
 * the open id (no stacking).
 */
interface HotspotImageProps {
  data: HotspotPageData;
}

export function HotspotImage({ data }: HotspotImageProps) {
  const [openHotspotId, setOpenHotspotId] = useState<string | null>(null);
  const openHotspot = data.hotspots.find((h) => h.id === openHotspotId) ?? null;

  return (
    <>
      <figure className="relative">
        {/* eslint-disable-next-line @next/next/no-img-element -- absolute-positioned overlays rely on the figure being the positioning context with the exact rendered width of <img>; next/image would wrap in its own container and break the layout. */}
        <img
          src={data.imageUrl}
          alt={data.imageAlt}
          width={data.imageWidth}
          height={data.imageHeight}
          loading="lazy"
          className="h-auto w-full rounded-lg ring-1 ring-slate-200"
        />
        <div className="pointer-events-none absolute inset-0 hidden md:block">
          {data.hotspots.map((h, i) => (
            <button
              key={h.id}
              type="button"
              onClick={() => setOpenHotspotId(h.id)}
              className="pointer-events-auto absolute cursor-help rounded border-2 border-transparent transition-colors hover:border-amber-500 focus-visible:border-amber-500 focus-visible:outline-2 focus-visible:outline-amber-500"
              style={{
                left: `${h.x}%`,
                top: `${h.y}%`,
                width: `${h.w}%`,
                height: `${h.h}%`,
              }}
            >
              <span className="sr-only">
                {i + 1}. {h.title}
              </span>
            </button>
          ))}
        </div>
      </figure>

      <ol
        className="mt-6 list-inside list-decimal space-y-4 md:hidden"
        aria-label="Hotspot-Erklaerungen fuer Mobile"
      >
        {data.hotspots.map((h) => (
          <li key={h.id}>
            <strong className="font-medium">{h.title}</strong>
            <div
              className="help-content mt-1"
              dangerouslySetInnerHTML={{ __html: h.bodyHtml }}
            />
          </li>
        ))}
      </ol>

      <HotspotModal
        hotspot={
          openHotspot
            ? {
                title: openHotspot.title,
                bodyHtml: openHotspot.bodyHtml,
                videoUrl: openHotspot.video_url,
              }
            : null
        }
        open={openHotspotId !== null}
        onOpenChange={(open) => {
          if (!open) setOpenHotspotId(null);
        }}
      />
    </>
  );
}
