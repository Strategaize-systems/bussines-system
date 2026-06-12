// V8.7-B SLC-355 MT-4 — Item-Builder (deterministisch, DEC-289).
//
// Bucket/Gruppe + destillierter Text -> IsKnowledgeIngestItem mit
// deterministischem, week-stamped source_reference. Gleiche Inputs in
// derselben ISO-Woche -> identische source_reference -> IS dedupt (idempotent).

import type { IsKnowledgeIngestItem } from "@/lib/is-knowledge/types";
import type { DistillResult } from "./distill";
import type { ObjectionGroup, WinLossBucket } from "./types";

/**
 * ISO-8601-Woche als "YYYY-Www". Die ISO-Woche gehoert zum Jahr ihres
 * Donnerstags (deshalb kann der 2025-12-31 zu 2026-W01 gehoeren).
 */
export function isoWeekOf(date: Date): string {
  const d = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );
  // Auf den Donnerstag der aktuellen Woche schieben (Mon=0 .. Sun=6).
  const dayNr = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - dayNr + 3);
  const isoYear = d.getUTCFullYear();
  // Montag der Woche 1 (Woche, die den 4. Januar enthaelt).
  const jan4 = new Date(Date.UTC(isoYear, 0, 4));
  const jan4DayNr = (jan4.getUTCDay() + 6) % 7;
  const week1Monday = new Date(jan4);
  week1Monday.setUTCDate(jan4.getUTCDate() - jan4DayNr);
  const week =
    1 +
    Math.round((d.getTime() - week1Monday.getTime()) / (7 * 24 * 60 * 60 * 1000));
  return `${isoYear}-W${String(week).padStart(2, "0")}`;
}

const UMLAUT_MAP: Record<string, string> = {
  ä: "ae",
  ö: "oe",
  ü: "ue",
  ß: "ss",
};

/**
 * Slug-Normalisierung der Branche fuer source_reference + Tags.
 * Umlaute -> ae/oe/ue/ss, alles Nicht-Alphanumerische -> "-", lowercase.
 */
export function slugifyBranche(branche: string): string {
  const lowered = branche.toLowerCase();
  const deUmlaut = lowered.replace(/[äöüß]/g, (c) => UMLAUT_MAP[c] ?? c);
  return (
    deUmlaut
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "unknown"
  );
}

const DOMAIN = "sales" as const;
const SOURCE_SYSTEM = "business_system" as const;

export function buildWinLossItem(
  bucket: WinLossBucket,
  distilled: DistillResult,
  isoWeek: string
): IsKnowledgeIngestItem {
  const slug = slugifyBranche(bucket.branche);
  const outcomeLabel = bucket.targetStatus === "won" ? "Gewonnen" : "Verloren";
  return {
    title: `Win/Loss Lessons — ${bucket.branche} / ${bucket.sizeBucket} / ${outcomeLabel} (${isoWeek})`,
    body_markdown: distilled.markdown,
    domain: DOMAIN,
    source_system: SOURCE_SYSTEM,
    source_reference: `bs-winloss-${isoWeek}-branche:${slug}-size:${bucket.sizeBucket}-${bucket.targetStatus}`,
    tags: ["winloss", `branche:${slug}`],
    metadata: {
      deal_count: bucket.dealCount,
      size_bucket: bucket.sizeBucket,
      target_status: bucket.targetStatus,
      iso_week: isoWeek,
    },
  };
}

export function buildObjectionItem(
  group: ObjectionGroup,
  classified: DistillResult,
  isoWeek: string
): IsKnowledgeIngestItem {
  const slug = slugifyBranche(group.branche);
  return {
    title: `Einwand-Behandlung — ${group.branche} (${isoWeek})`,
    body_markdown: classified.markdown,
    domain: DOMAIN,
    source_system: SOURCE_SYSTEM,
    source_reference: `bs-objection-${isoWeek}-branche:${slug}`,
    tags: ["objection", `branche:${slug}`],
    metadata: {
      note_count: group.noteCount,
      iso_week: isoWeek,
    },
  };
}
