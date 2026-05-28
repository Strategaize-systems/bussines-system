import { z } from "zod";

/**
 * V8.8 SLC-881 — zod-Schema fuer Help-Hotspots (FEAT-881, DEC-240..247).
 *
 * Storage: JSON-Files unter `cockpit/src/content/help/hotspots/<slug>.json`.
 * Pre-Render: `body_md` wird Server-side via `renderLegalMarkdown` zu `bodyHtml`.
 *
 * Author-Guideline body_md:
 *   Empfohlene Laenge 400-800 Zeichen je Hotspot fuer optimale Modal-UX.
 *   Hartes Limit `.max(2000)` ist Safety-Net gegen Layout-Bruch (DEC-245).
 *
 * Bounds-Konvention (DEC-247):
 *   x/y/w/h sind Prozent-Werte 0..100 relativ zur Image-Box.
 *   x+w <= 100 und y+h <= 100 (kein Hotspot ragt aus dem Image).
 *
 * Asset-Path-Konvention (DEC-241):
 *   imageUrl matched `/^\/help\/screenshots\/[a-z0-9-]+\.webp$/` — Flat-Folder.
 */

const SLUG_REGEX = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const IMAGE_URL_REGEX = /^\/help\/screenshots\/[a-z0-9-]+\.webp$/;

export const HotspotSchema = z
  .object({
    id: z.string().regex(SLUG_REGEX, "id must be kebab-case"),
    x: z.number().min(0).max(100),
    y: z.number().min(0).max(100),
    w: z.number().min(0).max(100),
    h: z.number().min(0).max(100),
    title: z.string().min(1).max(80),
    body_md: z.string().min(1).max(2000),
    video_url: z.string().url().optional(),
  })
  .refine((d) => d.x + d.w <= 100, {
    message: "x + w must be <= 100 (hotspot clipped horizontally)",
    path: ["w"],
  })
  .refine((d) => d.y + d.h <= 100, {
    message: "y + h must be <= 100 (hotspot clipped vertically)",
    path: ["h"],
  });

export const HotspotPageSchema = z.object({
  slug: z.string().regex(SLUG_REGEX, "slug must be kebab-case"),
  imageUrl: z
    .string()
    .regex(IMAGE_URL_REGEX, "imageUrl must match /help/screenshots/<slug>.webp"),
  imageWidth: z.number().int().positive(),
  imageHeight: z.number().int().positive(),
  imageAlt: z.string().min(1).max(160),
  hotspots: z.array(HotspotSchema).min(1).max(20),
});

export type Hotspot = z.infer<typeof HotspotSchema>;
export type HotspotPage = z.infer<typeof HotspotPageSchema>;

/**
 * Parses raw JSON to a typed HotspotPage with two extra invariants:
 *   1. parsed.slug must match the expected slug from the file path.
 *   2. all hotspot ids within the page must be unique.
 *
 * Throws zod ZodError on schema violation or plain Error on slug/uniqueness drift.
 */
export function parseHotspotPageJson(
  raw: unknown,
  expectedSlug: string,
): HotspotPage {
  const parsed = HotspotPageSchema.parse(raw);

  if (parsed.slug !== expectedSlug) {
    throw new Error(
      `hotspot page slug mismatch: file expects "${expectedSlug}" but JSON has "${parsed.slug}"`,
    );
  }

  const ids = parsed.hotspots.map((h) => h.id);
  if (new Set(ids).size !== ids.length) {
    throw new Error(
      `hotspot page "${expectedSlug}" has duplicate hotspot ids`,
    );
  }

  return parsed;
}
