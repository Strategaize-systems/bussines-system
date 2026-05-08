// V6.5 SLC-656 MT-1 — DE-Reverse-Charge-Block fuer Proposal-PDF (DEC-162).
//
// PRELIMINARY: needs legal review before customer-live (DEC-162,
// ISSUE-042-Pattern Pre-Production-Compliance-Gate).
// Die DE-Pflichtformulierung "Steuerschuldnerschaft des Leistungsempfaengers"
// ist juristische Standard-Formulierung gemaess § 13b UStG / Art. 196 EU-VAT-
// Directive 2006/112/EC, muss aber vor erstem produktivem Kunden-Live-Call
// per Anwaltspruefung freigegeben werden. Aenderungen am Wortlaut bedeuten
// ADR-Update.
//
// Pendant zu reverse-charge-block.ts (NL-Variante, V5.7 SLC-571 MT-8). Layout
// 1:1 identisch (gleiche Schriftgroesse, Farben, Stack-Struktur), nur Text und
// VAT-Bezeichner unterscheiden sich.

import type { Content } from "pdfmake/interfaces";

export const REVERSE_CHARGE_PHRASE_DE =
  "Steuerschuldnerschaft des Leistungsempfaengers";
export const REVERSE_CHARGE_PHRASE_DE_REF =
  "§ 13b UStG / Article 196 VAT Directive 2006/112/EC";

export const DE_REVERSE_CHARGE_HEADER = `${REVERSE_CHARGE_PHRASE_DE} — ${REVERSE_CHARGE_PHRASE_DE_REF}`;

function vatIdOrPlaceholder(value: string | null): string {
  if (!value || value.trim().length === 0) return "—";
  return value.trim();
}

/**
 * Erzeugt den DE-Reverse-Charge-Hinweisblock fuer das Summary-Box. Wird vom
 * proposal-renderer aufgerufen, wenn proposal.reverse_charge === true UND
 * branding.business_country === "DE".
 *
 * Layout: Stack aus zwei Zeilen (fontSize 8) damit der Block in die 220px-
 * breite Summary-Spalte direkt unter der Tax-Row passt. Der Header ist fett,
 * die ID-Zeile ist normal-weight. Bezeichner "USt-IdNr." (DE-Konvention) im
 * Gegensatz zur NL-Variante "BTW-Nr.".
 */
export function buildDeReverseChargeBlock(
  strategaizeVatId: string | null,
  companyVatId: string | null,
): Content {
  const idsLine = `USt-IdNr. ${vatIdOrPlaceholder(strategaizeVatId)} — USt-IdNr. ${vatIdOrPlaceholder(companyVatId)}`;

  return {
    stack: [
      {
        text: DE_REVERSE_CHARGE_HEADER,
        fontSize: 8,
        bold: true,
        color: "#0f172a",
      },
      {
        text: idsLine,
        fontSize: 8,
        color: "#475569",
      },
    ],
    margin: [0, 4, 0, 0],
  } as Content;
}
