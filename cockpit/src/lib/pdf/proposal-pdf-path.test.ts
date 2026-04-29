import { describe, it, expect } from "vitest";
import {
  PROPOSAL_PDF_BUCKET,
  getProposalPdfPath,
  parseProposalPdfPath,
} from "./proposal-pdf-path";

describe("PROPOSAL_PDF_BUCKET", () => {
  it("matches MIG-026 bucket id", () => {
    expect(PROPOSAL_PDF_BUCKET).toBe("proposal-pdfs");
  });
});

describe("getProposalPdfPath", () => {
  it("builds default (non-testmode) path", () => {
    expect(getProposalPdfPath("uA", "pX", 1)).toBe("uA/pX/v1.pdf");
  });

  it("builds testmode path with .testmode.pdf suffix", () => {
    expect(getProposalPdfPath("uA", "pX", 2, true)).toBe("uA/pX/v2.testmode.pdf");
  });

  it("supports higher version numbers", () => {
    expect(getProposalPdfPath("u1", "p9", 12)).toBe("u1/p9/v12.pdf");
  });

  it("throws on empty userId", () => {
    expect(() => getProposalPdfPath("", "pX", 1)).toThrow();
  });

  it("throws on empty proposalId", () => {
    expect(() => getProposalPdfPath("uA", "", 1)).toThrow();
  });

  it("throws on zero version", () => {
    expect(() => getProposalPdfPath("uA", "pX", 0)).toThrow();
  });

  it("throws on negative version", () => {
    expect(() => getProposalPdfPath("uA", "pX", -1)).toThrow();
  });

  it("throws on non-integer version", () => {
    expect(() => getProposalPdfPath("uA", "pX", 1.5)).toThrow();
  });
});

describe("parseProposalPdfPath", () => {
  it("parses default path", () => {
    expect(parseProposalPdfPath("uA/pX/v1.pdf")).toEqual({
      userId: "uA",
      proposalId: "pX",
      version: 1,
      isTestMode: false,
    });
  });

  it("parses testmode path", () => {
    expect(parseProposalPdfPath("uA/pX/v2.testmode.pdf")).toEqual({
      userId: "uA",
      proposalId: "pX",
      version: 2,
      isTestMode: true,
    });
  });

  it("returns null for empty input", () => {
    expect(parseProposalPdfPath("")).toBeNull();
  });

  it("returns null for too few segments", () => {
    expect(parseProposalPdfPath("uA/pX")).toBeNull();
  });

  it("returns null for too many segments", () => {
    expect(parseProposalPdfPath("uA/pX/sub/v1.pdf")).toBeNull();
  });

  it("returns null for malformed file (missing v-prefix)", () => {
    expect(parseProposalPdfPath("uA/pX/1.pdf")).toBeNull();
  });

  it("returns null for non-PDF extension", () => {
    expect(parseProposalPdfPath("uA/pX/v1.png")).toBeNull();
  });

  it("is inverse of getProposalPdfPath (round-trip default)", () => {
    const path = getProposalPdfPath("user-abc", "prop-123", 7);
    expect(parseProposalPdfPath(path)).toEqual({
      userId: "user-abc",
      proposalId: "prop-123",
      version: 7,
      isTestMode: false,
    });
  });

  it("is inverse of getProposalPdfPath (round-trip testmode)", () => {
    const path = getProposalPdfPath("user-abc", "prop-123", 7, true);
    expect(parseProposalPdfPath(path)).toEqual({
      userId: "user-abc",
      proposalId: "prop-123",
      version: 7,
      isTestMode: true,
    });
  });
});
