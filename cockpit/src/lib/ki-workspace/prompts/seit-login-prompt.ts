import type { UnseenEvents } from "@/app/(app)/mein-tag/actions";

export const SEIT_LOGIN_SYSTEM_PROMPT = `Du bist ein persoenlicher Vertriebs-Assistent fuer einen B2B-Vertriebler.
Erstelle eine Zusammenfassung der Aenderungen seit dem letzten Login auf Deutsch in genau dieser Reihenfolge und mit genau diesen drei Markdown-Sektionen:

## Was ist passiert
## Was braucht Aufmerksamkeit
## KI-Kommentar

Regeln pro Sektion:
- Was ist passiert: 2-5 Bullet-Points der wichtigsten Ereignisse seit dem letzten Login (neue Deals, Stage-Wechsel, sonstige relevante Aenderungen). Bei sehr vielen Ereignissen: zusammenfassen + Top-Items hervorheben.
- Was braucht Aufmerksamkeit: Konkrete Items aus den Ereignissen, die jetzt eine Reaktion brauchen (z.B. Stage-Wechsel im eigenen Pipeline-Bereich, neue Deals ohne Owner, Eskalationen).
- KI-Kommentar: 1-3 Saetze. Konkrete Empfehlung was jetzt als naechstes geprueft oder bearbeitet werden sollte.

Schreibe direkt in Du-Form, sehr knapp, keine Einleitung, keine Schlussformel.
Wenn keine Aenderungen: ehrliche Hinweise wie "Seit deinem letzten Login keine relevanten Aenderungen".`;

export interface SeitLoginInput {
  events: UnseenEvents;
}

export function buildSeitLoginPrompt(input: SeitLoginInput): string {
  const lines: string[] = [];
  lines.push(`=== AENDERUNGEN ${input.events.cutoffLabel} ===`);

  lines.push("\n=== NEUE DEALS ===");
  if (input.events.newDeals.length === 0) {
    lines.push("Keine neuen Deals.");
  } else {
    for (const e of input.events.newDeals) {
      lines.push(`- ${e.context ?? "Neuer Deal"} (${e.createdAt})`);
    }
  }

  lines.push("\n=== STAGE-WECHSEL ===");
  if (input.events.stageChanges.length === 0) {
    lines.push("Keine Stage-Wechsel.");
  } else {
    for (const e of input.events.stageChanges) {
      lines.push(`- ${e.context ?? "Stage verschoben"} (${e.createdAt})`);
    }
  }

  lines.push("\n=== SONSTIGE RELEVANTE AENDERUNGEN ===");
  const others = input.events.otherChanges.slice(0, 10);
  if (others.length === 0) {
    lines.push("Keine sonstigen Aenderungen.");
  } else {
    for (const e of others) {
      const desc = e.context ?? `${e.entityType} ${e.action}`;
      lines.push(`- [${e.entityType}/${e.action}] ${desc}`);
    }
    const remaining = input.events.otherChanges.length - others.length;
    if (remaining > 0) {
      lines.push(`(weitere ${remaining} aelter — gekuerzt)`);
    }
  }

  lines.push(
    "\nErstelle die Zusammenfassung strikt mit den drei Sektionen in der oben definierten Reihenfolge. Verwende keine weiteren Sektionen. Antwortsprache: Deutsch.",
  );
  return lines.join("\n");
}
