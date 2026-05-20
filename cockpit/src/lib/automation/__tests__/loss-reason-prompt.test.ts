// V8 SLC-813 MT-1 — Prompt-Builder Tests.

import { describe, it, expect } from "vitest";
import {
  buildLossReasonPrompt,
  LOSS_REASON_SYSTEM_PROMPT,
  type LossReasonActivity,
  type LossReasonEmail,
} from "../loss-reason-prompt";

const DEAL = {
  title: "ACME Coaching-Programm",
  value: 12000,
  current_stage: "Verhandlung / Einwände",
};

const ACTIVITIES: LossReasonActivity[] = [
  { type: "call", title: "Preis-Diskussion", created_at: "2026-05-15T10:00:00Z" },
  { type: "email", title: "Angebot v2", created_at: "2026-05-12T09:30:00Z" },
  { type: "meeting", title: "Discovery-Call", created_at: "2026-05-10T14:00:00Z" },
];

const EMAILS: LossReasonEmail[] = [
  {
    from_email: "kunde@acme.de",
    subject: "Re: Angebot v2",
    snippet: "Wir haben uns intern fuer einen Wettbewerber entschieden, war ein knappes Rennen.",
    received_at: "2026-05-16T11:00:00Z",
  },
];

describe("buildLossReasonPrompt — V8 SLC-813 MT-1", () => {
  it("rendert kompletten User-Prompt mit Deal + Activities + Emails", () => {
    const prompt = buildLossReasonPrompt(DEAL, ACTIVITIES, EMAILS);
    expect(prompt).toContain("ACME Coaching-Programm");
    expect(prompt).toContain("Wert: 12000 EUR");
    expect(prompt).toContain("Verhandlung / Einwände");
    expect(prompt).toContain("Preis-Diskussion");
    expect(prompt).toContain("kunde@acme.de");
    expect(prompt).toContain("Re: Angebot v2");
    expect(prompt).toContain("Antwort als JSON:");
  });

  it("rendert Fallback-Hinweis bei leerer Activity-History", () => {
    const prompt = buildLossReasonPrompt(DEAL, [], EMAILS);
    expect(prompt).toContain("(keine Activities in den letzten 10 Eintraegen)");
  });

  it("rendert Fallback-Hinweis bei leerer E-Mail-History", () => {
    const prompt = buildLossReasonPrompt(DEAL, ACTIVITIES, []);
    expect(prompt).toContain("(keine E-Mails in den letzten 3 Threads)");
  });

  it("rendert 'Wert: nicht erfasst' wenn deal.value null ist", () => {
    const prompt = buildLossReasonPrompt(
      { title: "Deal X", value: null, current_stage: "Verloren" },
      [],
      []
    );
    expect(prompt).toContain("Wert: nicht erfasst");
    expect(prompt).not.toContain("Wert: null");
  });

  it("kuerzt E-Mail-Snippets auf 200 Zeichen + Ellipsis", () => {
    const longSnippet = "a".repeat(300);
    const prompt = buildLossReasonPrompt(DEAL, [], [
      {
        from_email: "x@y.de",
        subject: "Long",
        snippet: longSnippet,
        received_at: "2026-05-16T11:00:00Z",
      },
    ]);
    expect(prompt).toContain(`${"a".repeat(200)}…`);
    expect(prompt).not.toContain("a".repeat(201));
  });

  it("System-Prompt enthaelt strict-JSON-Direktive + 1-3-Vorschlaege-Bound", () => {
    expect(LOSS_REASON_SYSTEM_PROMPT).toContain("JSON-Objekt");
    expect(LOSS_REASON_SYSTEM_PROMPT).toContain("1 bis 3 Vorschlaege");
    expect(LOSS_REASON_SYSTEM_PROMPT).toContain("Kein klarer Verlustgrund");
    expect(LOSS_REASON_SYSTEM_PROMPT).toContain("Code-Fences");
  });
});
