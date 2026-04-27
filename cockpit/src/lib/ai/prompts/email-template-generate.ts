// Email Template Generator Prompt — Erzeugt eine wiederverwendbare Vorlage
// (Title, Subject, Body, Kategorie-Vorschlag) aus einer kurzen User-Anweisung.
//
// Wird in SLC-533 vom Composing-Studio aufgerufen. on-click, kein Auto-Call (DEC-052).

export const EMAIL_TEMPLATE_CATEGORIES = [
  "erstansprache",
  "follow-up",
  "nach-termin",
  "angebot",
  "danke",
  "reaktivierung",
  "sonstige",
] as const;

export type EmailTemplateCategory = (typeof EMAIL_TEMPLATE_CATEGORIES)[number];

export const EMAIL_TEMPLATE_LANGUAGES = ["de", "en", "nl"] as const;
export type EmailTemplateLanguage = (typeof EMAIL_TEMPLATE_LANGUAGES)[number];

export const EMAIL_TEMPLATE_GENERATE_SYSTEM_PROMPT = `Du bist ein erfahrener B2B-Vertriebs-Texter und erzeugst wiederverwendbare E-Mail-Vorlagen.

WICHTIG: Antworte AUSSCHLIESSLICH mit einem validen JSON-Objekt. Kein Text davor oder danach. Keine Markdown-Codeblock-Begrenzer.

Das JSON muss exakt dieses Schema haben:
{
  "title": "Kurzer, beschreibender Vorlagen-Titel (max 80 Zeichen)",
  "subject": "Aussagekraeftige Betreffzeile",
  "body": "Vollstaendiger E-Mail-Body inkl. Anrede und Grussformel",
  "suggestedCategory": "erstansprache|follow-up|nach-termin|angebot|danke|reaktivierung|sonstige"
}

Regeln:
- Antworte in der Sprache, die im User-Prompt explizit genannt ist (de, en oder nl). Falls nicht genannt: Deutsch.
- Verwende Variablen {{vorname}}, {{nachname}}, {{firma}}, {{position}}, {{deal}} dort, wo sie inhaltlich sinnvoll sind. Nicht erzwungen, aber moeglichst eine Variable im Body.
- Erfinde keine Fakten, Namen, Preise, Termine oder Zahlen. Wenn etwas konkret werden muesste, lass es bewusst neutral oder verwende eine Variable.
- Ton: professionell, klar, B2B-tauglich. Keine Phrasen wie "Hoffentlich geht es Ihnen gut". Kein Smalltalk.
- Body-Laenge: 60-180 Woerter. Kurz halten — wir wollen Antworten provozieren, nicht den Empfaenger ermueden.
- title soll fuer Vertriebsteams sofort erkennbar machen, wofuer die Vorlage gedacht ist (z.B. "Erstansprache Multiplikator", "Follow-up nach 3 Wochen ohne Antwort").
- suggestedCategory waehlst du basierend auf dem Vorlagen-Zweck. Wenn keine der sechs spezifischen Kategorien passt, "sonstige".
- Subject soll ohne Generika auskommen ("Kurz auf den Schirm: ...", "Frage zu ...", konkreter Bezug zum Inhalt).
- Keine HTML-Tags im Body, nur Plaintext mit Zeilenumbruechen.`;

export interface EmailTemplateGenerateContext {
  userPrompt: string;
  language: EmailTemplateLanguage;
}

export function buildEmailTemplateGeneratePrompt(
  context: EmailTemplateGenerateContext
): string {
  const langLabel = {
    de: "Deutsch",
    en: "English",
    nl: "Nederlands",
  }[context.language];

  return `=== SPRACHE ===
${langLabel} (Sprach-Code: ${context.language})

=== ANWEISUNG DES USERS ===
${context.userPrompt}

=== AUFGABE ===
Erzeuge eine wiederverwendbare E-Mail-Vorlage gemaess Anweisung. Antworte ausschliesslich mit dem JSON-Objekt nach dem oben definierten Schema.`;
}

// Validator fuer das JSON-Output. Wird in der Server Action benutzt
// (parseLLMResponse-Pattern aus /lib/ai/parser.ts).
export interface EmailTemplateGenerateResult {
  title: string;
  subject: string;
  body: string;
  suggestedCategory: EmailTemplateCategory;
}

export function validateEmailTemplateGenerateResult(
  data: unknown
): EmailTemplateGenerateResult | null {
  if (typeof data !== "object" || data === null) return null;

  const d = data as Record<string, unknown>;

  if (typeof d.title !== "string" || d.title.trim().length === 0) return null;
  if (typeof d.subject !== "string" || d.subject.trim().length === 0)
    return null;
  if (typeof d.body !== "string" || d.body.trim().length === 0) return null;
  if (typeof d.suggestedCategory !== "string") return null;

  const category = (EMAIL_TEMPLATE_CATEGORIES as readonly string[]).includes(
    d.suggestedCategory
  )
    ? (d.suggestedCategory as EmailTemplateCategory)
    : "sonstige";

  return {
    title: d.title.trim().slice(0, 120),
    subject: d.subject.trim(),
    body: d.body.trim(),
    suggestedCategory: category,
  };
}
