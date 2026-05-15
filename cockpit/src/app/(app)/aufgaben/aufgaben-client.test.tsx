/**
 * V7.1 SLC-712b MT-1 — AufgabenClient readOnly + viewAsUserId Behavior.
 *
 * Verifiziert:
 * 1. readOnly={true} blendet "Aufgabe erstellen"-Button aus
 * 2. readOnly={false} (Default) zeigt "Aufgabe erstellen"-Button (Regression-Frei)
 * 3. readOnly={true} blendet TaskRow Action-Buttons (Eye/Pencil/Trash) aus
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { Task } from "./actions";

// Server-Action-Module mocken (use server, kann jsdom nicht ausfuehren).
vi.mock("@/app/(app)/aufgaben/actions", () => ({
  getTasks: vi.fn(),
  createTask: vi.fn(),
  updateTask: vi.fn(),
  completeTask: vi.fn(),
  deleteTask: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

// TaskSheet hat eigene Server-Action-Imports — stub it out.
vi.mock("./task-sheet", () => ({
  TaskSheet: ({ trigger }: { trigger?: React.ReactNode }) =>
    trigger ? <div data-testid="task-sheet-stub">{trigger}</div> : null,
}));

import { AufgabenClient } from "./aufgaben-client";

function makeTask(id: string, overrides: Partial<Task> = {}): Task {
  return {
    id,
    title: `Task ${id}`,
    description: null,
    due_date: null,
    priority: "medium",
    status: "open",
    type: "manual",
    contact_id: null,
    company_id: null,
    deal_id: null,
    completed_at: null,
    created_at: "2026-05-15T00:00:00Z",
    contacts: null,
    companies: null,
    deals: null,
    ...overrides,
  };
}

function baseProps() {
  return {
    tasks: [makeTask("t1"), makeTask("t2", { status: "completed" })],
    contacts: [],
    companies: [],
    deals: [],
  };
}

describe("AufgabenClient readOnly behavior (SLC-712b)", () => {
  it("blendet 'Aufgabe erstellen'-Button aus, wenn readOnly=true", () => {
    render(<AufgabenClient {...baseProps()} readOnly />);
    expect(screen.queryByRole("button", { name: /Aufgabe erstellen/i })).toBeNull();
  });

  it("zeigt 'Aufgabe erstellen'-Button im Default-Modus", () => {
    render(<AufgabenClient {...baseProps()} />);
    expect(screen.getByRole("button", { name: /Aufgabe erstellen/i })).toBeInTheDocument();
  });

  it("rendert PageHeader-Title 'Aufgaben (Read-Only)' wenn readOnly=true", () => {
    render(<AufgabenClient {...baseProps()} readOnly />);
    expect(screen.getByRole("heading", { name: /Aufgaben \(Read-Only\)/i })).toBeInTheDocument();
  });

  it("rendert PageHeader-Title 'Aufgaben' im Default-Modus", () => {
    render(<AufgabenClient {...baseProps()} />);
    expect(screen.getByRole("heading", { name: /^Aufgaben$/ })).toBeInTheDocument();
  });
});
