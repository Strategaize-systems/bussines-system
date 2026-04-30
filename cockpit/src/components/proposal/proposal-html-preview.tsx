"use client";

// V5.5 SLC-552: HTML-Approximation des PDF-Layouts (DEC-106).
// Wird im PreviewPanel debounced gerendert. SLC-553 ersetzt das durch echte
// pdfmake-Generierung. UI-Hinweis-Banner kommuniziert die Annaeherung.

import {
  calculateLineTotal,
  calculateTotals,
} from "@/lib/proposal/calc";
import type {
  Proposal,
  ProposalItem,
  ProposalEditPayload,
} from "@/app/(app)/proposals/actions";

const eur = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
});

const dateFmt = new Intl.DateTimeFormat("de-DE", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

function formatDate(value: string | null): string {
  if (!value) return "—";
  const d = new Date(value + "T00:00:00");
  if (Number.isNaN(d.getTime())) return value;
  return dateFmt.format(d);
}

type ProposalHtmlPreviewProps = {
  proposal: Proposal;
  items: ProposalItem[];
  branding: ProposalEditPayload["branding"];
  company: ProposalEditPayload["company"];
  contact: ProposalEditPayload["contact"];
};

export function ProposalHtmlPreview({
  proposal,
  items,
  branding,
  company,
  contact,
}: ProposalHtmlPreviewProps) {
  const taxRate = proposal.tax_rate ?? 19;
  const totals = calculateTotals(items, taxRate);
  const primary = branding?.primary_color ?? "#120774";
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
      <div
        className="h-2 w-full"
        style={{ backgroundColor: primary }}
        aria-hidden="true"
      />
      <div className="p-6 text-[11px] text-slate-700 space-y-5">
        {/* Briefkopf */}
        <div className="flex items-start justify-between gap-4">
          <div>
            {branding?.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={branding.logo_url}
                alt="Logo"
                className="h-10 w-auto object-contain"
              />
            ) : (
              <div className="text-sm font-bold text-slate-900">Strategaize</div>
            )}
          </div>
          <div className="text-right text-[10px] text-slate-500">
            <div>Datum: {dateFmt.format(new Date(today + "T00:00:00"))}</div>
            <div>
              Gueltig bis: <strong>{formatDate(proposal.valid_until)}</strong>
            </div>
          </div>
        </div>

        {/* Empfaenger */}
        <div>
          <div className="text-[10px] uppercase tracking-wide font-bold text-slate-400 mb-1">
            Empfaenger
          </div>
          <div className="font-semibold text-slate-900">
            {contact
              ? `${contact.first_name} ${contact.last_name}`
              : "—"}
          </div>
          {company && <div>{company.name}</div>}
        </div>

        {/* Angebot-Header */}
        <div className="border-t-2 pt-3" style={{ borderColor: primary }}>
          <div className="text-[10px] uppercase tracking-wide font-bold text-slate-400">
            Angebot V{proposal.version}
          </div>
          <div className="text-base font-bold text-slate-900">
            {proposal.title || "(Ohne Titel)"}
          </div>
        </div>

        {/* Position-Tabelle */}
        <table className="w-full border-collapse text-[10px]">
          <thead>
            <tr className="text-left">
              <th className="border-b-2 pb-1.5 font-bold text-slate-700" style={{ borderColor: primary }}>Pos</th>
              <th className="border-b-2 pb-1.5 font-bold text-slate-700" style={{ borderColor: primary }}>Produkt</th>
              <th className="border-b-2 pb-1.5 text-right font-bold text-slate-700" style={{ borderColor: primary }}>Menge</th>
              <th className="border-b-2 pb-1.5 text-right font-bold text-slate-700" style={{ borderColor: primary }}>Einzelpreis</th>
              <th className="border-b-2 pb-1.5 text-right font-bold text-slate-700" style={{ borderColor: primary }}>Rabatt</th>
              <th className="border-b-2 pb-1.5 text-right font-bold text-slate-700" style={{ borderColor: primary }}>Summe</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-4 text-center text-slate-400 italic">
                  Noch keine Positionen
                </td>
              </tr>
            ) : (
              items.map((item, i) => (
                <tr key={item.id} className="border-b border-slate-100">
                  <td className="py-1.5 align-top text-slate-500 tabular-nums">{i + 1}</td>
                  <td className="py-1.5 align-top">
                    <div className="font-semibold text-slate-900">{item.snapshot_name}</div>
                    {item.snapshot_description && (
                      <div className="text-[9px] text-slate-500 mt-0.5">
                        {item.snapshot_description}
                      </div>
                    )}
                  </td>
                  <td className="py-1.5 align-top text-right tabular-nums">
                    {item.quantity}
                  </td>
                  <td className="py-1.5 align-top text-right tabular-nums">
                    {eur.format(item.unit_price_net)}
                  </td>
                  <td className="py-1.5 align-top text-right tabular-nums">
                    {item.discount_pct > 0 ? `${item.discount_pct}%` : "—"}
                  </td>
                  <td className="py-1.5 align-top text-right tabular-nums font-semibold">
                    {eur.format(
                      calculateLineTotal(
                        item.quantity,
                        item.unit_price_net,
                        item.discount_pct,
                      ),
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Summary */}
        <div className="ml-auto w-2/3 space-y-1 pt-1">
          <SummaryRow label="Subtotal Netto" value={eur.format(totals.subtotal)} />
          <SummaryRow label={`Steuer (${taxRate}%)`} value={eur.format(totals.tax)} />
          <div className="h-px bg-slate-300 my-1" />
          <SummaryRow
            label="Total Brutto"
            value={eur.format(totals.total)}
            bold
          />
        </div>

        {/* Konditionen */}
        {proposal.payment_terms && (
          <div>
            <div className="text-[10px] uppercase tracking-wide font-bold text-slate-400 mb-1">
              Zahlungsbedingungen
            </div>
            <div className="text-slate-700 whitespace-pre-line">
              {proposal.payment_terms}
            </div>
          </div>
        )}

        {/* Footer */}
        {branding?.footer_markdown && (
          <div className="border-t border-slate-200 pt-3 text-[9px] text-slate-500 whitespace-pre-line">
            {branding.footer_markdown}
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  bold,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <div className="flex items-center justify-between text-[11px]">
      <span className={bold ? "font-bold text-slate-900" : "text-slate-600"}>
        {label}
      </span>
      <span
        className={
          bold
            ? "text-sm font-bold text-slate-900 tabular-nums"
            : "font-semibold text-slate-700 tabular-nums"
        }
      >
        {value}
      </span>
    </div>
  );
}
