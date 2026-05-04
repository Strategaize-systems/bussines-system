// V5.5 SLC-553 — pdfmake-basierter Adapter fuer Angebot-PDFs (DEC-105).
// Adapter-Pattern analog V5.1 Whisper-Adapter: stabiles Interface, austauschbare
// Default-Implementation. PDF wird server-side aus Proposal + Items + Branding
// + Empfaenger-Kontext gerendert. Cent-genaue Berechnung via lib/proposal/calc.

import type {
  Content,
  TDocumentDefinitions,
  TFontDictionary,
} from "pdfmake/interfaces";
import PdfPrinter from "pdfmake";
import vfsFonts from "pdfmake/build/vfs_fonts";

import { calculateLineTotal, calculateTotals } from "@/lib/proposal/calc";
import { sanitizeProposalFilename } from "@/lib/pdf/filename-helper";
import { buildReverseChargeBlock } from "@/lib/pdf/reverse-charge-block";
import type {
  Proposal,
  ProposalItem,
  ProposalEditPayload,
} from "@/app/(app)/proposals/actions";
import type { PaymentMilestone } from "@/types/proposal-payment";

export type RenderProposalInput = {
  proposal: Proposal;
  items: ProposalItem[];
  branding: ProposalEditPayload["branding"];
  deal: ProposalEditPayload["deal"];
  company: ProposalEditPayload["company"];
  contact: ProposalEditPayload["contact"];
  logoDataUrl: string | null;
  testMode: boolean;
  // V5.6 SLC-563 — Split-Plan Teilzahlungen (DEC-120). Optional, damit
  // bestehende Aufrufer ohne Aenderung weiter funktionieren. Empty/undefined =
  // kein Konditionen-Block, PDF bleibt bit-identisch zum V5.5/SLC-562 Output.
  milestones?: PaymentMilestone[];
};

export type RenderProposalResult = {
  buffer: Buffer;
  filename: string;
};

export interface ProposalRenderer {
  renderProposalPdf(input: RenderProposalInput): Promise<RenderProposalResult>;
}

const fonts: TFontDictionary = {
  Roboto: {
    normal: Buffer.from(
      (vfsFonts as Record<string, string>)["Roboto-Regular.ttf"],
      "base64",
    ),
    bold: Buffer.from(
      (vfsFonts as Record<string, string>)["Roboto-Medium.ttf"],
      "base64",
    ),
    italics: Buffer.from(
      (vfsFonts as Record<string, string>)["Roboto-Italic.ttf"],
      "base64",
    ),
    bolditalics: Buffer.from(
      (vfsFonts as Record<string, string>)["Roboto-MediumItalic.ttf"],
      "base64",
    ),
  },
};

let cachedPrinter: PdfPrinter | null = null;
function getPrinter(): PdfPrinter {
  if (!cachedPrinter) cachedPrinter = new PdfPrinter(fonts);
  return cachedPrinter;
}

const eurFmt = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
});

const dateFmt = new Intl.DateTimeFormat("de-DE", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

function formatEur(value: number): string {
  return eurFmt.format(value);
}

function formatDate(value: string | null): string {
  if (!value) return "—";
  const d = new Date(value + "T00:00:00");
  if (Number.isNaN(d.getTime())) return value;
  return dateFmt.format(d);
}

function todayDe(): string {
  return dateFmt.format(new Date());
}

// pdfmake schluckt ueberfluessige Whitespaces und schreibt rohen Text. Wir
// entfernen die haeufigsten Markdown-Marker, damit der Footer-Text sauber
// wirkt (V5.5-Limit: kein vollstaendiger MD-Renderer in DEC-105).
function stripMarkdown(input: string): string {
  return input
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/_(.+?)_/g, "$1")
    .replace(/`(.+?)`/g, "$1")
    .replace(/\[(.+?)\]\((.+?)\)/g, "$1 ($2)")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "• ")
    .trim();
}

// V5.6 SLC-563 — Trigger-Label-Helper (DEC-120). Wandelt das Enum aus
// proposal_payment_milestones.due_trigger in den DE-String, der im PDF
// rendered wird. Bei `on_milestone` wird das frei-Text Label genutzt,
// falls vorhanden — sonst Fallback "Bei Meilenstein".
export function formatMilestoneTriggerLabel(m: PaymentMilestone): string {
  switch (m.due_trigger) {
    case "on_signature":
      return "Bei Vertragsabschluss";
    case "on_completion":
      return "Bei Fertigstellung";
    case "days_after_signature":
      return `${m.due_offset_days ?? 0} Tage nach Vertragsabschluss`;
    case "on_milestone":
      return m.label && m.label.trim().length > 0
        ? `Bei Meilenstein: ${m.label.trim()}`
        : "Bei Meilenstein";
    default:
      return "—";
  }
}

