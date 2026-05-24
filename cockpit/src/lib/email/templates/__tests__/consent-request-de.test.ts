/**
 * Tests fuer consentRequestHtml (SLC-853 DEC-239).
 *
 * Fokus: DSE-Footer-Insertion bei dseFooterHtml-Param + Bit-Identitaet
 * bei Default (V8.4-Regression-Safety).
 */

import { describe, expect, it } from "vitest";
import {
  consentRequestHtml,
  consentRequestSubject,
  consentRequestText,
} from "../consent-request-de";

const SAMPLE_INPUT = {
  firstName: "Anna",
  lastName: "Beispiel",
  consentUrl: "https://business.strategaizetransition.com/consent/abc123",
  revokeUrl: "https://business.strategaizetransition.com/consent/abc123/revoke",
};

const DSE_FOOTER_HTML =
  '<p style="margin:16px 0 0 0;font-size:11px;line-height:1.4;color:#6b7280;">' +
  '<a href="https://business.strategaizetransition.com/p/strategaize-transition-bv/datenschutz" ' +
  'style="color:#4454b8;text-decoration:underline;">Datenschutzerklaerung</a>' +
  "</p>";

describe("consentRequestSubject", () => {
  it("liefert deutschen Betreff", () => {
    expect(consentRequestSubject()).toBe(
      "Einwilligung zur Verarbeitung Ihrer Kontaktdaten",
    );
  });
});

describe("consentRequestText", () => {
  it("enthaelt Empfaenger-Name + Consent-/Revoke-URL", () => {
    const text = consentRequestText(SAMPLE_INPUT);
    expect(text).toContain("Hallo Anna Beispiel");
    expect(text).toContain(SAMPLE_INPUT.consentUrl);
    expect(text).toContain(SAMPLE_INPUT.revokeUrl);
  });
});

describe("consentRequestHtml — Default (kein DSE-Footer)", () => {
  it("ohne dseFooterHtml: Output enthaelt KEINEN DSE-Link (V8.4-Regression-Safety)", () => {
    const html = consentRequestHtml(SAMPLE_INPUT);
    expect(html).not.toContain("Datenschutzerklaerung");
    expect(html).not.toContain("/p/");
    expect(html).not.toContain("/datenschutz");
  });

  it("dseFooterHtml='' (explicit empty): Output bit-identisch zu Default-Call", () => {
    const htmlDefault = consentRequestHtml(SAMPLE_INPUT);
    const htmlEmpty = consentRequestHtml(SAMPLE_INPUT, "");
    expect(htmlEmpty).toBe(htmlDefault);
  });

  it("ohne dseFooterHtml: enthaelt Empfaenger-Name + Consent-Button + Revoke-Link", () => {
    const html = consentRequestHtml(SAMPLE_INPUT);
    expect(html).toContain("Hallo Anna Beispiel");
    expect(html).toContain(SAMPLE_INPUT.consentUrl);
    expect(html).toContain(SAMPLE_INPUT.revokeUrl);
    expect(html).toContain("Einwilligung erteilen oder ablehnen");
  });
});

describe("consentRequestHtml — DSE-Footer-Insertion (SLC-853)", () => {
  it("mit dseFooterHtml: Block ist vor </body> eingefuegt", () => {
    const html = consentRequestHtml(SAMPLE_INPUT, DSE_FOOTER_HTML);
    expect(html).toContain("Datenschutzerklaerung");
    expect(html).toContain(
      "/p/strategaize-transition-bv/datenschutz",
    );
    // Der Footer-Block steht VOR </body> + NACH der "Viele Gruesse"-Zeile
    const bodyClose = html.indexOf("</body>");
    const footerStart = html.indexOf("Datenschutzerklaerung");
    const greeting = html.indexOf("Viele Gr&uuml;&szlig;e");
    expect(footerStart).toBeLessThan(bodyClose);
    expect(footerStart).toBeGreaterThan(greeting);
  });

  it("mit dseFooterHtml: bestehender Body-Content bleibt unveraendert (Bit-Region-Safety)", () => {
    const htmlWith = consentRequestHtml(SAMPLE_INPUT, DSE_FOOTER_HTML);
    const htmlWithout = consentRequestHtml(SAMPLE_INPUT);
    // Wenn der DSE-Footer entfernt wird, sind beide identisch
    const stripped = htmlWith.replace(DSE_FOOTER_HTML, "");
    expect(stripped).toBe(htmlWithout);
  });
});
