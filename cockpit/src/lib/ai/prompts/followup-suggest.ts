// =============================================================
// Followup Suggestion Prompt — Generates reasoning for followup
// candidates via Bedrock LLM (FEAT-408 KI-Wiedervorlagen)
// =============================================================

/**
 * System prompt for followup suggestion reasoning.
 */
export function getFollowupSuggestSystemPrompt(): string {
  return `Du bist ein erfahrener Business Development Assistent. Deine Aufgabe ist es, kurze, handlungsorientierte Wiedervorlage-Begruendungen fuer CRM-Eintraege zu erstellen.

Erklaere WARUM ein Follow-up noetig ist und WAS konkret getan werden sollte.

WICHTIG: Antworte AUSSCHLIESSLICH mit einem validen JSON-Objekt. Kein Text davor oder danach.

Das JSON muss exakt dieses Schema haben:
{
  "reasoning": "1-2 Saetze, warum dieser Eintrag Aufmerksamkeit braucht (deutsch)",
  "suggested_action": "Konkreter naechster Schritt (deutsch, 1 Satz)",
  "urgency": "dringend" | "normal" | "niedrig"
}

Regeln:
- reasoning: Pragmatisch, auf Geschaeftswert fokussiert, nicht theoretisch
- suggested_action: Konkret und sofort umsetzbar (z.B. "Anrufen und nach Entscheidung fragen", nicht "Kontakt aufnehmen")
- urgency:
  - "dringend": Umsatz in Gefahr, Kunde koennte verloren gehen, >30 Tage ohne Kontakt bei hohem Deal-Wert
  - "normal": Standardmaessiges Nachfassen noetig, mittlere Prioritaet
  - "niedrig": Kann noch warten, aber sollte nicht vergessen werden

Sei pragmatisch und praxisnah. Fokussiere auf Geschaeftswert, nicht auf theoretische Vollstaendigkeit.`;
}

/**
 * Type label mapping for followup candidate types (German).
 */
const TYPE_LABELS: Record<string, string> = {
  stagnant_deal: "Stagnierender Deal",
  open_proposal: "Offenes Angebot",
  inactive_contact: "Inaktiver Kontakt",
  unanswered_email: "Unbeantwortete E-Mail",
};

/**
 * User prompt with the followup candidate context.
 */
export function buildFollowupSuggestPrompt(input: {
  type: "stagnant_deal" | "open_proposal" | "inactive_contact" | "unanswered_email";
  title: string;
  daysSince: number;
  context: {
    dealValue?: number | null;
    dealStage?: string | null;
    companyName?: string | null;
    contactName?: string | null;
    lastActivity?: string | null;
    proposalValue?: number | null;
    emailSubject?: string | null;
  };
}): string {
  const parts: string[] = [];

  const typeLabel = TYPE_LABELS[input.type] ?? input.type;

  parts.push("=== WIEDERVORLAGE-KANDIDAT ===");
  parts.push(`Typ: ${typeLabel}`);
  parts.push(`Titel: ${input.title}`);
  parts.push(`Tage seit letzter Aktivitaet: ${input.daysSince}`);

  // Available context
  const ctx = input.context;
  const hasContext =
    ctx.dealValue != null ||
    ctx.dealStage ||
    ctx.companyName ||
    ctx.contactName ||
    ctx.lastActivity ||
    ctx.proposalValue != null ||
    ctx.emailSubject;

  if (hasContext) {
    parts.push("\n=== KONTEXT ===");
    if (ctx.companyName) parts.push(`Unternehmen: ${ctx.companyName}`);
    if (ctx.contactName) parts.push(`Kontakt: ${ctx.contactName}`);
    if (ctx.dealValue != null) {
      parts.push(`Deal-Wert: ${ctx.dealValue.toLocaleString("de-DE")} EUR`);
    }
    if (ctx.dealStage) parts.push(`Deal-Phase: ${ctx.dealStage}`);
    if (ctx.proposalValue != null) {
      parts.push(`Angebotswert: ${ctx.proposalValue.toLocaleString("de-DE")} EUR`);
    }
    if (ctx.emailSubject) parts.push(`E-Mail-Betreff: ${ctx.emailSubject}`);
    if (ctx.lastActivity) parts.push(`Letzte Aktivitaet: ${ctx.lastActivity}`);
  }

  parts.push("\n=== AUFGABE ===");
  parts.push(
    "Erstelle eine kurze Wiedervorlage-Begruendung und schlage einen konkreten naechsten Schritt vor. Antworte ausschliesslich mit dem JSON-Objekt."
  );

  return parts.join("\n");
}
