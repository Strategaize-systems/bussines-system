// V8 SLC-813 MT-3 — Stage-Required-Fields-Konstante (Single-Source).
//
// Vorher inline in app/(app)/pipeline/actions.ts (server-only). Extrahiert
// damit Client-Komponenten (kanban-board.tsx Drop-Event-Wiring) ohne Drift
// dasselbe Pflichtfeld-Mapping verwenden koennen.
//
// Slice-Open-Point (A) im SLC-813: Konstante hier, beide Seiten importieren
// statt Spiegel-Konstante in der UI.

export type StageRequirementField = "value" | "contact_id" | "won_lost_reason";

export interface StageRequirementSpec {
  fields: StageRequirementField[];
  labels: Record<StageRequirementField, string>;
}

export const STAGE_REQUIRED_FIELDS: Record<string, StageRequirementSpec> = {
  "Angebot vorbereitet": {
    fields: ["value"],
    labels: { value: "Deal-Wert", contact_id: "Kontakt", won_lost_reason: "Verlustgrund" },
  },
  "Angebot offen": {
    fields: ["value"],
    labels: { value: "Deal-Wert", contact_id: "Kontakt", won_lost_reason: "Verlustgrund" },
  },
  "Verhandlung / Einwände": {
    fields: ["value", "contact_id"],
    labels: { value: "Deal-Wert", contact_id: "Kontakt", won_lost_reason: "Verlustgrund" },
  },
  "Gewonnen": {
    fields: ["value"],
    labels: { value: "Deal-Wert", contact_id: "Kontakt", won_lost_reason: "Verlustgrund" },
  },
  "Verloren": {
    fields: ["won_lost_reason"],
    labels: { value: "Deal-Wert", contact_id: "Kontakt", won_lost_reason: "Verlustgrund" },
  },
};

export const WON_STAGE_NAMES: readonly string[] = ["Gewonnen"];
export const LOST_STAGE_NAMES: readonly string[] = [
  "Verloren",
  "Inaktiv / disqualifiziert",
];

/**
 * Pure helper: liefert die fehlenden Pflichtfelder fuer eine Ziel-Stage anhand
 * der aktuellen Deal-Werte. Verwendet in moveDealToStage AND im Kanban-
 * Drop-Handler (Pre-Move-Check).
 */
export function getMissingStageRequirements(
  stageName: string,
  currentValues: Partial<Record<StageRequirementField, string | number | null>>
): { spec: StageRequirementSpec | null; missing: StageRequirementField[] } {
  const spec = STAGE_REQUIRED_FIELDS[stageName];
  if (!spec) return { spec: null, missing: [] };
  const missing: StageRequirementField[] = [];
  for (const field of spec.fields) {
    const val = currentValues[field];
    if (val === null || val === undefined || val === "") {
      missing.push(field);
    }
  }
  return { spec, missing };
}
