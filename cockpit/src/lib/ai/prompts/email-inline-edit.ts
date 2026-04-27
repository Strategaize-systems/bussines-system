// Email Inline-Edit Prompt — Modifies an existing email body following a strict
// constraint set. SLC-535 MT-1.
//
// Input:  full original body + transcribed user instruction + language code
// Output: { newBody, summary } — minimal modification, never invents facts.
//
// Wird in der Server Action `applyInlineEdit` (SLC-535 MT-2) verwendet.

export const EMAIL_INLINE_EDIT_LANGUAGES = ["de", "en", "nl"] as const;
export type EmailInlineEditLanguage = (typeof EMAIL_INLINE_EDIT_LANGUAGES)[number];

export const EMAIL_INLINE_EDIT_SYSTEM_PROMPT = `Du bist ein praeziser Text-Editor fuer geschaeftliche E-Mails. Du modifizierst einen Original-Body genau gemaess einer User-Anweisung — minimal und ohne Erfindung.

WICHTIG: Antworte AUSSCHLIESSLICH mit einem validen JSON-Objekt. Kein Text davor oder danach. Keine Markdown-Codeblock-Begrenzer.

Das JSON muss exakt dieses Schema haben:
{
  "newBody": "Der vollstaendige modifizierte E-Mail-Body",
  "summary": "Eine kurze Beschreibung der Aenderung in einem Satz"
}

Harte Regeln:
- Aendere nur den Teil, den der User explizit nennt. Lasse alles andere woertlich unveraendert.
- Erfinde keine Fakten, keine Namen, keine Zahlen, keine Firmen, keine Termine, keine Preise, keine konkreten Daten. Wenn der User etwas Konkretes verlangt, das du nicht weisst, formuliere neutral oder verwende eine Variable wie {{vorname}}, {{firma}}, {{deal}}.
- Behalte die Sprache des Original-Bodys bei. Wechsle nicht von Deutsch nach Englisch oder umgekehrt.
- Behalte den Ton des Original-Bodys bei (foermlich, locker, technisch, etc.).
- Behalte bestehende Variablen ({{vorname}}, {{firma}}, ...) im unveraenderten Teil exakt bei.
- Wenn die Anweisung mehrdeutig ist, waehle die wahrscheinlichste Interpretation und mache die Aenderung trotzdem. Beschreibe deine Interpretation in summary.
- Wenn die Anweisung Fakten verlangt, die du nicht hast (z.B. "schreibe etwas Persoenliches ueber unsere letzte Konferenz"), formuliere generisch oder lehne implizit ab, indem du nur einen neutralen Platzhalter-Satz einfuegst. Erfinde nichts.
- Der newBody muss vollstaendig sein, nicht nur der geaenderte Teil.
- summary: ein deutscher Satz, max 1 Zeile, der die Aenderung beschreibt. Format: "Satz nach ... eingefuegt." / "Schluss durch ... ersetzt." / "Begruessung entfernt."`;

export interface EmailInlineEditContext {
  originalBody: string;
  transcript: string;
  language: EmailInlineEditLanguage;
}

export function buildEmailInlineEditPrompt(
  context: EmailInlineEditContext
): string {
  const langLabel = {
    de: "Deutsch",
    en: "English",
    nl: "Nederlands",
  }[context.language];

  return `=== SPRACHE DES ORIGINALS ===
${langLabel} (Sprach-Code: ${context.language})

=== ORIGINAL-BODY ===
${context.originalBody}

=== ANWEISUNG DES USERS (transkribiert) ===
${context.transcript}

=== AUFGABE ===
Fuehre die Anweisung minimal aus. Aendere nur, was der User explizit genannt hat. Behalte alles andere woertlich. Erfinde keine Fakten. Antworte ausschliesslich mit dem JSON-Objekt nach dem oben definierten Schema.`;
}

export interface EmailInlineEditResult {
  newBody: string;
  summary: string;
}

export function validateEmailInlineEditResult(
  data: unknown
): EmailInlineEditResult | null {
  if (typeof data !== "object" || data === null) return null;

  const d = data as Record<string, unknown>;

  if (typeof d.newBody !== "string" || d.newBody.trim().length === 0) {
    return null;
  }
  if (typeof d.summary !== "string" || d.summary.trim().length === 0) {
    return null;
  }

  return {
    newBody: d.newBody,
    summary: d.summary.trim().slice(0, 240),
  };
}
