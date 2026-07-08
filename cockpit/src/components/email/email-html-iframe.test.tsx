// EmailHtmlIframe — Defense-in-Depth Sandbox-Layer fuer Email-HTML-Rendering.
// Pattern P-079, siehe dev-system/docs/PATTERN_LIBRARY/11-html-sanitization.md.

import { render, fireEvent } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { EmailHtmlIframe } from "./email-html-iframe";

describe("EmailHtmlIframe", () => {
  it("rendert ein iframe-Element", () => {
    const { container } = render(<EmailHtmlIframe html="<p>Hallo</p>" />);
    const iframe = container.querySelector("iframe");
    expect(iframe).not.toBeNull();
  });

  it('setzt sandbox="" (alle Restrictions aktiv)', () => {
    const { container } = render(<EmailHtmlIframe html="<p>Hallo</p>" />);
    const iframe = container.querySelector("iframe");
    // sandbox="" muss als leere String-Attribut gesetzt sein, NICHT mit
    // allow-scripts/allow-same-origin/etc. — sonst defeats Defense-in-Depth.
    expect(iframe?.getAttribute("sandbox")).toBe("");
  });

  it("injiziert das HTML als srcDoc (nicht src)", () => {
    const html = "<p>Test-Inhalt-XYZ123</p>";
    const { container } = render(<EmailHtmlIframe html={html} />);
    const iframe = container.querySelector("iframe");
    const srcDoc = iframe?.getAttribute("srcdoc") ?? "";
    expect(srcDoc).toContain("Test-Inhalt-XYZ123");
    expect(iframe?.getAttribute("src")).toBeNull();
  });

  it("wrappt das HTML in einer vollstaendigen Doc-Struktur mit DOCTYPE + <style>", () => {
    const { container } = render(<EmailHtmlIframe html="<p>x</p>" />);
    const srcDoc = container.querySelector("iframe")?.getAttribute("srcdoc") ?? "";
    expect(srcDoc).toMatch(/<!DOCTYPE html>/i);
    expect(srcDoc).toMatch(/<html>/i);
    expect(srcDoc).toMatch(/<style>/i);
    expect(srcDoc).toMatch(/<body>/i);
  });

  it("setzt title-Attribut fuer Accessibility", () => {
    const { container } = render(<EmailHtmlIframe html="<p>x</p>" />);
    const iframe = container.querySelector("iframe");
    expect(iframe?.getAttribute("title")).toBeTruthy();
  });

  it("rendert mit width=100% und ohne border (style-Inline)", () => {
    const { container } = render(<EmailHtmlIframe html="<p>x</p>" />);
    const iframe = container.querySelector("iframe");
    const style = iframe?.getAttribute("style") ?? "";
    expect(style).toMatch(/width:\s*100%/);
    expect(style).toMatch(/border-width:\s*0/);
  });

  it("hat einen Default-Height-Wert (Min-Height vor onLoad-Measurement)", () => {
    const { container } = render(<EmailHtmlIframe html="<p>x</p>" />);
    const iframe = container.querySelector("iframe");
    const style = iframe?.getAttribute("style") ?? "";
    // Default-Height >= 80px (MIN_HEIGHT-Konstante)
    expect(style).toMatch(/height:\s*\d+px/);
  });
});

describe("EmailHtmlIframe — Remote-Bild-Banner + loaded-State (SLC-915 MT-6)", () => {
  it("zeigt den 'Bilder laden'-Banner wenn hasBlockedImages + emailId", () => {
    const { getByText } = render(
      <EmailHtmlIframe html="<p>x</p>" emailId="abc" hasBlockedImages />,
    );
    expect(getByText(/Externe Bilder blockiert/i)).toBeTruthy();
    expect(getByText(/Bilder laden/i)).toBeTruthy();
  });

  it("zeigt KEINEN Banner ohne emailId (auch wenn hasBlockedImages)", () => {
    const { queryByText } = render(
      <EmailHtmlIframe html="<p>x</p>" hasBlockedImages />,
    );
    expect(queryByText(/Bilder laden/i)).toBeNull();
  });

  it("zeigt KEINEN Banner wenn hasBlockedImages=false", () => {
    const { queryByText } = render(
      <EmailHtmlIframe html="<p>x</p>" emailId="abc" />,
    );
    expect(queryByText(/Bilder laden/i)).toBeNull();
  });

  it("startet im blocked-State (srcDoc + sandbox='') auch mit emailId", () => {
    const { container } = render(
      <EmailHtmlIframe html="<p>Y-INHALT</p>" emailId="abc" hasBlockedImages />,
    );
    const iframe = container.querySelector("iframe");
    expect(iframe?.getAttribute("sandbox")).toBe("");
    expect(iframe?.getAttribute("srcdoc") ?? "").toContain("Y-INHALT");
    expect(iframe?.getAttribute("src")).toBeNull();
  });

  it("wechselt nach Klick auf 'Bilder laden' in den loaded-State (src -> Route, sandbox=allow-same-origin)", () => {
    const { container, getByText } = render(
      <EmailHtmlIframe html="<p>x</p>" emailId="abc123" hasBlockedImages />,
    );
    fireEvent.click(getByText(/Bilder laden/i));
    const iframe = container.querySelector("iframe");
    expect(iframe?.getAttribute("src")).toBe("/api/emails/abc123/body");
    expect(iframe?.getAttribute("sandbox")).toBe("allow-same-origin");
    // Banner ist nach dem Laden weg.
    expect(container.textContent).not.toMatch(/Bilder laden/i);
  });
});
