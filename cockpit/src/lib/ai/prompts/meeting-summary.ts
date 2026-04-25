// =============================================================
// Meeting Summary Prompt — Generates structured meeting summary
// =============================================================

import { z } from "zod/v4";

// ── Zod Schema ─────────────────────────────────────────────────

export const ActionItemSchema = z.object({
  owner: z.string().nullable().describe("Name des Verantwortlichen, falls erkennbar"),
  task: z.string().describe("Konkrete Aufgabe"),
});

export const MeetingSummarySchema = z.object({
  outcome: z.string().max(500).describe("Kernergebnis des Meetings in 1-3 Saetzen"),
  decisions: z.array(z.string()).describe("Getroffene Entscheidungen"),
  action_items: z.array(ActionItemSchema).describe("Vereinbarte naechste Schritte"),
  next_step: z.string().describe("Wichtigster naechster Schritt"),
  key_topics: z
    .array(z.string())
    .optional()
    .describe("Kernthemen / Stichworte des Meetings fuer Suche und Tagging"),
});

export type MeetingSummary = z.infer<typeof MeetingSummarySchema>;

// ── System Prompt ──────────────────────────────────────────────

export const MEETING_SUMMARY_SYSTEM_PROMPT = `Du bist ein erfahrener Business-Assistent, der Meeting-Transkripte analysiert und strukturierte Zusammenfassungen erstellt.

WICHTIG: Antworte AUSSCHLIESSLICH mit einem validen JSON-Objekt. Kein Text davor oder danach.

Das JSON muss exakt dieses Schema haben:
{
  "outcome": "Kernergebnis des Meetings in 1-3 Saetzen (max 500 Zeichen)",
  "decisions": ["Entscheidung 1", "Entscheidung 2"],
  "action_items": [{"owner": "Name oder null", "task": "Aufgabe"}],
  "next_step": "Wichtigster naechster Schritt",
  "key_topics": ["Thema 1", "Thema 2"]
}

Regeln:
- outcome: Praegnante Zusammenfassung, was im Meeting erreicht wurde. Max 500 Zeichen.
- decisions: Alle klar getroffenen Entscheidungen. Leeres Array wenn keine erkennbar.
- action_items: Konkrete To-Dos mit Verantwortlichem (owner=null wenn nicht klar). Mindestens 1 wenn erkennbar.
- next_step: Der wichtigste einzelne naechste Schritt nach dem Meeting.
- key_topics: 3-6 kurze Stichworte, die das Meeting inhaltlich kennzeichnen. Keine Saetze. Dienen Suche und Tagging.

Schreibe auf Deutsch. Sei konkret, nicht generisch. Beziehe dich auf den Deal-Kontext wenn vorhanden.`;

// ── Context Interfaces ─────────────────────────────────────────

export interface MeetingSummaryContext {
  transcript: string;
  meetingTitle?: string;
  dealName?: string;
  recentActivities?: Array<{
    type: string;
    title: string;
    date: string;
  }>;
  contacts?: Array<{
    name: string;
    role?: string;
    company?: string;
  }>;
}

// ── Prompt Builder ─────────────────────────────────────────────

export function buildMeetingSummaryPrompt(context: MeetingSummaryContext): string {
  const parts: string[] = [];

  parts.push("Analysiere das folgende Meeting-Transkript und erstelle eine strukturierte Zusammenfassung.");

  if (context.meetingTitle) {
    parts.push(`\nMeeting-Titel: ${context.meetingTitle}`);
  }

  if (context.dealName) {
    parts.push(`Deal: ${context.dealName}`);
  }

  if (context.contacts && context.contacts.length > 0) {
    parts.push("\nTeilnehmer:");
    for (const c of context.contacts) {
      const role = c.role ? ` (${c.role})` : "";
      const company = c.company ? `, ${c.company}` : "";
      parts.push(`- ${c.name}${role}${company}`);
    }
  }

  if (context.recentActivities && context.recentActivities.length > 0) {
    parts.push("\nLetzte Aktivitaeten zum Deal (Kontext):");
    for (const a of context.recentActivities.slice(0, 10)) {
      parts.push(`- ${a.date}: [${a.type}] ${a.title}`);
    }
  }

  parts.push(`\n--- TRANSKRIPT ---\n${context.transcript}\n--- ENDE TRANSKRIPT ---`);

  return parts.join("\n");
}

// ── Parse + Validate ───────────────────────────────────────────

/**
 * Parses raw LLM output into a validated MeetingSummary.
 * Returns null if parsing or validation fails.
 */
export function parseMeetingSummary(raw: string): MeetingSummary | null {
  try {
    // Strip potential markdown code fences
    let cleaned = raw.trim();
    if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
    }

    const parsed = JSON.parse(cleaned);
    const result = MeetingSummarySchema.safeParse(parsed);

    if (result.success) {
      return result.data;
    }

    console.error("[MeetingSummary] Zod validation failed:", result.error.issues);
    return null;
  } catch (err) {
    console.error("[MeetingSummary] JSON parse failed:", err);
    return null;
  }
}
