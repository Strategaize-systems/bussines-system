// =============================================================
// Meeting Agenda Prompt — Generates structured meeting preparation
// =============================================================

import { z } from "zod/v4";

// ── Zod Schema ─────────────────────────────────────────────────

export const MeetingAgendaSchema = z.object({
  last_communication: z
    .string()
    .max(500)
    .describe("Zusammenfassung der letzten Kommunikation/Interaktion mit dem Kontakt"),
  open_points: z
    .array(z.string())
    .describe("Offene Punkte, die im Meeting angesprochen werden sollten"),
  decision_makers: z
    .array(
      z.object({
        name: z.string(),
        role: z.string().nullable(),
      })
    )
    .describe("Relevante Entscheider und ihre Rollen"),
  suggested_goal: z
    .string()
    .max(300)
    .describe("Empfohlenes Meeting-Ziel basierend auf dem Kontext"),
});

export type MeetingAgenda = z.infer<typeof MeetingAgendaSchema>;

// ── System Prompt ──────────────────────────────────────────────

export const MEETING_AGENDA_SYSTEM_PROMPT = `Du bist ein erfahrener Business-Assistent, der Meeting-Vorbereitungen erstellt.

WICHTIG: Antworte AUSSCHLIESSLICH mit einem validen JSON-Objekt. Kein Text davor oder danach.

Das JSON muss exakt dieses Schema haben:
{
  "last_communication": "Zusammenfassung der letzten Kommunikation (max 500 Zeichen)",
  "open_points": ["Offener Punkt 1", "Offener Punkt 2"],
  "decision_makers": [{"name": "Name", "role": "Rolle oder null"}],
  "suggested_goal": "Empfohlenes Meeting-Ziel (max 300 Zeichen)"
}

Regeln:
- last_communication: Fasse die letzte Interaktion praegnant zusammen. Falls keine Aktivitaeten vorliegen, schreibe "Kein vorheriger Kontakt dokumentiert."
- open_points: Leite offene Punkte aus Aktivitaeten, offenen Tasks und Deal-Kontext ab. Mindestens 1, max 7. Sei konkret, nicht generisch.
- decision_makers: Liste alle bekannten Kontakte mit Rollen auf. Wenn keine Rolle bekannt, setze role=null.
- suggested_goal: Ein konkretes, erreichbares Meeting-Ziel basierend auf Deal-Stage und offenen Punkten.

Schreibe auf Deutsch. Sei konkret und handlungsorientiert, nicht generisch.`;

// ── Context Interface ──────────────────────────────────────────

export interface MeetingAgendaContext {
  meetingTitle: string;
  dealName?: string;
  dealStage?: string;
  dealValue?: number;
  recentActivities?: Array<{
    type: string;
    title: string;
    date: string;
  }>;
  openTasks?: Array<{
    title: string;
    dueDate?: string;
  }>;
  contacts?: Array<{
    name: string;
    role?: string;
    company?: string;
  }>;
}

// ── Prompt Builder ─────────────────────────────────────────────

export function buildMeetingAgendaPrompt(context: MeetingAgendaContext): string {
  const parts: string[] = [];

  parts.push(
    "Erstelle eine strukturierte Meeting-Vorbereitung basierend auf dem folgenden Kontext."
  );

  parts.push(`\nMeeting-Titel: ${context.meetingTitle}`);

  if (context.dealName) {
    parts.push(`Deal: ${context.dealName}`);
  }
  if (context.dealStage) {
    parts.push(`Deal-Stage: ${context.dealStage}`);
  }
  if (context.dealValue) {
    parts.push(
      `Deal-Wert: ${context.dealValue.toLocaleString("de-DE")} EUR`
    );
  }

  if (context.contacts && context.contacts.length > 0) {
    parts.push("\nBeteiligte Kontakte:");
    for (const c of context.contacts) {
      const role = c.role ? ` (${c.role})` : "";
      const company = c.company ? `, ${c.company}` : "";
      parts.push(`- ${c.name}${role}${company}`);
    }
  }

  if (context.recentActivities && context.recentActivities.length > 0) {
    parts.push("\nLetzte Aktivitaeten (14 Tage):");
    for (const a of context.recentActivities.slice(0, 15)) {
      parts.push(`- ${a.date}: [${a.type}] ${a.title}`);
    }
  } else {
    parts.push("\nKeine dokumentierten Aktivitaeten in den letzten 14 Tagen.");
  }

  if (context.openTasks && context.openTasks.length > 0) {
    parts.push("\nOffene Aufgaben:");
    for (const t of context.openTasks.slice(0, 10)) {
      const due = t.dueDate ? ` (faellig: ${t.dueDate})` : "";
      parts.push(`- ${t.title}${due}`);
    }
  }

  return parts.join("\n");
}

// ── Parse + Validate ───────────────────────────────────────────

/**
 * Parses raw LLM output into a validated MeetingAgenda.
 * Returns null if parsing or validation fails.
 */
export function parseMeetingAgenda(raw: string): MeetingAgenda | null {
  try {
    let cleaned = raw.trim();
    if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
    }

    const parsed = JSON.parse(cleaned);
    const result = MeetingAgendaSchema.safeParse(parsed);

    if (result.success) {
      return result.data;
    }

    console.error("[MeetingAgenda] Zod validation failed:", result.error.issues);
    return null;
  } catch (err) {
    console.error("[MeetingAgenda] JSON parse failed:", err);
    return null;
  }
}
