import { describe, expect, it } from "vitest";
import { renderBriefingEmail } from "../briefing-html";

const baseInput = {
  meetingTitle: "Discovery Call mit Mueller GmbH",
  meetingScheduledAt: new Date("2026-05-03T13:30:00.000Z"),
  dealName: "Mueller — Beratungsmandat",
  dealId: "deal-123",
  baseUrl: "https://business.strategaizetransition.com",
};

const baseBriefing = {
  summary: "Deal in qualifizierter Phase, hohes Budget, Entscheider klar.",
  keyFacts: [
    "Budget: 60.000 EUR genehmigt",
    "Entscheider: Geschaeftsfuehrer Mueller",
    "Timeline: Q3 2026",
    "Vierter Fakt der ignoriert werden sollte",
  ],
  openRisks: [
    "Mitbewerber Pipedrive im Pitch",
    "DSGVO-Pruefung steht aus",
  ],
  suggestedNextSteps: [
    "Folgetermin in 2 Wochen anbieten",
    "Compliance-One-Pager mitschicken",
    "Referenzkunde aus Mittelstand teilen",
  ],
  confidence: 78,
};

describe("renderBriefingEmail", () => {
  it("baut Subject mit Meeting-Titel + Datum", () => {
    const out = renderBriefingEmail({ ...baseInput, briefing: baseBriefing });
    expect(out.subject).toMatch(/^Briefing: Discovery Call mit Mueller GmbH \(/);
    expect(out.subject).toMatch(/Uhr\)$/);
  });

  it("HTML enthaelt alle 5 Sections + Click-Through-Link", () => {
    const out = renderBriefingEmail({ ...baseInput, briefing: baseBriefing });
    expect(out.html).toContain("Discovery Call mit Mueller GmbH");
    expect(out.html).toContain("Mueller — Beratungsmandat");
    expect(out.html).toContain("Zusammenfassung");
    expect(out.html).toContain("Wichtigste Fakten");
    expect(out.html).toContain("Offene Risiken");
    expect(out.html).toContain("Naechste Schritte");
    expect(out.html).toContain("https://business.strategaizetransition.com/deals/deal-123");
    expect(out.html).toContain("78%");
  });

  it("HTML zeigt nur Top-3 Items pro Liste", () => {
    const out = renderBriefingEmail({ ...baseInput, briefing: baseBriefing });
    expect(out.html).toContain("Budget: 60.000 EUR genehmigt");
    expect(out.html).toContain("Entscheider: Geschaeftsfuehrer Mueller");
    expect(out.html).toContain("Timeline: Q3 2026");
    expect(out.html).not.toContain("Vierter Fakt der ignoriert werden sollte");
  });

  it("HTML escaped HTML-Sonderzeichen", () => {
    const malicious = {
      ...baseBriefing,
      summary: "<script>alert(1)</script>",
    };
    const out = renderBriefingEmail({ ...baseInput, briefing: malicious });
    expect(out.html).not.toContain("<script>alert(1)</script>");
    expect(out.html).toContain("&lt;script&gt;");
  });

  it("Plain-Text-Fallback enthaelt alle Sections", () => {
    const out = renderBriefingEmail({ ...baseInput, briefing: baseBriefing });
    expect(out.text).toContain("ZUSAMMENFASSUNG");
    expect(out.text).toContain("WICHTIGSTE FAKTEN");
    expect(out.text).toContain("OFFENE RISIKEN");
    expect(out.text).toContain("NAECHSTE SCHRITTE");
    expect(out.text).toContain("https://business.strategaizetransition.com/deals/deal-123");
    expect(out.text).toContain("Konfidenz: 78%");
  });

  it("zeigt Fallback-Texte wenn Listen leer sind", () => {
    const empty = {
      summary: "Wenig Daten.",
      keyFacts: [],
      openRisks: [],
      suggestedNextSteps: [],
      confidence: 25,
    };
    const out = renderBriefingEmail({ ...baseInput, briefing: empty });
    expect(out.html).toContain("Keine Fakten verfuegbar.");
    expect(out.html).toContain("Keine offenen Risiken erkannt.");
    expect(out.html).toContain("Keine Schritte vorgeschlagen.");
    expect(out.text).toContain("(keine)");
  });
});

describe("renderBriefingEmail — SLC-853 DSE-Footer-Insertion", () => {
  const DSE_FOOTER_HTML =
    '<p style="margin:16px 0 0 0;font-size:11px;line-height:1.4;color:#6b7280;">' +
    '<a href="https://business.strategaizetransition.com/p/strategaize-transition-bv/datenschutz" ' +
    'style="color:#4454b8;text-decoration:underline;">Datenschutzerklaerung</a>' +
    "</p>";

  it("ohne dseFooterHtml: Output enthaelt KEINEN DSE-Link (V8.4-Regression-Safety)", () => {
    const out = renderBriefingEmail({ ...baseInput, briefing: baseBriefing });
    expect(out.html).not.toContain("Datenschutzerklaerung");
    expect(out.html).not.toContain("/p/");
    expect(out.html).not.toContain("/datenschutz");
  });

  it("mit dseFooterHtml: Block wird vor </body> in die Card eingefuegt", () => {
    const out = renderBriefingEmail({
      ...baseInput,
      briefing: baseBriefing,
      dseFooterHtml: DSE_FOOTER_HTML,
    });
    expect(out.html).toContain("Datenschutzerklaerung");
    expect(out.html).toContain(
      "/p/strategaize-transition-bv/datenschutz",
    );
    // Position: nach "Briefing automatisch generiert", vor </div></body>
    const confidence = out.html.indexOf("Konfidenz");
    const footer = out.html.indexOf("Datenschutzerklaerung");
    const bodyClose = out.html.indexOf("</body>");
    expect(footer).toBeGreaterThan(confidence);
    expect(footer).toBeLessThan(bodyClose);
  });

  it("mit dseFooterHtml: bestehender Body-Content bleibt bit-identisch ohne Footer", () => {
    const withFooter = renderBriefingEmail({
      ...baseInput,
      briefing: baseBriefing,
      dseFooterHtml: DSE_FOOTER_HTML,
    });
    const withoutFooter = renderBriefingEmail({
      ...baseInput,
      briefing: baseBriefing,
    });
    const stripped = withFooter.html.replace(DSE_FOOTER_HTML, "");
    expect(stripped).toBe(withoutFooter.html);
  });

  it("dseFooterHtml='' (explicit empty) bit-identisch zu Default-Call", () => {
    const withEmpty = renderBriefingEmail({
      ...baseInput,
      briefing: baseBriefing,
      dseFooterHtml: "",
    });
    const withoutParam = renderBriefingEmail({
      ...baseInput,
      briefing: baseBriefing,
    });
    expect(withEmpty.html).toBe(withoutParam.html);
  });
});
