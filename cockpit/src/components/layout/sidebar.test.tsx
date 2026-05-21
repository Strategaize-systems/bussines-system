import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Sidebar, isItemActive } from "./sidebar";

vi.mock("next/navigation", () => ({
  usePathname: () => "/mein-tag",
}));

vi.mock("@/app/(auth)/login/actions", () => ({
  signout: vi.fn(),
}));

describe("isItemActive — pure logic", () => {
  it("exact match returns true", () => {
    expect(isItemActive("/mein-tag", "/mein-tag")).toBe(true);
  });

  it("prefix match with / returns true", () => {
    expect(isItemActive("/deals/123", "/deals")).toBe(true);
  });

  it("prefix match with ? returns true", () => {
    expect(isItemActive("/deals?status=open", "/deals")).toBe(true);
  });

  it("/dashboard does not match prefix-only", () => {
    expect(isItemActive("/dashboard-something", "/dashboard")).toBe(false);
  });

  it("non-prefix returns false", () => {
    expect(isItemActive("/deals", "/companies")).toBe(false);
  });
});

describe("Sidebar — role-based render", () => {
  it("admin sees Dashboard + Team-Cockpit + WERKZEUGE-items (non-collapsed sections)", () => {
    render(<Sidebar role="admin" />);
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Team-Cockpit")).toBeInTheDocument();
    expect(screen.getByText("Team-Verwaltung")).toBeInTheDocument();
    // VERWALTUNG section header rendered, _MEIN items collapsed by default
    expect(screen.getByText("VERWALTUNG")).toBeInTheDocument();
    expect(screen.queryByText("Aufgaben")).toBeNull(); // VERWALTUNG default collapsed
    // SLC-822 (DEC-228): WERKZEUGE ist eigene Top-Section, NICHT collapsible
    // → Audit-Log + Handoffs sind fuer Admin direkt sichtbar
    expect(screen.getByText("WERKZEUGE")).toBeInTheDocument();
    expect(screen.getByText("Audit-Log")).toBeInTheDocument();
    expect(screen.getByText("Handoffs")).toBeInTheDocument();
  });

  it("teamlead sees TEAM-section + WERKZEUGE without Audit-Log (admin-only)", () => {
    render(<Sidebar role="teamlead" />);
    expect(screen.getByText("Team-Cockpit")).toBeInTheDocument();
    // SLC-822: WERKZEUGE-Section ist eigene Top-Section (nicht collapsible)
    expect(screen.getByText("WERKZEUGE")).toBeInTheDocument();
    expect(screen.getByText("Handoffs")).toBeInTheDocument();
    expect(screen.getByText("Referrals")).toBeInTheDocument();
    // /audit-log ist admin-only → Teamlead sieht es nicht
    expect(screen.queryByText("Audit-Log")).toBeNull();
  });

  it("member sees no Dashboard / no Team / no Automatisierung / no Audit-Log", () => {
    render(<Sidebar role="member" />);
    expect(screen.queryByText("Dashboard")).toBeNull();
    expect(screen.queryByText("Team-Cockpit")).toBeNull();
    expect(screen.queryByText("Team-Verwaltung")).toBeNull();
    expect(screen.queryByText("Handoffs")).toBeNull();
    expect(screen.queryByText("Referrals")).toBeNull();
    expect(screen.queryByText("Ziele")).toBeNull();
    expect(screen.queryByText("Automatisierung")).toBeNull();
    expect(screen.queryByText("Produkte")).toBeNull();
    expect(screen.queryByText("Audit-Log")).toBeNull();
  });

  it("member still sees core operative items (OPERATIV + ARBEITSBEREICHE always-open)", () => {
    render(<Sidebar role="member" />);
    expect(screen.getByText("Mein Tag")).toBeInTheDocument();
    expect(screen.getByText("Focus")).toBeInTheDocument();
    expect(screen.getByText("Kalender")).toBeInTheDocument();
    expect(screen.getByText("Deals")).toBeInTheDocument();
    expect(screen.getByText("Pipeline")).toBeInTheDocument();
    expect(screen.getByText("Firmen")).toBeInTheDocument();
    expect(screen.getByText("Kontakte")).toBeInTheDocument();
    expect(screen.getByText("Multiplikatoren")).toBeInTheDocument();
  });

  it("member: VERWALTUNG-section header rendered, items hidden by default", () => {
    render(<Sidebar role="member" />);
    expect(screen.getByText("VERWALTUNG")).toBeInTheDocument();
    // Default collapsed → items not in DOM
    expect(screen.queryByText("Aufgaben")).toBeNull();
    expect(screen.queryByText("E-Mails")).toBeNull();
    expect(screen.queryByText("Proposals")).toBeNull();
    expect(screen.queryByText("Settings")).toBeNull();
  });

  it("renders ANALYSE section header for admin but not for member", () => {
    const { unmount } = render(<Sidebar role="admin" />);
    expect(screen.queryByText("ANALYSE")).toBeInTheDocument();
    unmount();
    render(<Sidebar role="member" />);
    expect(screen.queryByText("ANALYSE")).toBeNull();
  });

  it("renders TEAM section header for teamlead but not for member", () => {
    const { unmount } = render(<Sidebar role="teamlead" />);
    expect(screen.queryByText("TEAM")).toBeInTheDocument();
    unmount();
    render(<Sidebar role="member" />);
    expect(screen.queryByText("TEAM")).toBeNull();
  });

  it("data-role attribute reflects the role prop", () => {
    const { container } = render(<Sidebar role="member" />);
    const aside = container.querySelector("[data-testid='sidebar']");
    expect(aside?.getAttribute("data-role")).toBe("member");
  });

  it("VERWALTUNG-Expand zeigt _MEIN-Items; WERKZEUGE bleibt eigene Top-Section (SLC-822)", () => {
    // SLC-822 (DEC-228): Audit-Log + Handoffs + Referrals sind in WERKZEUGE
    // (eigene Top-Section, nicht collapsible). VERWALTUNG enthaelt nur noch
    // _MEIN-Items und ist weiterhin collapsible.
    const { unmount } = render(<Sidebar role="admin" />);
    // WERKZEUGE-Items sind direkt sichtbar (kein Click noetig)
    expect(screen.getByText("Audit-Log")).toBeInTheDocument();
    expect(screen.getByText("Handoffs")).toBeInTheDocument();
    // VERWALTUNG-Expand zeigt _MEIN-Items
    const adminVerwBtn = screen.getByRole("button", { name: /VERWALTUNG/i });
    fireEvent.click(adminVerwBtn);
    expect(screen.getByText("Aufgaben")).toBeInTheDocument();
    expect(screen.getByText("Settings")).toBeInTheDocument();
    unmount();

    render(<Sidebar role="member" />);
    // Member sieht keine WERKZEUGE-Section
    expect(screen.queryByText("WERKZEUGE")).toBeNull();
    expect(screen.queryByText("Audit-Log")).toBeNull();
    expect(screen.queryByText("Handoffs")).toBeNull();
    // VERWALTUNG-Expand zeigt nur _MEIN-Items fuer Member
    const memberVerwBtn = screen.getByRole("button", { name: /VERWALTUNG/i });
    fireEvent.click(memberVerwBtn);
    expect(screen.getByText("Aufgaben")).toBeInTheDocument();
    expect(screen.getByText("Settings")).toBeInTheDocument();
  });
});
