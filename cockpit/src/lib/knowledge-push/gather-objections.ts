// V8.7-B SLC-355 MT-2 — Objektion-Notiz-Sammlung (pure/read, DEC-289/DEC-290).
//
// Sammelt Activity-Freitext-Notizen (activities.description) der letzten
// 7 Tage gruppiert nach Branche (companies.industry via activities.company_id).
// k-min-gefiltert. Input fuer den Bedrock-Einwand-Klassifikations-Pass (MT-3).
// Notizen pro Gruppe werden gedeckelt (R-355-3 Input-Groesse begrenzen).

import {
  DEFAULT_MAX_NOTES_PER_GROUP,
  WINDOW_DAYS,
  getMinBucket,
} from "./config";
import type { ObjectionGroup } from "./types";

type ActivitySupabaseLike = {
  from(table: string): {
    select(columns: string): {
      not(
        column: string,
        operator: string,
        value: unknown
      ): {
        gte(
          column: string,
          value: string
        ): Promise<{ data: unknown[] | null; error: { message: string } | null }>;
      };
    };
  };
};

export interface GatherObjectionsOptions {
  now: Date;
  minBucket?: number;
  maxNotesPerGroup?: number;
}

interface ActivityRow {
  description: string | null;
  companies: { industry: string | null } | null;
}

const SELECT_COLUMNS = "description, companies(industry)";

export async function gatherObjectionNotes(
  admin: ActivitySupabaseLike,
  opts: GatherObjectionsOptions
): Promise<ObjectionGroup[]> {
  const minBucket = opts.minBucket ?? getMinBucket();
  const maxNotes = opts.maxNotesPerGroup ?? DEFAULT_MAX_NOTES_PER_GROUP;
  const cutoff = new Date(
    opts.now.getTime() - WINDOW_DAYS * 24 * 60 * 60 * 1000
  ).toISOString();

  const { data, error } = await admin
    .from("activities")
    .select(SELECT_COLUMNS)
    .not("description", "is", null)
    .gte("created_at", cutoff);

  if (error) {
    throw new Error(`gatherObjectionNotes query failed: ${error.message}`);
  }

  const rows = (data ?? []) as ActivityRow[];
  const grouped = new Map<string, string[]>();

  for (const row of rows) {
    const note = row.description?.trim();
    if (!note) continue; // leere/whitespace-Notiz -> ueberspringen

    const branche = row.companies?.industry?.trim() || "unknown";
    const existing = grouped.get(branche);
    if (existing) {
      existing.push(note);
    } else {
      grouped.set(branche, [note]);
    }
  }

  const groups: ObjectionGroup[] = [];
  for (const [branche, notes] of grouped.entries()) {
    if (notes.length < minBucket) continue;
    groups.push({
      branche,
      noteCount: notes.length,
      notes: notes.slice(0, maxNotes),
    });
  }
  return groups;
}