function summaryRow(label: string, value: string, bold = false): Content {
  return {
    columns: [
      { text: label, fontSize: bold ? 10 : 9, bold },
      {
        text: value,
        fontSize: bold ? 12 : 9,
        bold,
        alignment: "right",
        color: bold ? "#0f172a" : "#334155",
      },
    ],
  };
}

export function buildProposalDocDefinition(
  input: RenderProposalInput,
): TDocumentDefinitions {
  const {
    proposal,
    items,
    branding,
    company,
    contact,
    logoDataUrl,
    testMode,
    milestones,
  } = input;
  const taxRate = proposal.tax_rate ?? 19;
  const totals = calculateTotals(items, taxRate);
  const primaryColor = branding?.primary_color ?? "#120774";
  const milestonesList = milestones ?? [];

  const recipientLines: string[] = [];
  if (contact) {
    recipientLines.push(
      `${contact.first_name ?? ""} ${contact.last_name ?? ""}`.trim(),
    );
  }
  if (company) recipientLines.push(company.name);
  if (recipientLines.length === 0) recipientLines.push("—");

  const itemRows = items.length
    ? items.map((item, idx) => [
        { text: String(idx + 1), style: "tableCell", alignment: "right" },
        {
          stack: [
            { text: item.snapshot_name, style: "tableCellBold" },
            ...(item.snapshot_description
              ? [{ text: item.snapshot_description, style: "tableCellMuted" }]
              : []),
          ],
        },
        {
          text: String(item.quantity),
          style: "tableCell",
          alignment: "right",
        },
        {
          text: formatEur(item.unit_price_net),
          style: "tableCell",
          alignment: "right",
        },
        {
          text: item.discount_pct > 0 ? `${item.discount_pct}%` : "—",
          style: "tableCell",
          alignment: "right",
        },
        {
          text: formatEur(
            calculateLineTotal(
              item.quantity,
              item.unit_price_net,
              item.discount_pct,
            ),
          ),
          style: "tableCellBold",
          alignment: "right",
        },
      ])
    : [
        [
          {
            text: "Noch keine Positionen",
            colSpan: 6,
            italics: true,
            color: "#94a3b8",
            alignment: "center",
            margin: [0, 8, 0, 8],
          },
          {},
          {},
          {},
          {},
          {},
        ],
      ];

  const footerStripped = branding?.footer_markdown
    ? stripMarkdown(branding.footer_markdown)
    : null;

  const headerContent: Content = {
    stack: [
      {
        columns: [
          logoDataUrl
            ? { image: logoDataUrl, fit: [120, 36], margin: [40, 25, 0, 0] }
            : { text: "", margin: [40, 25, 0, 0] },
          {
            stack: [
              { text: `Datum: ${todayDe()}`, alignment: "right", fontSize: 9 },
              {
                text: `Gueltig bis: ${formatDate(proposal.valid_until)}`,
                alignment: "right",
                fontSize: 9,
                bold: true,
              },
            ],
            margin: [0, 28, 40, 0],
          },
        ],
      },
      {
        canvas: [
          {
            type: "rect",
            x: 0,
            y: 6,
            w: 595,
            h: 4,
            color: primaryColor,
          },
        ],
      },
    ],
  };

  const tableContent: Content = {
    table: {
      headerRows: 1,
      widths: ["auto", "*", "auto", "auto", "auto", "auto"],
      body: [
        [
          { text: "Pos", style: "tableHeader", alignment: "right" },
          { text: "Produkt", style: "tableHeader" },
          { text: "Menge", style: "tableHeader", alignment: "right" },
          { text: "Einzelpreis", style: "tableHeader", alignment: "right" },
          { text: "Rabatt", style: "tableHeader", alignment: "right" },
          { text: "Summe", style: "tableHeader", alignment: "right" },
        ],
        ...itemRows,
      ],
    },
    layout: {
      hLineWidth: (i, node) =>
        i === 0 || i === 1 || i === node.table.body.length ? 1 : 0.3,
      vLineWidth: () => 0,
      hLineColor: (i) => (i <= 1 ? primaryColor : "#e2e8f0"),
      paddingTop: () => 6,
      paddingBottom: () => 6,
    },
    margin: [0, 0, 0, 14],
  } as Content;

  // V5.7 SLC-571 MT-8 (DEC-125) — Reverse-Charge-Block direkt unter Tax-Row,
  // strikt conditional. proposal.reverse_charge=false → Stack unveraendert,
  // Snapshots aus V5.5/V5.6 bleiben bit-identisch.
  const summaryStack: Content[] = [
    summaryRow("Subtotal Netto", formatEur(totals.subtotal)),
    summaryRow(`Steuer (${taxRate}%)`, formatEur(totals.tax)),
  ];

  if (proposal.reverse_charge) {
    summaryStack.push(
      buildReverseChargeBlock(
        branding?.vat_id ?? null,
        company?.vat_id ?? null,
      ),
    );
  }

  summaryStack.push(
    {
      canvas: [
        {
          type: "line",
          x1: 0,
          y1: 0,
          x2: 220,
          y2: 0,
          lineWidth: 0.5,
          lineColor: "#cbd5e1",
        },
      ],
      margin: [0, 4, 0, 4],
    },
    summaryRow("Total Brutto", formatEur(totals.total), true),
  );

  const summaryContent: Content = {
    columns: [
      { text: "" },
      {
        width: 220,
        stack: summaryStack,
      },
    ],
    margin: [0, 0, 0, 18],
  } as Content;

  const content: Content[] = [
    {
      text: "Empfaenger",
      style: "label",
      margin: [0, 0, 0, 4],
    },
    {
      stack: recipientLines.map((line, i) => ({
        text: line,
        bold: i === 0,
        color: i === 0 ? "#0f172a" : "#475569",
      })),
      margin: [0, 0, 0, 18],
    },
    {
      canvas: [
        {
          type: "line",
          x1: 0,
          y1: 0,
          x2: 515,
          y2: 0,
          lineWidth: 1.5,
          lineColor: primaryColor,
        },
      ],
    },
    {
      text: `Angebot V${proposal.version}`,
      style: "label",
      margin: [0, 8, 0, 0],
    },
    {
      text: proposal.title || "(Ohne Titel)",
      fontSize: 16,
      bold: true,
      color: "#0f172a",
      margin: [0, 0, 0, 16],
    },
    tableContent,
    summaryContent,
  ];

  if (proposal.payment_terms) {
    content.push({
      text: "Zahlungsbedingungen",
      style: "label",
      margin: [0, 0, 0, 4],
    });
    content.push({
      text: proposal.payment_terms,
      margin: [0, 0, 0, 14],
    });
  }

  // V5.6 SLC-563 — Konditionen-Block (DEC-120). Strikt conditional: leerer
  // Plan = kein Block, kein Whitespace, damit V5.5-PDFs bit-identisch zum
  // V5.5/SLC-562-Snapshot bleiben. Reihenfolge: Tabelle erst, Skonto-Zeile
  // danach (siehe naechster Block).
  if (milestonesList.length > 0) {
    const milestoneRows = milestonesList.map((m) => [
      {
        text:
          m.label && m.label.trim().length > 0 && m.due_trigger !== "on_milestone"
            ? m.label.trim()
            : `Teilzahlung ${m.sequence}`,
        style: "tableCell",
      },
      {
        text: formatMilestoneTriggerLabel(m),
        style: "tableCell",
      },
      {
        text: `${m.percent.toFixed(2).replace(".", ",")}%`,
        style: "tableCell",
        alignment: "right",
      },
      {
        text:
          m.amount !== null && m.amount !== undefined
            ? formatEur(m.amount)
            : "—",
        style: "tableCellBold",
        alignment: "right",
      },
    ]);

    content.push({
      text: "Konditionen / Teilzahlungen",
      style: "label",
      margin: [0, 0, 0, 4],
    });
    content.push({
      table: {
        headerRows: 1,
        widths: ["*", "auto", "auto", "auto"],
        body: [
          [
            { text: "Teilzahlung", style: "tableHeader" },
            { text: "Faelligkeit", style: "tableHeader" },
            { text: "Anteil", style: "tableHeader", alignment: "right" },
            { text: "Betrag", style: "tableHeader", alignment: "right" },
          ],
          ...milestoneRows,
        ],
      },
      layout: {
        hLineWidth: (i, node) =>
          i === 0 || i === 1 || i === node.table.body.length ? 1 : 0.3,
        vLineWidth: () => 0,
        hLineColor: (i) => (i <= 1 ? primaryColor : "#e2e8f0"),
        paddingTop: () => 5,
        paddingBottom: () => 5,
      },
      margin: [0, 0, 0, 12],
    } as Content);
  }

  // V5.6 SLC-562 — Skonto-Block. Strikt conditional: bei null kein Block, kein
  // Whitespace, damit V5.5-PDFs bit-identisch zum V5.5-Snapshot bleiben.
  if (proposal.skonto_percent !== null && proposal.skonto_days !== null) {
    content.push({
      text: `Skonto: ${proposal.skonto_percent.toFixed(2).replace(".", ",")}% bei Zahlung innerhalb ${proposal.skonto_days} Tagen`,
      fontSize: 9,
      color: "#475569",
      margin: [0, 0, 0, 14],
    });
  }

  // V5.7 SLC-571 MT-8 (DEC-124) — Strategaize-vat_id im Footer-Block. Wird
  // gerendert wenn branding.vat_id gesetzt ist, unabhaengig von Reverse-Charge.
  // Bezeichner kontextabhaengig: NL → "BTW-Nr.", DE → "USt-IdNr." (Default
  // "USt-IdNr." wenn business_country fehlt). Zeile sitzt zwischen Trennlinie
  // und footer_markdown, damit sie in Kombination mit dem Markdown-Footer als
  // formelles Adressblock-Detail erscheint. Wenn vat_id null und kein Footer-
  // Markdown gesetzt: kein Block, V5.5/V5.6-Output bit-identisch.
  const strategaizeVatId = branding?.vat_id?.trim() || null;
  const businessCountry = branding?.business_country ?? null;
  const vatLabel = businessCountry === "NL" ? "BTW-Nr." : "USt-IdNr.";

  if (footerStripped || strategaizeVatId) {
    content.push({
      canvas: [
        {
          type: "line",
          x1: 0,
          y1: 0,
          x2: 515,
          y2: 0,
          lineWidth: 0.5,
          lineColor: "#cbd5e1",
        },
      ],
      margin: [0, 8, 0, 6],
    } as Content);

    if (strategaizeVatId) {
      content.push({
        text: `${vatLabel} ${strategaizeVatId}`,
        fontSize: 8,
        color: "#64748b",
        margin: [0, 0, 0, footerStripped ? 4 : 0],
      });
    }

    if (footerStripped) {
      content.push({
        text: footerStripped,
        fontSize: 8,
        color: "#64748b",
      });
    }
  }

  return {
    pageSize: "A4",
    pageMargins: [40, 90, 40, testMode ? 70 : 50],
    defaultStyle: { font: "Roboto", fontSize: 10, color: "#334155" },

    header: headerContent,

    content,

    footer: ((currentPage: number, pageCount: number): Content => {
      const stack: Content[] = [];
      if (testMode) {
        stack.push({
          text: "INTERNAL-TEST-MODE — nicht fuer externe Empfaenger",
          alignment: "center",
          fontSize: 8,
          color: "#b91c1c",
          margin: [40, 6, 40, 0],
        });
      }
      stack.push({
        text: `Seite ${currentPage} / ${pageCount}`,
        alignment: "center",
        fontSize: 8,
        color: "#94a3b8",
        margin: [40, 4, 40, 0],
      });
      return { stack };
    }) as TDocumentDefinitions["footer"],

    styles: {
      label: {
        fontSize: 8,
        bold: true,
        color: "#94a3b8",
        characterSpacing: 0.5,
      },
      tableHeader: {
        fontSize: 9,
        bold: true,
        color: "#0f172a",
      },
      tableCell: { fontSize: 9 },
      tableCellBold: { fontSize: 9, bold: true, color: "#0f172a" },
      tableCellMuted: { fontSize: 8, color: "#64748b", margin: [0, 2, 0, 0] },
    },
  };
}

async function pdfDocToBuffer(doc: PDFKit.PDFDocument): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    doc.end();
  });
}

export const pdfmakeRenderer: ProposalRenderer = {
  async renderProposalPdf(input) {
    const docDef = buildProposalDocDefinition(input);
    const printer = getPrinter();
    const doc = printer.createPdfKitDocument(docDef);
    const buffer = await pdfDocToBuffer(doc);

    const filename = sanitizeProposalFilename(
      input.proposal.title,
      input.proposal.version,
      input.testMode,
    );

    return { buffer, filename };
  },
};
