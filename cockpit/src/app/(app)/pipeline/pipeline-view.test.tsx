/**
 * V7.1 SLC-712a MT-4 — PipelineView readOnly + viewAsUserId Behavior.
 *
 * Verifiziert:
 * 1. readOnly={true} blendet "Neuer Deal"-Button aus
 * 2. readOnly={false} (Default) zeigt "Neuer Deal"-Button (Regression-Frei-Check)
 * 3. viewAsUserId postfixt Pipeline-Tab-Links auf /team/{id}/pipeline/{slug}
 *    statt /pipeline/{slug}
 *
 * KanbanBoard + Server-Action-Module muessen gemockt werden weil "use server"
 * Files in jsdom nicht evaluiert werden koennen.
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { Deal, Pipeline, PipelineStage } from "./actions";

// Server-Action-Module mocken (use-server, kann jsdom nicht ausfuehren).
vi.mock("@/app/(app)/pipeline/actions", () => ({
  moveDealToStage: vi.fn().mockResolvedValue({ error: "" }),
  createDeal: vi.fn(),
  updateDeal: vi.fn(),
  deleteDeal: vi.fn(),
  getDealWithRelations: vi.fn(),
  updateDealValue: vi.fn(),
  moveDealToPipeline: vi.fn(),
}));

vi.mock("@/app/(app)/proposals/actions", () => ({
  createProposal: vi.fn().mockResolvedValue({ ok: true, proposalId: "p1" }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

// TypeAheadSearch laedt selber Server-Actions. Stub it out.
vi.mock("@/app/(app)/deals/type-ahead-search", () => ({
  TypeAheadSearch: () => <div data-testid="type-ahead-stub" />,
}));

import { PipelineView } from "./pipeline-view";

function makePipeline(id: string, name: string, sortOrder = 1): Pipeline {
  return { id, name, description: null, sort_order: sortOrder };
}

function makeStage(id: string, pipelineId: string, name: string, sortOrder = 1): PipelineStage {
  return {
    id,
    pipeline_id: pipelineId,
    name,
    color: "#4454b8",
    sort_order: sortOrder,
    probability: 50,
  };
}

function baseProps() {
  const pipeline = makePipeline("p-multi", "Multiplikatoren", 1);
  return {
    pipeline,
    pipelines: [pipeline, makePipeline("p-uc", "Unternehmer-Chancen", 2)],
    stages: [makeStage("s1", "p-multi", "Qualifizierung", 1)],
    deals: [] as Deal[],
    contacts: [],
    companies: [],
    referrals: [],
    currentSlug: "multiplikatoren",
    campaigns: [],
    selectedCampaignId: null,
  };
}

describe("PipelineView readOnly + viewAsUserId behavior (SLC-712a)", () => {
  it("blendet den 'Neuer Deal'-Button aus, wenn readOnly=true", () => {
    render(<PipelineView {...baseProps()} readOnly />);
    expect(screen.queryByRole("button", { name: /Neuer Deal/i })).toBeNull();
  });

  it("zeigt den 'Neuer Deal'-Button im Default-Modus (readOnly=false)", () => {
    // Regression-Check: ohne readOnly muss Self-Pipeline-UX unveraendert bleiben.
    render(<PipelineView {...baseProps()} />);
    expect(screen.getByRole("button", { name: /Neuer Deal/i })).toBeInTheDocument();
  });

  it("postfixt Pipeline-Tab-Links mit /team/{viewAsUserId}/pipeline/{slug}", () => {
    render(
      <PipelineView
        {...baseProps()}
        readOnly
        viewAsUserId="user-abc-123"
      />,
    );
    const multiTab = screen.getByRole("link", { name: "Multiplikatoren" });
    expect(multiTab.getAttribute("href")).toBe("/team/user-abc-123/pipeline/multiplikatoren");
    const ucTab = screen.getByRole("link", { name: "Unternehmer-Chancen" });
    expect(ucTab.getAttribute("href")).toBe("/team/user-abc-123/pipeline/unternehmer");
  });

  it("verwendet Self-Pipeline-Path-Pattern wenn viewAsUserId nicht gesetzt", () => {
    render(<PipelineView {...baseProps()} />);
    const multiTab = screen.getByRole("link", { name: "Multiplikatoren" });
    expect(multiTab.getAttribute("href")).toBe("/pipeline/multiplikatoren");
  });
});
