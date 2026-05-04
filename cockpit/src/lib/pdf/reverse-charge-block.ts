// V5.7 SLC-571 MT-8 — Reverse-Charge-Block fuer Proposal-PDF (DEC-125).
// Der Block rendert direkt unter der Tax-Row im Summary-Block, wenn
// proposal.reverse_charge = true. Er enthaelt die bilinguale Standard-Phrase
// (NL/EN) und die beiden BTW-IDs des Absenders (Strategaize) und des
// Empfaengers. Defensive Renderung: fehlende vat_id-Werte werden als "—"
// dargestellt — der Server-Action-Validator soll diesen Fall verhindern,
// aber der Renderer crasht nicht.

import type { Content } from "pdfmake/interfaces";

// DEC-125 — Hardcoded Phrase. Bewusst KEIN i18n: das ist juristische
// Standard-Formulierung gemaess EU-VAT-Directive 2006/112/EC, die in dieser
// Form anerkannt wird. Aenderungen am Wortlaut bedeuten ADR-Update.
export const REVERSE_CHARGE_PHRASE_NL = "BTW verlegd";
export const REVERSE_CHARGE_PHRASE_EN =
  "Reverse Charge — Article 196 VAT Directive 2006/112/EC";

export const REVERSE_CHARGE_HEADER = `${REVERSE_CHARGE_PHRASE_NL} / ${REVERSE_CHARGE_PHRASE_EN}`;

function vatIdOrPlaceholder(value: string | null): string {
  if (!value || value.trim().length === 0) return "—";
  return value.trim();
}

/**
 * Erzeugt den Reverse-Charge-Hinweisblock fuer das Summary-Box. Wird vom
 * proposal-renderer aufgerufen, wenn proposal.reverse_charge === true.
 *
 * Layout: Stack aus zwei Zeilen, kompakt (fontSize 8) damit der Block in die
 * 220px-breite Summary-Spalte direkt unter der Tax-Row passt. Der Header ist
 * fett, die ID-Zeile ist normal-weight.
 */
export function buildReverseChargeBlock(
  strategaizeVatId: string | null,
  companyVatId: string | null,
): Content {
  const idsLine = `BTW-Nr. ${vatIdOrPlaceholder(strategaizeVatId)} — BTW-Nr. ${vatIdOrPlaceholder(companyVatId)}`;

  return {
    stack: [
      {
        text: REVERSE_CHARGE_HEADER,
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
