// SLC-665 MT-3 (DEC-170) — ItemSheet Type-Discriminator
//
// Generische Detail-Sheet-Datenstruktur fuer Tasks (Mein Tag, Aufgaben) und
// Activities (Deal-Detail Timeline). Type-Discriminator ueber `kind` erlaubt
// einer Sheet-Component, beide Item-Arten anzuzeigen.

import type { Task } from "@/app/(app)/aufgaben/actions";

export interface ActivityRow {
  id: string;
  type: string;
  title: string | null;
  description: string | null;
  summary: string | null;
  created_at: string;
  contact_id: string | null;
  company_id: string | null;
  deal_id: string | null;
  source_type: string | null;
}

export interface ActivityBedrockSummary {
  risiken?: string[];
  einwaende?: string[];
  naechsteSchritte?: string[];
  teilnehmer?: string[];
  zusammenfassung?: string;
}

export type ItemSheetData =
  | { kind: "task"; task: Task }
  | {
      kind: "activity";
      activity: ActivityRow;
      bedrockSummary?: ActivityBedrockSummary;
      autoReplyHint?: boolean;
    };

export type ItemSheetKind = ItemSheetData["kind"];
