import { describe, it, expect } from "vitest";
import { pathMatchesReadOnlyDrilldown } from "./middleware";

/**
 * SLC-751 MT-2 — Pfad-Regex-Matching fuer X-Read-Only-Mode-Header.
 *
 * Tabelle aus DEC-210 V7.5-Architektur. Match = Middleware setzt Header,
 * `assertNotReadOnlyContext()` blockiert Mutate-Server-Actions im Subtree.
 */
describe("pathMatchesReadOnlyDrilldown (DEC-210)", () => {
  it("matches /team/<id>/pipeline", () => {
    expect(pathMatchesReadOnlyDrilldown("/team/abc/pipeline")).toBe(true);
  });

  it("matches /team/<id>/aufgaben/new (nested sub-path)", () => {
    expect(pathMatchesReadOnlyDrilldown("/team/abc/aufgaben/new")).toBe(true);
  });

  it("matches /team/<id>/mein-tag", () => {
    expect(pathMatchesReadOnlyDrilldown("/team/abc/mein-tag")).toBe(true);
  });

  it("does NOT match /team/ (no sub-path)", () => {
    expect(pathMatchesReadOnlyDrilldown("/team/")).toBe(false);
  });

  it("does NOT match /team (no trailing slash)", () => {
    expect(pathMatchesReadOnlyDrilldown("/team")).toBe(false);
  });

  it("does NOT match /api/cron/automation-runner", () => {
    expect(pathMatchesReadOnlyDrilldown("/api/cron/automation-runner")).toBe(false);
  });

  it("does NOT match /api/health", () => {
    expect(pathMatchesReadOnlyDrilldown("/api/health")).toBe(false);
  });

  it("does NOT match /settings/team", () => {
    expect(pathMatchesReadOnlyDrilldown("/settings/team")).toBe(false);
  });

  it("does NOT match /login", () => {
    expect(pathMatchesReadOnlyDrilldown("/login")).toBe(false);
  });
});
