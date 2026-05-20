// V8 SLC-813 MT-1 — Pure-Function Prompt-Builder fuer KI-Verlustgrund-Vorschlag.
//
// DEC-220 V8 Bedrock-Prompt-Template fuer suggestLossReason: strict JSON,
// deutsch, Activity + E-Mail-Context, 1-3 Vorschlaege, Empty-History-Fallback.
//
// Pattern-Trail: 1:1 portiert aus V7.5 SLC-752 sculptor-prompts.ts
// (`SYSTEM_PROMPT` + `buildSculptPrompt`-Schema). Wir behalten die "strict JSON,
// kein Vorspann, kein Markdown"-Direktive bei.

export interface LossReasonDeal {
  title: string;
  value: number | null;
  current_stage: string;
}

export interface LossReasonActivity {
  type: string;
  title: string;
  created_at: string;
}

export interface LossReasonEmail {
  from_email: string;
  subject: string;
  snippet: string;
  received_at: string;
}

export const LOSS_REASON_SYSTEM_PROMPT = `Du bist Vertriebs-Analyst eines B2B-Beratungsunternehmens. Auf Basis der Activity-History eines Deals sollst du den wahrscheinlichsten Verlustgrund vorschlagen.

# Sprache
Antworte ausschliesslich auf Deutsch.

# Ausgabeformat
Du gibst IMMER NUR ein einzelnes JSON-Objekt zurueck. Kein Vorspann, kein Nachspann, kein Markdown, keine Code-Fences.

Erlaubtes Top-Level-Schema:
{
  "suggestions": [
    { "reason": string (max 200 Zeichen, 1 Satz), "source": string (max 200 Zeichen, Activity- oder E-Mail-Referenz) }
  ]
}

# Anzahl Vorschlaege
- 1 bis 3 Vorschlaege.
- Wenn die History keine klaren Hinweise enthaelt: genau 1 Vorschlag mit reason "Kein klarer Verlustgrund in der Activity-History erkennbar" und source "—".

# Inhalt
- "reason": kurzer Verlustgrund-Satz (z.B. "Preis zu hoch im Vergleich zum Wettbewerb").
- "source": welche Activity oder welche E-Mail den Vorschlag stuetzt (Datum + Titel oder Datum + Betreff).
- Erfinde KEINE Activities und KEINE E-Mails, die nicht im Input stehen.

# Stil
- Knapp, konkret, sachlich.
- Keine Spekulation ueber psychologische Motive.
- Keine Anrede, keine Empfehlungen.`;

const SNIPPET_MAX = 200;

/**
 * Baut den User-Prompt fuer den Bedrock-Call. Pure Function, keine Side-Effects.
 *
 * Tokens: ~500 Input bei voller History (10 Activities + 3 Emails) + ~300 Output.
 * Cost: ~$0.005-0.01 pro Call bei Claude Sonnet 4.6 (siehe sculptor-cost.ts).
 */
export function buildLossReasonPrompt(
  deal: LossReasonDeal,
  activities: readonly LossReasonActivity[],
  emails: readonly LossReasonEmail[]
): string {
  const valueLine =
    deal.value === null ? "Wert: nicht erfasst" : `Wert: ${deal.value} EUR`;

  const activitiesBlock =
    activities.length === 0
      ? "(keine Activities in den letzten 10 Eintraegen)"
      : activities
          .map((a) => `- ${a.created_at} | ${a.type} | ${a.title}`)
          .join("\n");

  const emailsBlock =
    emails.length === 0
      ? "(keine E-Mails in den letzten 3 Threads)"
      : emails
          .map((e) => {
            const snippet =
              e.snippet.length > SNIPPET_MAX
                ? `${e.snippet.slice(0, SNIPPET_MAX)}…`
                : e.snippet;
            return `- ${e.received_at} | von ${e.from_email} | Betreff: ${e.subject} | Snippet: ${snippet}`;
          })
          .join("\n");

  return `Deal: "${deal.title}" (${valueLine}, aktuelle Stage: ${deal.current_stage})

Activity-History (letzte 10, neueste zuerst):
${activitiesBlock}

E-Mail-Threads (letzte 3, neueste zuerst):
${emailsBlock}

Aufgabe:
Schlage 1-3 wahrscheinliche Verlustgruende vor. Jeder Vorschlag muss kurz (max 1 Satz) sein und eine Quelle angeben (welche Activity oder welche E-Mail). Wenn die History keine klaren Hinweise enthaelt, gib genau 1 Vorschlag "Kein klarer Verlustgrund in der Activity-History erkennbar" zurueck.

Antwort als JSON:`;
}
