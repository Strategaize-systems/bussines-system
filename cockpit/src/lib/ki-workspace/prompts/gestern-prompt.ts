import type { YesterdayReview } from "@/app/(app)/mein-tag/actions";

export const GESTERN_SYSTEM_PROMPT = `Du bist ein persoenlicher Vertriebs-Assistent fuer einen B2B-Vertriebler.
Erstelle eine Rueckschau auf gestern auf Deutsch in genau dieser Reihenfolge und mit genau diesen drei Markdown-Sektionen:

## Was wurde erledigt
## Was ist liegengeblieben
## KI-Kommentar

Regeln pro Sektion:
- Was wurde erledigt: 2-5 Bullet-Points der wichtigsten gestern abgeschlossenen Aufgaben/Meetings/E-Mails. Bei mehr als 5 Items: kurze Zusammenfassung + Top 3.
- Was ist liegengeblieben: Aufgaben die gestern faellig waren aber nicht erledigt wurden. Pro Item kurzer Hinweis ob es heute Prioritaet sein sollte.
- KI-Kommentar: 1-3 Saetze. Konkrete Empfehlung ob/welche der gestrigen Liegenbleiber heute zuerst angegangen werden sollten.

Schreibe direkt in Du-Form, sehr knapp, keine Einleitung, keine Schlussformel.
Wenn keine Daten vorhanden: ehrliche Hinweise wie "Gestern wurde nichts abgeschlossen" oder "Nichts liegengeblieben — gute Arbeit gestern".`;

export interface GesternInput {
  review: YesterdayReview;
}

export function buildGesternPrompt(input: GesternInput): string {
  const yesterday = (() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toLocaleDateString("de-DE", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  })();

  const lines: string[] = [];
  lines.push(`=== GESTERN: ${yesterday} ===`);

  lines.push("\n=== ERLEDIGT ===");
  if (input.review.completed.length === 0) {
    lines.push("Keine erledigten Eintraege gestern.");
  } else {
    for (const it of input.review.completed) {
      const ctx = [it.contactName, it.companyName].filter(Boolean).join(" / ");
      const ctxStr = ctx ? ` — ${ctx}` : "";
      const typeLabel =
        it.type === "task" ? "Aufgabe" : it.type === "meeting" ? "Meeting" : "E-Mail";
      lines.push(`- [${typeLabel}] ${it.title}${ctxStr}`);
    }
  }

  lines.push("\n=== LIEGENGEBLIEBEN ===");
  if (input.review.missed.length === 0) {
    lines.push("Nichts liegengeblieben.");
  } else {
    for (const it of input.review.missed) {
      const ctx = [it.contactName, it.companyName].filter(Boolean).join(" / ");
      const ctxStr = ctx ? ` — ${ctx}` : "";
      lines.push(`- ${it.title}${ctxStr}`);
    }
  }

  lines.push(
    "\nErstelle die Rueckschau strikt mit den drei Sektionen in der oben definierten Reihenfolge. Verwende keine weiteren Sektionen. Antwortsprache: Deutsch.",
  );
  return lines.join("\n");
}
