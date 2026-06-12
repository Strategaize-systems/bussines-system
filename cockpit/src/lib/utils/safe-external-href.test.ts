import { describe, it, expect } from "vitest";
import { safeExternalHref, isSafeExternalUrlInput } from "./safe-external-href";

// V8.15 SLC-913 MT-3 (ISSUE-113 + ISSUE-114): OWASP-XSS-Adversarial-Suite
// fuer den href-Scheme-Guard (AC-913-3).

describe("safeExternalHref — erlaubte URLs bleiben erhalten", () => {
  it.each([
    "https://example.com",
    "http://example.com/pfad?x=1#y",
    "HTTPS://EXAMPLE.COM",
    "mailto:info@example.com",
    "/interner/pfad",
  ])("laesst %s durch", (url) => {
    expect(safeExternalHref(url)).toBe(url);
  });

  it("prependet https:// fuer scheme-lose Hosts (R-913-4)", () => {
    expect(safeExternalHref("www.example.com")).toBe("https://www.example.com");
    expect(safeExternalHref("example.de/pfad")).toBe("https://example.de/pfad");
    expect(safeExternalHref("sub.domain.co.uk?q=1")).toBe(
      "https://sub.domain.co.uk?q=1",
    );
  });

  it("trimmt Whitespace", () => {
    expect(safeExternalHref("  https://example.com  ")).toBe(
      "https://example.com",
    );
  });
});

describe("safeExternalHref — OWASP-XSS-Payloads degradieren zu '#'", () => {
  it.each([
    "javascript:alert(1)",
    "JAVASCRIPT:alert(1)",
    "JaVaScRiPt:alert(document.cookie)",
    " javascript:alert(1)",
    "javascript\t:alert(1)",
    "java\tscript:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    "data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==",
    "vbscript:msgbox(1)",
    "file:///etc/passwd",
    "blob:https://evil.com/uuid",
    "ftp://evil.com/x",
    "//evil.com/protocol-relative",
    "jAvascript:/*-/*`/*\\`/*'/*\"/**/(alert(1))//",
    "&#106;avascript:alert(1)",
  ])("blockt %s", (payload) => {
    expect(safeExternalHref(payload)).toBe("#");
  });

  it.each([null, undefined, "", "   "])("leere Eingabe %s -> '#'", (v) => {
    expect(safeExternalHref(v as string | null | undefined)).toBe("#");
  });
});

describe("isSafeExternalUrlInput — Write-Path-Variante", () => {
  it("leere Werte sind ok (Feld optional)", () => {
    expect(isSafeExternalUrlInput(null)).toBe(true);
    expect(isSafeExternalUrlInput(undefined)).toBe(true);
    expect(isSafeExternalUrlInput("")).toBe(true);
    expect(isSafeExternalUrlInput("   ")).toBe(true);
  });

  it("akzeptiert legitime Websites inkl. scheme-los", () => {
    expect(isSafeExternalUrlInput("https://example.com")).toBe(true);
    expect(isSafeExternalUrlInput("www.example.com")).toBe(true);
  });

  it("rejected javascript:/data:-Payloads", () => {
    expect(isSafeExternalUrlInput("javascript:alert(1)")).toBe(false);
    expect(isSafeExternalUrlInput("data:text/html,x")).toBe(false);
    expect(isSafeExternalUrlInput("//evil.com")).toBe(false);
  });
});
