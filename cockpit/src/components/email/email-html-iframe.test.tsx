// EmailHtmlIframe — Defense-in-Depth Sandbox-Layer fuer Email-HTML-Rendering.
// Pattern P-079, siehe dev-system/docs/PATTERN_LIBRARY/11-html-sanitization.md.

import { render } from "@testing-library/react";
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
