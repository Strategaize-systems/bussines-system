import { describe, it, expect } from "vitest";
import {
  isViewToggleActive,
  findViewToggleMode,
  type ViewToggleMode,
} from "./view-toggle";
import { LayoutGrid, List, MapPin, Kanban, BarChart3, PieChart } from "lucide-react";

// 2-Modi-Pattern (Kontakte/Companies/Multiplikatoren ohne Map als 2-Mode-Subset)
type SimpleMode = "grid" | "list";
const SIMPLE_MODES: ReadonlyArray<ViewToggleMode<SimpleMode>> = [
  { value: "grid", icon: LayoutGrid, label: "Karten" },
  { value: "list", icon: List, label: "Liste" },
];

// 3-Modi-Pattern (Kontakte/Companies/Multiplikatoren — grid+list+karte)
type ContactsMode = "grid" | "list" | "karte";
const CONTACTS_MODES: ReadonlyArray<ViewToggleMode<ContactsMode>> = [
  { value: "grid", icon: LayoutGrid, label: "Karten-Ansicht" },
  { value: "list", icon: List, label: "Listen-Ansicht" },
  { value: "karte", icon: MapPin, label: "Karten-Ansicht (Map)" },
];

// 4-Modi-Pattern (Pipeline)
type PipelineMode = "kanban" | "list" | "funnel" | "winloss";
const PIPELINE_MODES: ReadonlyArray<ViewToggleMode<PipelineMode>> = [
  { value: "kanban", icon: Kanban, label: "Kanban-Ansicht" },
  { value: "list", icon: List, label: "Listen-Ansicht" },
  { value: "funnel", icon: BarChart3, label: "Funnel-Report" },
  { value: "winloss", icon: PieChart, label: "Win/Loss-Analyse" },
];

describe("isViewToggleActive — 2-Modi", () => {
  it("returns true when active matches candidate", () => {
    expect(isViewToggleActive<SimpleMode>("grid", "grid")).toBe(true);
    expect(isViewToggleActive<SimpleMode>("list", "list")).toBe(true);
  });

  it("returns false when active differs from candidate", () => {
    expect(isViewToggleActive<SimpleMode>("grid", "list")).toBe(false);
    expect(isViewToggleActive<SimpleMode>("list", "grid")).toBe(false);
  });
});

describe("isViewToggleActive — 4-Modi (Pipeline)", () => {
  it("returns true for active mode across all 4 entries", () => {
    expect(isViewToggleActive<PipelineMode>("kanban", "kanban")).toBe(true);
    expect(isViewToggleActive<PipelineMode>("list", "list")).toBe(true);
    expect(isViewToggleActive<PipelineMode>("funnel", "funnel")).toBe(true);
    expect(isViewToggleActive<PipelineMode>("winloss", "winloss")).toBe(true);
  });

  it("returns false for non-active modes", () => {
    expect(isViewToggleActive<PipelineMode>("kanban", "list")).toBe(false);
    expect(isViewToggleActive<PipelineMode>("kanban", "funnel")).toBe(false);
    expect(isViewToggleActive<PipelineMode>("winloss", "kanban")).toBe(false);
  });
});

describe("findViewToggleMode — 2-Modi", () => {
  it("finds grid mode by value", () => {
    const result = findViewToggleMode<SimpleMode>(SIMPLE_MODES, "grid");
    expect(result).not.toBeNull();
    expect(result?.value).toBe("grid");
    expect(result?.label).toBe("Karten");
  });

  it("returns null for unknown value", () => {
    expect(findViewToggleMode<SimpleMode>(SIMPLE_MODES, "unknown")).toBeNull();
  });
});

describe("findViewToggleMode — 4-Modi (Pipeline)", () => {
  it("finds each mode by value", () => {
    expect(findViewToggleMode<PipelineMode>(PIPELINE_MODES, "kanban")?.label).toBe("Kanban-Ansicht");
    expect(findViewToggleMode<PipelineMode>(PIPELINE_MODES, "funnel")?.label).toBe("Funnel-Report");
    expect(findViewToggleMode<PipelineMode>(PIPELINE_MODES, "winloss")?.label).toBe("Win/Loss-Analyse");
  });

  it("returns null for invalid value", () => {
    expect(findViewToggleMode<PipelineMode>(PIPELINE_MODES, "kanban-typo")).toBeNull();
    expect(findViewToggleMode<PipelineMode>(PIPELINE_MODES, "")).toBeNull();
  });
});

describe("ViewToggleMode constants — Konfigurations-Validierung", () => {
  it("CONTACTS_MODES hat 3 Eintraege mit unique values", () => {
    expect(CONTACTS_MODES).toHaveLength(3);
    const values = CONTACTS_MODES.map((m) => m.value);
    expect(new Set(values).size).toBe(3);
  });

  it("PIPELINE_MODES hat 4 Eintraege mit unique values", () => {
    expect(PIPELINE_MODES).toHaveLength(4);
    const values = PIPELINE_MODES.map((m) => m.value);
    expect(new Set(values).size).toBe(4);
  });

  it("alle Modes haben non-empty label + icon + value", () => {
    for (const mode of [...CONTACTS_MODES, ...PIPELINE_MODES]) {
      expect(mode.value).toBeTruthy();
      expect(mode.label.length).toBeGreaterThan(0);
      expect(mode.icon).toBeDefined();
    }
  });
});
