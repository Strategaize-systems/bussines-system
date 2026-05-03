// =============================================================
// V5.6 SLC-564 — Pre-Call Briefing Email Template (DE)
// =============================================================
// Compact plain-HTML mail. NO Branding-Renderer (briefing is internal —
// recipient is the user's own inbox). Renders 5 sections + click-through
// link. The template is tested via snapshot in __tests__/briefing-html.test.ts.

import type { BriefingPayload } from "@/lib/types/briefing";

export interface BriefingEmailInput {
  meetingTitle: string;
  meetingScheduledAt: Date;
  dealName: string;
  dealId: string;
  briefing: BriefingPayload;
  /** Absolute base URL for the click-through link, e.g. https://business.strategaizetransition.com */
  baseUrl: string;
}

export interface BriefingEmailOutput {
  subject: string;
  html: string;
  text: string;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatDateTimeDe(d: Date): string {
  return (
    d.toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }) + " Uhr"
  );
}

function topThree(arr: string[]): string[] {
  return arr.slice(0, 3);
}

export function renderBriefingEmail(input: BriefingEmailInput): BriefingEmailOutput {
  const formattedDate = formatDateTimeDe(input.meetingScheduledAt);
  const subject = `Briefing: ${input.meetingTitle} (${formattedDate})`;
  const dealUrl = `${input.baseUrl.replace(/\/$/, "")}/deals/${input.dealId}`;

  const facts = topThree(input.briefing.keyFacts);
  const risks = topThree(input.briefing.openRisks);
  const next = topThree(input.briefing.suggestedNextSteps);

  // ── HTML ─────────────────────────────────────────────────────
  const factsHtml = facts.length
    ? `<ul style="margin:0 0 16px 20px;padding:0;color:#334155;font-size:14px;line-height:1.55;">${facts
        .map((f) => `<li>${escapeHtml(f)}</li>`)
        .join("")}</ul>`
    : `<p style="margin:0 0 16px 0;color:#94a3b8;font-style:italic;font-size:14px;">Keine Fakten verfuegbar.</p>`;

  const risksHtml = risks.length
    ? `<ul style="margin:0 0 16px 20px;padding:0;color:#334155;font-size:14px;line-height:1.55;">${risks
        .map((r) => `<li>${escapeHtml(r)}</li>`)
        .join("")}</ul>`
    : `<p style="margin:0 0 16px 0;color:#94a3b8;font-style:italic;font-size:14px;">Keine offenen Risiken erkannt.</p>`;

  const nextHtml = next.length
    ? `<ul style="margin:0 0 16px 20px;padding:0;color:#334155;font-size:14px;line-height:1.55;">${next
        .map((n) => `<li>${escapeHtml(n)}</li>`)
        .join("")}</ul>`
    : `<p style="margin:0 0 16px 0;color:#94a3b8;font-style:italic;font-size:14px;">Keine Schritte vorgeschlagen.</p>`;

  const html = `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8">
<title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f8fafc;color:#0f172a;">
  <div style="max-width:600px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;padding:24px;">
    <h1 style="margin:0 0 4px 0;font-size:18px;color:#0f172a;">${escapeHtml(input.meetingTitle)}</h1>
    <p style="margin:0 0 16px 0;font-size:13px;color:#64748b;">${escapeHtml(formattedDate)} &middot; ${escapeHtml(input.dealName)}</p>

    <h2 style="margin:0 0 6px 0;font-size:14px;color:#1e293b;">Zusammenfassung</h2>
    <p style="margin:0 0 16px 0;font-size:14px;color:#334155;line-height:1.55;">${escapeHtml(input.briefing.summary)}</p>

    <h2 style="margin:0 0 6px 0;font-size:14px;color:#1e293b;">Wichtigste Fakten</h2>
    ${factsHtml}

    <h2 style="margin:0 0 6px 0;font-size:14px;color:#1e293b;">Offene Risiken</h2>
    ${risksHtml}

    <h2 style="margin:0 0 6px 0;font-size:14px;color:#1e293b;">Naechste Schritte</h2>
    ${nextHtml}

    <div style="margin-top:24px;padding-top:16px;border-top:1px solid #e2e8f0;">
      <a href="${escapeHtml(dealUrl)}" style="display:inline-block;padding:10px 18px;background:#4f46e5;color:#ffffff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:500;">Deal-Workspace oeffnen</a>
    </div>
    <p style="margin:16px 0 0 0;font-size:11px;color:#94a3b8;">Briefing automatisch generiert &middot; Konfidenz ${input.briefing.confidence}%</p>
  </div>
</body>
</html>`;

  // ── Plain Text ────────────────────────────────────────────────
  const textLines = [
    input.meetingTitle,
    `${formattedDate} - ${input.dealName}`,
    "",
    "ZUSAMMENFASSUNG",
    input.briefing.summary,
    "",
    "WICHTIGSTE FAKTEN",
    ...(facts.length ? facts.map((f) => `- ${f}`) : ["(keine)"]),
    "",
    "OFFENE RISIKEN",
    ...(risks.length ? risks.map((r) => `- ${r}`) : ["(keine)"]),
    "",
    "NAECHSTE SCHRITTE",
    ...(next.length ? next.map((n) => `- ${n}`) : ["(keine)"]),
    "",
    `Deal-Workspace: ${dealUrl}`,
    `Konfidenz: ${input.briefing.confidence}%`,
  ];
  const text = textLines.join("\n");

  return { subject, html, text };
}
