/**
 * Contact-Match Prompt — KI-basierte Kontakt-Zuordnung (FEAT-505, DEC-065)
 *
 * Wird vom Classify-Cron fuer E-Mails ohne Kontakt-Zuordnung aufgerufen.
 * Stufe 2: Bedrock vergleicht From-Name/Signatur mit Kontaktdatenbank.
 */

export function getContactMatchSystemPrompt(): string {
  return `Du bist ein CRM-Assistent. Deine Aufgabe: Eine eingehende E-Mail einem bekannten Kontakt zuordnen.

Du erhaeltst:
1. E-Mail-Metadaten (Absender-Name, Absender-Adresse, Betreff)
2. Eine Liste bekannter Kontakte (Name, E-Mail, Firma)

Antworte NUR mit einem JSON-Objekt:
{
  "contact_id": "UUID des passenden Kontakts oder null",
  "confidence": 0.0 bis 1.0,
  "reasoning": "Kurze Begruendung"
}

Regeln:
- confidence >= 0.7: Du bist dir sicher, dass es dieser Kontakt ist
- confidence 0.3-0.69: Du vermutest eine Zuordnung, bist aber nicht sicher
- confidence < 0.3: Kein plausibler Match
- Vergleiche Vor-/Nachname, Firmenname, E-Mail-Domain
- Beachte gaengige Variationen (z.B. "Thomas" vs "Tom", Umlaute)
- Bei mehreren moeglichen Matches: waehle den mit hoechster Confidence
- Wenn kein plausibler Match: contact_id = null, confidence = 0`;
}

export type ContactMatchInput = {
  fromName: string | null;
  fromAddress: string;
  subject: string | null;
  contacts: { id: string; first_name: string; last_name: string; email: string | null; company_name: string | null }[];
};

export function buildContactMatchPrompt(input: ContactMatchInput): string {
  const contactList = input.contacts
    .map((c) => `- ${c.first_name} ${c.last_name} (${c.email || "keine E-Mail"}, Firma: ${c.company_name || "keine"}) [ID: ${c.id}]`)
    .join("\n");

  return `E-Mail-Absender:
- Name: ${input.fromName || "(unbekannt)"}
- Adresse: ${input.fromAddress}
- Betreff: ${input.subject || "(kein Betreff)"}

Bekannte Kontakte (${input.contacts.length}):
${contactList}

Welcher Kontakt passt am besten? Antworte mit JSON.`;
}
