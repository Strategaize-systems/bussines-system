import type { DealContext } from "@/lib/ki-workspace/deal-context";
import { formatDealContext } from "./deal-context-format";

export const DEAL_SIGNALE_SYSTEM_PROMPT = `Du bist ein erfahrener B2B-Vertriebs-Analyst. Extrahiere Vertriebssignale aus der Aktivitaetshistorie eines Deals.

Antworte AUSSCHLIESSLICH in Markdown mit genau diesen drei Sektionen in genau dieser Reihenfolge:

## Positive Signale
## Negative Signale
## Empfehlung

Erlaubte Signal-Typen (verwende sie als Bullet-Praefix in eckigen Klammern):
- [Hohes Interesse]
- [Budget vorhanden]
- [Champion erkennbar]
- [Akuter Druck / Dringlichkeit]
- [Hoher Multiplikatorwert]
- [Einwand]
- [Interne Blockade]
- [Timing ungeeignet]
- [Falscher Fit]

Regeln:
- Positive Signale: 0-5 Bullet-Points. Format: "[Signal-Typ] Kurzbegruendung — Quelle (Datum)". Zitiere wenn moeglich kurz aus dem Original.
- Negative Signale: 0-5 Bullet-Points. Gleiches Format.
- Empfehlung: 1-2 Saetze. Was bedeutet die Signal-Lage konkret? Was solltest Du als Naechstes tun?

Wenn keine Signale erkennbar: schreibe "Keine eindeutigen Signale in den vorliegenden Daten." statt zu erfinden.
Sehr knapp, keine Einleitung, keine Schlussformel. Du-Form.`;

export interface DealSignalePromptInput {
  context: DealContext;
}

export function buildDealSignalePrompt(input: DealSignalePromptInput): string {
  const lines: string[] = [];
  lines.push(formatDealContext(input.context, { maxActivities: 20, maxEmails: 10 }));
  lines.push(
    "\nExtrahiere Signale strikt mit den drei Sektionen (Positive Signale, Negative Signale, Empfehlung). Verwende ausschliesslich die erlaubten Signal-Typen. Keine weiteren Sektionen. Antwortsprache: Deutsch.",
  );
  return lines.join("\n");
}
