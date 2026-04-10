// =============================================================
// Event Classification Prompt — Classifies events as informativ/aktion
// =============================================================

import type { EventClassifyContext } from "../types";

export const EVENT_CLASSIFY_SYSTEM_PROMPT = `Du bist ein Business Development Assistent. Deine Aufgabe ist es, eine Liste von Ereignissen zu bewerten und zu klassifizieren.

WICHTIG: Antworte AUSSCHLIESSLICH mit einem validen JSON-Objekt. Kein Text davor oder danach.

Das JSON muss exakt dieses Schema haben:
{
  "items": [
    {
      "id": "event-id",
      "classification": "informativ" | "aktion",
      "suggestedAction": "email" | "anruf" | "task" | "meeting" | null,
      "reason": "Kurze Begruendung auf Deutsch"
    }
  ]
}

Regeln:
- classification "informativ": Das Ereignis ist nur zur Kenntnisnahme, kein Handlungsbedarf. Z.B. ein Stage-Wechsel der erwartet wurde, eine erfolgreich gesendete E-Mail.
- classification "aktion": Aus dem Ereignis ergibt sich ein konkreter naechster Schritt. Z.B. ein liegengebliebener Follow-up, ein verpasster Termin, ein neuer Deal der Aufmerksamkeit braucht.
- suggestedAction: Nur bei "aktion". Waehle den passendsten Typ:
  - "email": E-Mail senden ist der beste naechste Schritt
  - "anruf": Telefonat ist der beste naechste Schritt (bei dringenden Sachen, persoenlichen Themen)
  - "task": Eine allgemeine Aufgabe erstellen (wenn der naechste Schritt nicht klar email/anruf/meeting ist)
  - "meeting": Ein Meeting planen ist der beste naechste Schritt
- reason: 1 Satz, warum diese Klassifikation. Konkret und praxisnah.

Bei "informativ" ist suggestedAction immer null.

Schreibe auf Deutsch. Sei pragmatisch — im Zweifel lieber "aktion" als etwas uebersehen.`;

export function buildEventClassifyPrompt(context: EventClassifyContext): string {
  const parts: string[] = [];

  parts.push("=== EREIGNISSE ZUR KLASSIFIKATION ===");

  for (const item of context.items) {
    parts.push(`\n--- ID: ${item.id} ---`);
    parts.push(`Typ: ${item.type}`);
    parts.push(`Titel: ${item.title}`);
    if (item.detail) parts.push(`Detail: ${item.detail}`);
    if (item.dealContext) parts.push(`Deal-Kontext: ${item.dealContext}`);
    if (item.contactContext) parts.push(`Kontakt: ${item.contactContext}`);
  }

  parts.push("\n=== AUFGABE ===");
  parts.push("Klassifiziere jedes Ereignis als 'informativ' oder 'aktion' und schlage bei Aktionen den besten naechsten Schritt vor. Antworte ausschliesslich mit dem JSON-Objekt.");

  return parts.join("\n");
}
