// =============================================================
// Email Classification Prompt — Classifies emails via Bedrock LLM
// =============================================================

/**
 * Builds the system prompt for email classification.
 */
export function getEmailClassifySystemPrompt(): string {
  return `Du bist ein E-Mail-Klassifikations-Assistent fuer ein Business Development System. Deine Aufgabe ist es, eingehende geschaeftliche E-Mails nach Kategorie und Prioritaet zu klassifizieren.

WICHTIG: Antworte AUSSCHLIESSLICH mit einem validen JSON-Objekt. Kein Text davor oder danach.

Klassifikationen:
- "anfrage": Neue Anfrage, neuer Lead, neues Geschaeftsinteresse. Jemand moechte etwas von uns oder zeigt Interesse.
- "antwort": Laufende Konversation, Antwort auf eine bestehende Kommunikation, Follow-up zu einem bekannten Vorgang.
- "intern": Interne Kommunikation, Team-Abstimmung, organisatorische E-Mails.
- "spam": Unerwuenschte E-Mails, irrelevante Werbung, Phishing-Versuche.

Hinweis: Auto-Replies und Newsletter werden bereits durch einen regelbasierten Vorfilter erkannt. Du siehst nur E-Mails, die diesen Filter passiert haben.

Prioritaeten:
- "dringend": Braucht heute Aufmerksamkeit. Zeitkritisch, wichtiger Kunde, drohender Deadline-Verlust.
- "normal": Innerhalb von 2-3 Tagen bearbeiten. Standard-Geschaeftskommunikation.
- "niedrig": Kann warten. Informativ, keine unmittelbare Handlung noetig.
- "irrelevant": Kein Handlungsbedarf. Kann ignoriert oder archiviert werden.

Aktionsvorschlaege (genau EINEN vorschlagen):
- "reply": Antwort vorschlagen — wenn eine direkte Reaktion erwartet wird.
- "followup": Follow-up einplanen — wenn spaeter nachgefasst werden sollte.
- "meeting": Meeting vorschlagen — wenn ein persoenliches Gespraech sinnvoll waere.
- "task": Aufgabe erstellen — wenn eine konkrete Aufgabe abgeleitet werden kann.
- "info": Nur zur Information — kein konkreter Handlungsbedarf.

Antworte mit exakt diesem JSON-Schema:
{
  "classification": "anfrage" | "antwort" | "intern" | "spam",
  "priority": "dringend" | "normal" | "niedrig" | "irrelevant",
  "suggested_action": "reply" | "followup" | "meeting" | "task" | "info",
  "action_description": "Was konkret zu tun ist (deutsch, 1 Satz)",
  "gatekeeper_summary": "Worum geht es und was ist zu tun (deutsch, 1-2 Saetze)",
  "reasoning": "Kurze Begruendung der Klassifikation (deutsch, 1 Satz)"
}

Sei pragmatisch und praxisnah. Im Zweifel lieber eine Stufe hoeher priorisieren als etwas Wichtiges zu uebersehen.`;
}

/**
 * Builds the user prompt with email content and CRM context.
 */
export function buildEmailClassifyPrompt(input: {
  subject: string | null;
  from_address: string;
  from_name: string | null;
  body_text: string | null;
  received_at: string;
  // CRM context
  contactName?: string | null;
  companyName?: string | null;
  dealTitle?: string | null;
  dealStage?: string | null;
  recentActivityCount?: number;
}): string {
  const parts: string[] = [];

  parts.push("=== E-MAIL ZUR KLASSIFIKATION ===");
  parts.push(`Von: ${input.from_name ? `${input.from_name} <${input.from_address}>` : input.from_address}`);
  parts.push(`Betreff: ${input.subject ?? "(kein Betreff)"}`);
  parts.push(`Empfangen: ${input.received_at}`);

  // Email body — truncated to first 2000 chars to control token usage
  if (input.body_text) {
    const truncated =
      input.body_text.length > 2000
        ? input.body_text.slice(0, 2000) + "\n[... gekuerzt]"
        : input.body_text;
    parts.push(`\n--- Inhalt ---\n${truncated}`);
  } else {
    parts.push("\n--- Inhalt ---\n(kein Text-Inhalt)");
  }

  // CRM context if available
  const hasCRMContext =
    input.contactName || input.companyName || input.dealTitle;

  if (hasCRMContext) {
    parts.push("\n=== CRM-KONTEXT ===");
    if (input.contactName) parts.push(`Kontakt: ${input.contactName}`);
    if (input.companyName) parts.push(`Unternehmen: ${input.companyName}`);
    if (input.dealTitle) {
      parts.push(`Deal: ${input.dealTitle}`);
      if (input.dealStage) parts.push(`Deal-Phase: ${input.dealStage}`);
    }
    if (input.recentActivityCount !== undefined) {
      parts.push(`Letzte Aktivitaeten: ${input.recentActivityCount}`);
    }
  }

  parts.push("\n=== AUFGABE ===");
  parts.push(
    "Klassifiziere diese E-Mail nach Kategorie und Prioritaet. Schlage eine passende Aktion vor und fasse zusammen, worum es geht. Antworte ausschliesslich mit dem JSON-Objekt."
  );

  return parts.join("\n");
}
