import { describe, it, expect } from "vitest";
import {
  sanitizeProposalFilename,
  slugifyTitle,
} from "./filename-helper";

describe("slugifyTitle", () => {
  it("ersetzt Umlaute durch ae/oe/ue/ss", () => {
    expect(slugifyTitle("Mueller & Soehne")).toBe("Mueller-Soehne");
    expect(slugifyTitle("Buehnen Aerzte ueberall")).toBe("Buehnen-Aerzte-ueberall");
    expect(slugifyTitle("Strasse")).toBe("Strasse");
  });

  it("ersetzt Sonderzeichen durch Bindestrich, kollabiert Mehrfach-Bindestriche", () => {
    expect(slugifyTitle("Mueller & Soehne / Q1")).toBe("Mueller-Soehne-Q1");
    expect(slugifyTitle("a---b")).toBe("a-b");
  });

  it("returnt leeren String bei null/undefined/leer", () => {
    expect(slugifyTitle(null)).toBe("");
    expect(slugifyTitle(undefined)).toBe("");
    expect(slugifyTitle("")).toBe("");
    expect(slugifyTitle("   ")).toBe("");
  });

  it("kuerzt auf 50 Zeichen ohne Trailing-Bindestrich", () => {
    const long = "x".repeat(80);
    const slug = slugifyTitle(long);
    expect(slug.length).toBeLessThanOrEqual(50);
    expect(slug.endsWith("-")).toBe(false);
  });
});

describe("sanitizeProposalFilename", () => {
  it("baut Default-Filename mit Title-Slug + Version", () => {
    expect(sanitizeProposalFilename("Mein Angebot", 1, false)).toBe(
      "Angebot-Mein-Angebot-V1.pdf",
    );
  });

  it("haengt .testmode.pdf an wenn isTestMode=true", () => {
    expect(sanitizeProposalFilename("Mein Angebot", 2, true)).toBe(
      "Angebot-Mein-Angebot-V2.testmode.pdf",
    );
  });

  it("nutzt 'unbenannt' bei leerem Title", () => {
    expect(sanitizeProposalFilename(null, 1, false)).toBe(
      "Angebot-unbenannt-V1.pdf",
    );
    expect(sanitizeProposalFilename("   ", 1, false)).toBe(
      "Angebot-unbenannt-V1.pdf",
    );
  });

  it("kombiniert Sanitization + Test-Mode bei Sonderzeichen-Title", () => {
    expect(
      sanitizeProposalFilename("Mueller & Soehne / Q1", 7, true),
    ).toBe("Angebot-Mueller-Soehne-Q1-V7.testmode.pdf");
  });

  it("wirft bei ungueltiger Version", () => {
    expect(() => sanitizeProposalFilename("x", 0, false)).toThrow();
    expect(() => sanitizeProposalFilename("x", -1, false)).toThrow();
    expect(() => sanitizeProposalFilename("x", 1.5, false)).toThrow();
  });
});
