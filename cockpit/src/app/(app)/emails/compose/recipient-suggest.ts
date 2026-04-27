"use server";

// =============================================================
// recipientSuggest — Server Action (deterministisch, KEIN LLM)
// =============================================================
// Schlaegt Empfaenger + Betreff aus dem Deal-Kontext vor:
//   1. juengste IMAP-Inbound-Mail fuer Deal -> Lookup contact via from_address
//   2. Fallback: deals.contact_id (Primary Contact)
//   3. Subject aus Stage-Map (hartkodiert)
//
// Bewusst kein Bedrock-Call (DEC-052 — KI nur on-click und nur wo sinnvoll).
//
// Slice: SLC-533 MT-5

import { createClient } from "@/lib/supabase/server";

export type RecipientSuggestion = {
  to: string | null;
  subject: string | null;
  contactId: string | null;
  contactName: string | null;
  source: "inbound-mail" | "primary-contact" | "none";
};

// Stage-Heuristik per Substring (kein exact match), weil Live-Pipeline-Stages
// in DE frei formuliert sind ("Erstkontakt erfolgt", "Verhandlung / Einwaende",
// "Strategischer Multiplikator", ...) und sich vom Slug-Set unterscheiden.
// Reihenfolge ist wichtig: spaetere Stages werden zuerst geprueft, damit
// "Vertiefung / Bedarfsschaerfung" nicht von "erst..." gefangen wird.
type StageRule = {
  match: RegExp;
  subject: string;
};

const STAGE_RULES: StageRule[] = [
  // Closing / Outcomes (zuerst pruefen — eindeutige Endstates)
  { match: /\b(gewonnen|won|closed_won)\b/i, subject: "Vielen Dank fuer dein Vertrauen" },
  { match: /\b(verloren|lost|closed_lost|disqualifiziert)\b/i, subject: "Kurzes Update von uns" },
  { match: /\b(inaktiv|geparkt)\b/i, subject: "Kurzes Update von uns" },
  { match: /\b(strategischer\s*multiplikator|empfehlung)\b/i, subject: "Naechster Schritt zu unserer Zusammenarbeit" },
  // Verhandlung / Angebot
  { match: /\b(verhandlung|einw[aä]nd|negotiation)\b/i, subject: "Naechster Schritt zu unserem Angebot" },
  { match: /\b(angebot|proposal|vertiefung|bedarfssch[aä]rfung)\b/i, subject: "Folge-up zu unserem Angebot" },
  { match: /\b(fit\s*wahrscheinlich|potenzial)\b/i, subject: "Folge-up zu unserem Gespraech" },
  // Mitte: Gespraeche / Qualifikation
  { match: /\b(erstgespr|gespr[aä]ch\s*gef|qualifikation|qualifiziert)\b/i, subject: "Folge-up zu unserem Erstgespraech" },
  { match: /\b(beziehungspflege)\b/i, subject: "Kurzes Folge-up von mir" },
  // Top of funnel
  { match: /\b(erstkontakt|erstansprache|discovery)\b/i, subject: "Erstansprache zu deinem Anliegen" },
  { match: /\b(erste\s*einordnung|recherchiert|identifiziert|signal)\b/i, subject: "Erstansprache zu deinem Anliegen" },
];

function subjectForStage(stage: string | null): string | null {
  if (!stage) return null;
  const haystack = stage.toLowerCase();
  for (const rule of STAGE_RULES) {
    if (rule.match.test(haystack)) return rule.subject;
  }
  return null;
}

function fullName(
  first: string | null | undefined,
  last: string | null | undefined,
): string | null {
  const parts = [first, last].filter((p) => p && p.trim());
  return parts.length > 0 ? parts.join(" ") : null;
}

export async function recipientSuggest(
  dealId: string,
): Promise<RecipientSuggestion> {
  if (!dealId) {
    return { to: null, subject: null, contactId: null, contactName: null, source: "none" };
  }

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return { to: null, subject: null, contactId: null, contactName: null, source: "none" };
  }

  // Stage fuer Subject-Vorschlag laden (parallel mit den Mail-Lookups)
  const dealPromise = supabase
    .from("deals")
    .select("contact_id, stage:pipeline_stages(name)")
    .eq("id", dealId)
    .maybeSingle();

  // 1. Juengste IMAP-Inbound-Mail fuer Deal — email_messages ist die V4-Inbox,
  // jeder Eintrag dort ist per Definition inbound (IMAP-Sync).
  const inboundPromise = supabase
    .from("email_messages")
    .select("from_address, contact_id")
    .eq("deal_id", dealId)
    .order("received_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const [{ data: deal }, { data: inbound }] = await Promise.all([
    dealPromise,
    inboundPromise,
  ]);

  const stage =
    (deal?.stage as unknown as { name: string | null } | null)?.name ?? null;
  const subject = subjectForStage(stage);

  // 1a. Inbound-Mail vorhanden → versuche from_address auf Contact zu mappen
  if (inbound?.from_address) {
    const fromAddress = inbound.from_address.toLowerCase().trim();

    // Falls email_messages.contact_id schon gesetzt ist (Auto-Zuordnung), nutzen
    if (inbound.contact_id) {
      const { data: contact } = await supabase
        .from("contacts")
        .select("id, first_name, last_name, email")
        .eq("id", inbound.contact_id)
        .maybeSingle();

      if (contact?.email) {
        return {
          to: contact.email,
          subject,
          contactId: contact.id,
          contactName: fullName(contact.first_name, contact.last_name),
          source: "inbound-mail",
        };
      }
    }

    // Fallback: Lookup via from_address (case-insensitive)
    const { data: contact } = await supabase
      .from("contacts")
      .select("id, first_name, last_name, email")
      .ilike("email", fromAddress)
      .limit(1)
      .maybeSingle();

    if (contact?.email) {
      return {
        to: contact.email,
        subject,
        contactId: contact.id,
        contactName: fullName(contact.first_name, contact.last_name),
        source: "inbound-mail",
      };
    }

    // Letzte Option: from_address direkt nehmen (kein Contact-Match)
    return {
      to: inbound.from_address,
      subject,
      contactId: null,
      contactName: inbound.from_address,
      source: "inbound-mail",
    };
  }

  // 2. Fallback: deals.contact_id
  if (deal?.contact_id) {
    const { data: contact } = await supabase
      .from("contacts")
      .select("id, first_name, last_name, email")
      .eq("id", deal.contact_id)
      .maybeSingle();

    if (contact?.email) {
      return {
        to: contact.email,
        subject,
        contactId: contact.id,
        contactName: fullName(contact.first_name, contact.last_name),
        source: "primary-contact",
      };
    }
  }

  return {
    to: null,
    subject,
    contactId: null,
    contactName: null,
    source: "none",
  };
}
