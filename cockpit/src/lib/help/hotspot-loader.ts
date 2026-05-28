import { readFile } from "node:fs/promises";
import path from "node:path";
import { renderLegalMarkdown } from "@/lib/legal/markdown";
import {
  type Hotspot,
  type HotspotPage,
  parseHotspotPageJson,
} from "@/lib/help/hotspot-schema";

/**
 * V8.8 SLC-881 — Server-side Hotspot-Loader (FEAT-881, DEC-244).
 *
 * Reads `<repo>/src/content/help/hotspots/<slug>.json`, validates via zod, and
 * pre-renders each hotspot's `body_md` via `renderLegalMarkdown`. The returned
 * `HotspotPageData` is safe to hand to a Client-Component (only primitive
 * fields + plain objects; no functions per feedback_rsc_no_function_props).
 *
 * Returns `null` for slugs without a JSON file (V8.3 plain-markdown fallback).
 * Throws on any other I/O or schema drift error.
 */

export type HotspotData = Omit<Hotspot, "body_md"> & {
  bodyHtml: string;
};

export type HotspotPageData = Omit<HotspotPage, "hotspots"> & {
  hotspots: HotspotData[];
};

function isEnoent(e: unknown): boolean {
  return (
    typeof e === "object" &&
    e !== null &&
    "code" in e &&
    (e as { code?: string }).code === "ENOENT"
  );
}

export async function loadHotspotPage(
  slug: string,
): Promise<HotspotPageData | null> {
  const filePath = path.join(
    process.cwd(),
    "src",
    "content",
    "help",
    "hotspots",
    `${slug}.json`,
  );

  let raw: string;
  try {
    raw = await readFile(filePath, "utf-8");
  } catch (e) {
    if (isEnoent(e)) return null;
    throw e;
  }

  const json = JSON.parse(raw);
  const page = parseHotspotPageJson(json, slug);

  const hotspots: HotspotData[] = await Promise.all(
    page.hotspots.map(async (h): Promise<HotspotData> => {
      const bodyHtml = await renderLegalMarkdown(h.body_md);
      return {
        id: h.id,
        x: h.x,
        y: h.y,
        w: h.w,
        h: h.h,
        title: h.title,
        video_url: h.video_url,
        bodyHtml,
      };
    }),
  );

  return {
    slug: page.slug,
    imageUrl: page.imageUrl,
    imageWidth: page.imageWidth,
    imageHeight: page.imageHeight,
    imageAlt: page.imageAlt,
    hotspots,
  };
}
