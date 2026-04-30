// V5.5 SLC-554: Unit-Tests fuer Status-Transition-Whitelist.
// AC1+AC2: Whitelist-Pruefung + Idempotenz-Vorbereitung.

import { describe, expect, it } from "vitest";
import {
  ALLOWED_TRANSITIONS,
  isValidTransition,
  type ProposalStatus,
} from "./transitions";

describe("ALLOWED_TRANSITIONS", () => {
  it("listet exakt die V5.5 Status-Keys", () => {
    expect(Object.keys(ALLOWED_TRANSITIONS).sort()).toEqual([
      "accepted",
      "draft",
      "expired",
      "rejected",
      "sent",
    ]);
  });

  it("draft erlaubt nur sent", () => {
    expect(ALLOWED_TRANSITIONS.draft).toEqual(["sent"]);
  });

  it("sent erlaubt accepted, rejected, expired", () => {
    expect(ALLOWED_TRANSITIONS.sent.sort()).toEqual([
      "accepted",
      "expired",
      "rejected",
    ]);
  });

  it("accepted/rejected/expired sind terminal (keine weiteren Transitions)", () => {
    expect(ALLOWED_TRANSITIONS.accepted).toEqual([]);
    expect(ALLOWED_TRANSITIONS.rejected).toEqual([]);
    expect(ALLOWED_TRANSITIONS.expired).toEqual([]);
  });
});

describe("isValidTransition (erlaubte Pfade)", () => {
  const valid: Array<[ProposalStatus, ProposalStatus]> = [
    ["draft", "sent"],
    ["sent", "accepted"],
    ["sent", "rejected"],
    ["sent", "expired"],
  ];

  it.each(valid)("%s → %s ist erlaubt", (from, to) => {
    expect(isValidTransition(from, to)).toBe(true);
  });
});

describe("isValidTransition (verbotene Pfade)", () => {
  const invalid: Array<[string, string]> = [
    // Kein Direktsprung an sent vorbei
    ["draft", "accepted"],
    ["draft", "rejected"],
    ["draft", "expired"],
    // Kein Reverse
    ["sent", "draft"],
    ["accepted", "draft"],
    ["accepted", "sent"],
    ["rejected", "sent"],
    ["expired", "sent"],
    // Kein Cross-Transition zwischen Terminal-Status
    ["accepted", "rejected"],
    ["rejected", "accepted"],
    ["expired", "accepted"],
  ];

  it.each(invalid)("%s → %s wird abgelehnt", (from, to) => {
    expect(isValidTransition(from, to)).toBe(false);
  });
});

describe("isValidTransition (Legacy-Status)", () => {
  // V2-Status (open/negotiation/won/lost) sind in DB vorhanden, aber nicht
  // in der V5.5-Whitelist — sie blockieren neue Lifecycle-Transitions.
  it("legacy from-status liefert immer false", () => {
    expect(isValidTransition("open", "sent")).toBe(false);
    expect(isValidTransition("negotiation", "accepted")).toBe(false);
    expect(isValidTransition("won", "draft")).toBe(false);
    expect(isValidTransition("lost", "draft")).toBe(false);
  });
});

describe("isValidTransition (Idempotenz-Pre-Check)", () => {
  // Idempotenz wird in der Server-Action selbst gehandhabt, NICHT in
  // isValidTransition — `draft → draft` ist NICHT eine erlaubte Transition,
  // sondern wird ueber den Idempotenz-Branch (current === new → No-op) gefangen.
  it("identische Status sind keine valide Transition", () => {
    expect(isValidTransition("draft", "draft")).toBe(false);
    expect(isValidTransition("sent", "sent")).toBe(false);
    expect(isValidTransition("accepted", "accepted")).toBe(false);
  });
});
