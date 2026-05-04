/**
 * Snapshot-Tests fuer renderBrandedHtml (FEAT-531, SLC-531 MT-3, AC4 + AC6).
 *
 * 3 Cases:
 * 1. empty-fallback     -> branding=null + leeres Branding-Objekt -> textToHtml-Identitaet
 * 2. full-branding      -> alle Felder gesetzt
 * 3. logo-only          -> nur Logo-URL gesetzt
 *
 * Zusaetzlich: AC4-Identitaet (renderBrandedHtml(body, null, {}) == textToHtml(body))
 * und Variablen-Ersetzung.
 */

import { describe, expect, it } from "vitest";
import { renderBrandedHtml } from "./render";
import { textToHtml } from "./tracking";
import type { Branding } from "@/types/branding";

const SAMPLE_BODY = "Hallo {{vorname}},\n\nvielen Dank fuer dein Interesse.\n\nBeste Gruesse";
const SAMPLE_VARS = { vorname: "Anna" };

const FULL_BRANDING: Branding = {
  id: "00000000-0000-0000-0000-000000000001",
  logoUrl: "https://example.com/logo.png",
  primaryColor: "#ff6600",
  secondaryColor: "#003366",
  fontFamily: "inter",
  footerMarkdown: "Strategaize GmbH\nMusterstrasse 1, 12345 Berlin",
  contactBlock: {
    name: "Anna Beispiel",
    company: "Strategaize GmbH",
    phone: "+49 30 1234567",
    web: "https://strategaize.de",
  },
  vatId: null,
  businessCountry: "NL",
  updatedBy: null,
  updatedAt: "2026-04-27T10:00:00.000Z",
};

const LOGO_ONLY_BRANDING: Branding = {
  id: "00000000-0000-0000-0000-000000000002",
  logoUrl: "https://example.com/logo-only.png",
  primaryColor: null,
  secondaryColor: null,
  fontFamily: null,
  footerMarkdown: null,
  contactBlock: null,
  vatId: null,
  businessCountry: "NL",
  updatedBy: null,
  updatedAt: "2026-04-27T10:00:00.000Z",
};

describe("renderBrandedHtml", () => {
  it("empty-fallback: branding=null gibt identischen Output wie textToHtml (AC4)", () => {
    const rendered = renderBrandedHtml(SAMPLE_BODY, null, {});
    const fallback = textToHtml(SAMPLE_BODY);
    expect(rendered).toBe(fallback);
    expect(rendered).toMatchSnapshot();
  });

  it("empty-fallback: leeres Branding-Objekt triggert ebenfalls Fallback (AC9)", () => {
    const emptyBranding: Branding = {
      id: "00000000-0000-0000-0000-000000000003",
      logoUrl: null,
      primaryColor: null,
      secondaryColor: null,
      fontFamily: "system",
      footerMarkdown: null,
      contactBlock: null,
      vatId: null,
      businessCountry: "NL",
      updatedBy: null,
      updatedAt: "2026-04-27T10:00:00.000Z",
    };
    const rendered = renderBrandedHtml(SAMPLE_BODY, emptyBranding, {});
    const fallback = textToHtml(SAMPLE_BODY);
    expect(rendered).toBe(fallback);
  });

  it("full-branding: rendert Logo, Footer-Linie, Kontakt-Block + Footer-Text (AC5)", () => {
    const rendered = renderBrandedHtml(SAMPLE_BODY, FULL_BRANDING, SAMPLE_VARS);
    expect(rendered).toContain("Inter");
    expect(rendered).toContain("https://example.com/logo.png");
    expect(rendered).toContain("border-top:2px solid #ff6600");
    expect(rendered).toContain("Anna Beispiel");
    expect(rendered).toContain("Strategaize GmbH");
    expect(rendered).toContain("Hallo Anna,"); // Variable ersetzt
    expect(rendered).toMatchSnapshot();
  });

  it("logo-only: rendert Logo + Default-Primaerfarbe als Footer-Linie", () => {
    const rendered = renderBrandedHtml(SAMPLE_BODY, LOGO_ONLY_BRANDING, SAMPLE_VARS);
    expect(rendered).toContain("https://example.com/logo-only.png");
    expect(rendered).toContain("border-top:2px solid #4454b8"); // Default Primary
    expect(rendered).not.toContain("Anna Beispiel"); // kein Kontakt-Block
    expect(rendered).toMatchSnapshot();
  });

  it("Variablen-Ersetzung: unbekannte Tokens bleiben sichtbar stehen", () => {
    const body = "Hallo {{vorname}}, deine ID ist {{unbekannt}}.";
    const rendered = renderBrandedHtml(body, null, { vorname: "Bob" });
    expect(rendered).toContain("Hallo Bob,");
    expect(rendered).toContain("{{unbekannt}}");
  });

  it("HTML-Escaping: gefaehrliche Zeichen im Body werden escaped", () => {
    const body = "Test <script>alert('xss')</script> & friends";
    const rendered = renderBrandedHtml(body, FULL_BRANDING, {});
    expect(rendered).not.toContain("<script>");
    expect(rendered).toContain("&lt;script&gt;");
    expect(rendered).toContain("&amp; friends");
  });

  it("HTML-Escaping: Logo-URL und Footer-Markdown werden escaped", () => {
    const malicious: Branding = {
      ...FULL_BRANDING,
      logoUrl: 'https://x.com/"><script>alert(1)</script>',
      footerMarkdown: "Footer <b>fett</b>",
    };
    const rendered = renderBrandedHtml(SAMPLE_BODY, malicious, {});
    expect(rendered).not.toContain("<script>alert(1)</script>");
    expect(rendered).not.toContain("<b>fett</b>");
    expect(rendered).toContain("&lt;b&gt;fett&lt;/b&gt;");
  });
});
