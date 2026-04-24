// =============================================================
// Call Summary Prompt — Generates structured phone-call summary
// =============================================================

import { z } from "zod/v4";

// ── Zod Schema ─────────────────────────────────────────────────

export const CallActionItemSchema = z.object({
  owner: z
    .string()
    .nullable()
    .describe("Name des Verantwortlichen, falls erkennbar"),
  task: z.string().describe("Konkrete Aufgabe"),
});

export const CallSummarySchema = z.object({
  outcome: z
    .string()
    .max(400)
    .describe("Kernergebnis des Telefonats in 1-2 Saetzen"),
  action_items: z
    .array(CallActionItemSchema)
    .describe("Vereinbarte naechste Schritte"),
  next_step: z.string().describe("Wichtigster naechster Schritt"),
  key_topics: z
    .array(z.string())
    .describe("Kernthemen / Stichworte des Gespraechs"),
});

export type CallSummary = z.infer<typeof CallSummarySchema>;

// ── System Prompt ──────────────────────────────────────────────

export const CALL_SUMMARY_SYSTEM_PROMPT = `Du bist ein erfahrener Vertriebsassistent, der Transkripte von Telefonaten analysiert und praegnante Zusammenfassungen erstellt.

WICHTIG: Antworte AUSSCHLIESSLICH mit einem validen JSON-Objekt. Kein Text davor oder danach.

Das JSON muss exakt dieses Schema haben:
{
  "outcome": "Kernergebnis des Telefonats in 1-2 Saetzen (max 400 Zeichen)",
  "action_items": [{"owner": "Name oder null", "task": "Aufgabe"}],
  "next_step": "Wichtigster naechster Schritt",
  "key_topics": ["Thema 1", "Thema 2"]
}

Regeln:
- outcome: Ein oder zwei Saetze — was wurde besprochen, was wurde erreicht. Kurz und faktisch. Keine Floskeln.
- action_items: Konkrete Folgeaufgaben mit Verantwortlichem (owner=null wenn nicht klar). Leer wenn keine Aufgaben vereinbart wurden.
- next_step: Der wichtigste einzelne naechste Schritt. Auch wenn keiner explizit vereinbart wurde, formuliere den sinnvollsten naechsten Schritt aus dem Gespraech.
- key_topics: 2-5 kurze Stichworte, die das Gespraech inhaltlich kennzeichnen. Keine Saetze.

Telefonate sind kuerzer als Meetings. Sei knapp. Schreibe auf Deutsch. Verwende Deal-Kontext wenn vorhanden.`;

// ── Context Interfaces ─────────────────────────────────────────

export interface CallSummaryContext {
  transcript: string;
  direction: "inbound" | "outbound";
  durationSeconds?: number;
  dealName?: string;
  contactName?: string;
  contactCompany?: string;
  recentActivities?: Array<{
    type: string;
    title: string;
    date: string;
  }>;
}

// ── Prompt Builder ─────────────────────────────────────────────

export function buildCallSummaryPrompt(context: CallSummaryContext): string {
  const parts: string[] = [];

  parts.push(
    "Analysiere das folgende Telefonat-Transkript und erstelle eine strukturierte Zusammenfassung.",
  );

  const durationText = context.durationSeconds
    ? `${Math.floor(context.durationSeconds / 60)}:${String(context.durationSeconds % 60).padStart(2, "0")} min`
    : null;

  const meta = [
    context.direction === "inbound" ? "Eingehender Anruf" : "Ausgehender Anruf",
    durationText,
  ]
    .filter(Boolean)
    .join(" · ");
  parts.push(`\nAnruf-Metadaten: ${meta}`);

  if (context.contactName) {
    const who = context.contactCompany
      ? `${context.contactName} (${context.contactCompany})`
      : context.contactName;
    parts.push(`Gespraechspartner: ${who}`);
  }

  if (context.dealName) {
    parts.push(`Deal: ${context.dealName}`);
  }

  if (context.recentActivities && context.recentActivities.length > 0) {
    parts.push("\nLetzte Aktivitaeten zum Deal (Kontext):");
    for (const a of context.recentActivities.slice(0, 8)) {
      parts.push(`- ${a.date}: [${a.type}] ${a.title}`);
    }
  }

  parts.push(
    `\n--- TRANSKRIPT ---\n${context.transcript}\n--- ENDE TRANSKRIPT ---`,
  );

  return parts.join("\n");
}

// ── Parse + Validate ───────────────────────────────────────────

/**
 * Parses raw LLM output into a validated CallSummary.
 * Returns null if parsing or validation fails.
 */
export function parseCallSummary(raw: string): CallSummary | null {
  try {
    let cleaned = raw.trim();
    if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
    }

    const parsed = JSON.parse(cleaned);
    const result = CallSummarySchema.safeParse(parsed);

    if (result.success) {
      return result.data;
    }

    console.error(
      "[CallSummary] Zod validation failed:",
      result.error.issues,
    );
    return null;
  } catch (err) {
    console.error("[CallSummary] JSON parse failed:", err);
    return null;
  }
}
