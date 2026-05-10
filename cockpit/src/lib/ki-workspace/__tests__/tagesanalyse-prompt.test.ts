import { describe, it, expect } from "vitest";
import {
  TAGESANALYSE_SYSTEM_PROMPT,
  buildTagesanalysePrompt,
  type TagesanalyseInput,
} from "../prompts/tagesanalyse-prompt";

const EMPTY_INPUT: TagesanalyseInput = {
  items: [],
  calendarSlots: [],
  exceptions: { stagnantDeals: [], overdueTasks: [], overdueDeals: [] },
  topDeals: [],
  activityKpis: [],
  todayLabel: "Montag, 11. Mai 2026",
};

describe("tagesanalyse system prompt", () => {
  it("requires the three mandatory section headers in fixed order", () => {
    expect(TAGESANALYSE_SYSTEM_PROMPT).toContain("## Pipeline-Bewegung heute");
    expect(TAGESANALYSE_SYSTEM_PROMPT).toContain("## Aktivitaeten-Soll-Ist");
    expect(TAGESANALYSE_SYSTEM_PROMPT).toContain("## KI-Kommentar");

    const a = TAGESANALYSE_SYSTEM_PROMPT.indexOf("## Pipeline-Bewegung heute");
    const b = TAGESANALYSE_SYSTEM_PROMPT.indexOf("## Aktivitaeten-Soll-Ist");
    const c = TAGESANALYSE_SYSTEM_PROMPT.indexOf("## KI-Kommentar");
    expect(a).toBeLessThan(b);
    expect(b).toBeLessThan(c);
  });
});

describe("buildTagesanalysePrompt — empty data", () => {
  it("renders all sections with honest empty hints, never invents data", () => {
    const out = buildTagesanalysePrompt(EMPTY_INPUT);
    expect(out).toContain("Keine offenen Eintraege fuer heute.");
    expect(out).toContain("Keine Termine heute.");
    expect(out).toContain("Keine aktiven Top-Deals.");
    expect(out).toContain("Keine Tages-Targets konfiguriert");
    expect(out).toContain("Aktuell keine Risiko-Indikatoren.");
  });

  it("includes the explicit 3-section instruction at the end", () => {
    const out = buildTagesanalysePrompt(EMPTY_INPUT);
    expect(out).toMatch(/strikt mit den drei Sektionen/);
  });
});

describe("buildTagesanalysePrompt — populated data", () => {
  it("renders today items with priority + overdue + due-date tags", () => {
    const out = buildTagesanalysePrompt({
      ...EMPTY_INPUT,
      items: [
        {
          id: "t1",
          type: "overdue_task",
          title: "Angebot Mueller nachfassen",
          subtitle: null,
          dueDate: "2026-05-09",
          priority: "high",
          isOverdue: true,
          linkHref: "/aufgaben",
          contactName: "Hans Mueller",
          companyName: "Mueller GmbH",
          dealTitle: "Mueller Implementierung",
        },
      ],
    });
    expect(out).toContain("Angebot Mueller nachfassen");
    expect(out).toContain("Prio high");
    expect(out).toContain("ueberfaellig");
    expect(out).toContain("faellig 2026-05-09");
    expect(out).toContain("Mueller GmbH / Hans Mueller / Mueller Implementierung");
  });

  it("renders top-deals with formatted EUR + stage + probability", () => {
    const out = buildTagesanalysePrompt({
      ...EMPTY_INPUT,
      topDeals: [
        {
          id: "d1",
          title: "Schmidt Ausbau",
          value: 50000,
          stage: "Verhandlung",
          probability: 60,
          weightedValue: 30000,
          nextAction: "Angebot anpassen",
          nextActionDate: "2026-05-12",
          contactName: null,
          companyName: "Schmidt KG",
        },
      ],
    });
    expect(out).toContain("Schmidt Ausbau");
    expect(out).toContain("50.000 EUR");
    expect(out).toContain("Verhandlung");
    expect(out).toContain("60%");
    expect(out).toContain("naechster Schritt: Angebot anpassen");
  });

  it("renders activity KPIs as Ist/Soll lines", () => {
    const out = buildTagesanalysePrompt({
      ...EMPTY_INPUT,
      activityKpis: [
        {
          kpiKey: "calls_made",
          label: "Telefonate",
          dailyTarget: 10,
          todayActual: 4,
          weekTarget: 50,
          weekActual: 18,
          active: true,
        },
      ],
    });
    expect(out).toContain("Telefonate: 4 / 10");
  });

  it("renders pipeline-risiko-indikatoren when present", () => {
    const out = buildTagesanalysePrompt({
      ...EMPTY_INPUT,
      exceptions: {
        stagnantDeals: [
          {
            id: "d2",
            title: "Lange-still Deal",
            daysSinceUpdate: 21,
            value: 25000,
            stage: "Angebot",
            companyName: "Stillstand AG",
          },
        ],
        overdueTasks: [],
        overdueDeals: [
          {
            id: "d3",
            title: "Versaeumter Deal",
            nextActionDate: "2026-05-08",
            nextAction: "Termin vereinbaren",
            companyName: "Verspaetung GmbH",
          },
        ],
      },
    });
    expect(out).toContain("stagniert: Lange-still Deal");
    expect(out).toContain("21 Tage ohne Update");
    expect(out).toContain("ueberfaelliger Schritt: Versaeumter Deal");
    expect(out).toContain("Termin vereinbaren");
    expect(out).toContain("seit 2026-05-08");
  });
});
