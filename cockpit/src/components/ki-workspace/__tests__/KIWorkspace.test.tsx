import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";

// V7.6 SLC-761 MT-2 — NLBuilderInline-Mock (Inline-Komponente macht echte
// Server-Action-Imports, die hier irrelevant sind). Wir stuben sie auf
// einen DOM-Marker, damit Mode-Switch-Tests deterministisch sind.
vi.mock("../nl-builder-inline", () => ({
  NLBuilderInline: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="nl-builder-inline-mock">
      <button onClick={onClose} data-testid="nl-builder-inline-close">close</button>
    </div>
  ),
}));

// V7.6 SLC-763 — Mock SaveCustomReportModal damit die Tests deterministisch
// bleiben (echtes Modal nutzt eine echte Server-Action).
vi.mock("../save-custom-report-modal", () => ({
  SaveCustomReportModal: ({ open }: { open: boolean }) =>
    open ? <div data-testid="save-custom-report-modal-mock">save-modal</div> : null,
}));

// MeineBerichteDropdown bleibt unmocked — Wire-Up testen wir end-to-end im
// Workspace, Server-Action-Calls werden im dropdown-Test selbst gemockt.
vi.mock("@/lib/custom-reports/actions/rename", () => ({
  renameCustomReport: vi.fn(),
}));
vi.mock("@/lib/custom-reports/actions/delete", () => ({
  deleteCustomReport: vi.fn(),
}));

import { KIWorkspace } from "../KIWorkspace";
import { __resetCacheForTests } from "@/lib/ki-workspace/cache";
import type {
  KIWorkspaceReport,
  ReportResult,
  RunReportArgs,
} from "../types";
import type { CustomReportRow } from "@/lib/custom-reports/types";

function makeCustomReportRow(name: string, idx: number): CustomReportRow {
  return {
    id: `crep-${idx}`,
    owner_user_id: "u1",
    context_type: "mein-tag",
    name,
    prompt_template: "Frage?",
    description: null,
    last_used_at: null,
    usage_count: 0,
    created_at: "2026-05-19T10:00:00Z",
    updated_at: "2026-05-19T10:00:00Z",
  };
}

const REPORTS: KIWorkspaceReport[] = [
  {
    id: "tagesanalyse",
    label: "Tagesanalyse",
    serverActionPath: "@/lib/ki-workspace/reports/_mock",
    cacheable: true,
  },
  {
    id: "gestern",
    label: "Gestern",
    serverActionPath: "@/lib/ki-workspace/reports/_mock",
    cacheable: true,
  },
];

// V7.6 SLC-761 MT-2 — Variante mit 6. Eintrag "nl-builder" fuer Mode-Switch-Tests.
const REPORTS_WITH_NL_BUILDER: KIWorkspaceReport[] = [
  ...REPORTS,
  { id: "nl-builder", label: "Workflow bauen", serverActionPath: "", cacheable: false },
];

const SCOPE = { userId: "u1" };

class MockMediaRecorder {
  state: "inactive" | "recording" = "inactive";
  ondataavailable: ((e: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  static isTypeSupported(): boolean {
    return true;
  }
  constructor(_stream: MediaStream, _opts?: object) {}
  start() {
    this.state = "recording";
  }
  stop() {
    this.state = "inactive";
    this.ondataavailable?.({ data: new Blob(["a"], { type: "audio/webm" }) });
    this.onstop?.();
  }
}

class MockMediaStream {
  getTracks() {
    return [{ stop: vi.fn() }];
  }
}

beforeEach(() => {
  __resetCacheForTests();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function makeResult(suffix: string): ReportResult {
  return {
    markdown: `# ${suffix}`,
    completedAt: "2026-05-10T08:00:00Z",
    model: "test",
    refreshable: true,
  };
}

describe("KIWorkspace", () => {
  it("renders all report buttons + input + answer pane", () => {
    const loadRunner = async () => async () => makeResult("never");
    render(
      <KIWorkspace
        context="mein-tag"
        reports={REPORTS}
        scope={SCOPE}
        voiceEnabled={true}
        loadRunner={loadRunner}
      />,
    );
    expect(screen.getByTestId("ki-workspace")).toHaveAttribute("data-context", "mein-tag");
    expect(screen.getByTestId("ki-workspace-report-tagesanalyse")).toHaveTextContent("Tagesanalyse");
    expect(screen.getByTestId("ki-workspace-report-gestern")).toHaveTextContent("Gestern");
    expect(screen.getByTestId("ki-workspace-input")).toBeInTheDocument();
    expect(screen.getByTestId("ki-workspace-voice-button")).toBeInTheDocument();
    expect(screen.getByTestId("ki-workspace-answer-pane")).toBeInTheDocument();
  });

  it("clicking a report-button triggers run and renders the result", async () => {
    const runner = vi.fn(async (_args: RunReportArgs) => makeResult("button-result"));
    const loadRunner = async () => runner;
    render(
      <KIWorkspace
        context="mein-tag"
        reports={REPORTS}
        scope={SCOPE}
        voiceEnabled={false}
        loadRunner={loadRunner}
      />,
    );

    await act(async () => {
      fireEvent.click(screen.getByTestId("ki-workspace-report-tagesanalyse"));
    });

    expect(runner).toHaveBeenCalledTimes(1);
    // V8.7-A SLC-871 MT-6b — KIWorkspace forwards softCapReached +
    // workspaceSessionId + question (alle optional). objectContaining
    // bleibt robust gegen kuenftige additive Args.
    expect(runner.mock.calls[0][0]).toEqual(
      expect.objectContaining({ reportId: "tagesanalyse", scope: SCOPE })
    );
    await waitFor(() => {
      expect(screen.getByTestId("ki-workspace-result")).toHaveTextContent("button-result");
    });
  });

  it("voice-button toggles recording state and writes transcript to input", async () => {
    Object.defineProperty(global.navigator, "mediaDevices", {
      configurable: true,
      value: { getUserMedia: async () => new MockMediaStream() as unknown as MediaStream },
    });
    vi.stubGlobal("MediaRecorder", MockMediaRecorder);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(JSON.stringify({ text: "diktierter Text" }), { status: 200 }),
      ),
    );

    render(
      <KIWorkspace
        context="mein-tag"
        reports={REPORTS}
        scope={SCOPE}
        voiceEnabled={true}
      />,
    );
    const voiceBtn = screen.getByTestId("ki-workspace-voice-button");
    expect(voiceBtn).toHaveAttribute("aria-pressed", "false");

    await act(async () => {
      fireEvent.click(voiceBtn);
    });
    expect(voiceBtn).toHaveAttribute("aria-pressed", "true");

    await act(async () => {
      fireEvent.click(voiceBtn);
    });
    await waitFor(() => {
      expect(voiceBtn).toHaveAttribute("aria-pressed", "false");
    });
    expect((screen.getByTestId("ki-workspace-input") as HTMLInputElement).value).toBe(
      "diktierter Text",
    );
  });

  it("refresh-button bypasses cache (calls runner twice for same report)", async () => {
    let count = 0;
    const runner = vi.fn(async (_args: RunReportArgs) => {
      count += 1;
      return makeResult(`run-${count}`);
    });
    render(
      <KIWorkspace
        context="mein-tag"
        reports={REPORTS}
        scope={SCOPE}
        voiceEnabled={false}
        loadRunner={async () => runner}
      />,
    );

    await act(async () => {
      fireEvent.click(screen.getByTestId("ki-workspace-report-tagesanalyse"));
    });
    await waitFor(() => {
      expect(screen.getByTestId("ki-workspace-result")).toHaveTextContent("run-1");
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId("ki-workspace-refresh-button"));
    });

    expect(runner).toHaveBeenCalledTimes(2);
    await waitFor(() => {
      expect(screen.getByTestId("ki-workspace-result")).toHaveTextContent("run-2");
    });
  });

  it("mobile-friendly: report-buttons row uses overflow-x-auto", () => {
    render(
      <KIWorkspace
        context="cockpit"
        reports={REPORTS}
        scope={SCOPE}
        voiceEnabled={false}
        loadRunner={async () => async () => makeResult("x")}
      />,
    );
    const row = screen.getByTestId("ki-workspace-report-buttons");
    expect(row.className).toMatch(/overflow-x-auto/);
  });

  // V7.6 SLC-761 MT-2 — Mode-Switch Tests fuer den 6. Eintrag "nl-builder".
  describe("V7.6 NL-Builder mode-switch", () => {
    it("clicking 'nl-builder' button does NOT call reportRunner and renders NLBuilderInline", async () => {
      const runner = vi.fn(async (_args: RunReportArgs) => makeResult("never"));
      render(
        <KIWorkspace
          context="mein-tag"
          reports={REPORTS_WITH_NL_BUILDER}
          scope={SCOPE}
          voiceEnabled={false}
          loadRunner={async () => runner}
        />,
      );

      const ws = screen.getByTestId("ki-workspace");
      expect(ws.getAttribute("data-mode")).toBe("report");

      await act(async () => {
        fireEvent.click(screen.getByTestId("ki-workspace-report-nl-builder"));
      });

      expect(runner).not.toHaveBeenCalled();
      expect(ws.getAttribute("data-mode")).toBe("nl-builder");
      expect(screen.getByTestId("nl-builder-inline-mock")).toBeInTheDocument();
      expect(screen.queryByTestId("ki-workspace-answer-pane")).not.toBeInTheDocument();
    });

    it("input-bar is disabled with hint placeholder in nl-builder mode", async () => {
      render(
        <KIWorkspace
          context="mein-tag"
          reports={REPORTS_WITH_NL_BUILDER}
          scope={SCOPE}
          voiceEnabled={true}
          loadRunner={async () => async () => makeResult("x")}
        />,
      );
      const input = screen.getByTestId("ki-workspace-input") as HTMLInputElement;
      const sendBtn = screen.getByTestId("ki-workspace-send-button") as HTMLButtonElement;
      const voiceBtn = screen.getByTestId("ki-workspace-voice-button") as HTMLButtonElement;

      expect(input.disabled).toBe(false);
      expect(input.placeholder).toBe("Frage stellen ...");

      await act(async () => {
        fireEvent.click(screen.getByTestId("ki-workspace-report-nl-builder"));
      });

      expect(input.disabled).toBe(true);
      expect(input.placeholder).toMatch(/Workflow-Modus aktiv/);
      expect(voiceBtn.disabled).toBe(true);
      expect(sendBtn.disabled).toBe(true);
    });

    it("clicking a regular report button after nl-builder returns to report mode and calls runner", async () => {
      const runner = vi.fn(async (_args: RunReportArgs) => makeResult("re-entered"));
      render(
        <KIWorkspace
          context="mein-tag"
          reports={REPORTS_WITH_NL_BUILDER}
          scope={SCOPE}
          voiceEnabled={false}
          loadRunner={async () => runner}
        />,
      );

      await act(async () => {
        fireEvent.click(screen.getByTestId("ki-workspace-report-nl-builder"));
      });
      expect(screen.getByTestId("ki-workspace").getAttribute("data-mode")).toBe("nl-builder");

      await act(async () => {
        fireEvent.click(screen.getByTestId("ki-workspace-report-tagesanalyse"));
      });

      expect(runner).toHaveBeenCalledTimes(1);
      expect(screen.getByTestId("ki-workspace").getAttribute("data-mode")).toBe("report");
      await waitFor(() => {
        expect(screen.getByTestId("ki-workspace-result")).toHaveTextContent("re-entered");
      });
      expect(screen.queryByTestId("nl-builder-inline-mock")).not.toBeInTheDocument();
    });

    it("NLBuilderInline onClose returns workspace to report mode", async () => {
      render(
        <KIWorkspace
          context="mein-tag"
          reports={REPORTS_WITH_NL_BUILDER}
          scope={SCOPE}
          voiceEnabled={false}
          loadRunner={async () => async () => makeResult("x")}
        />,
      );

      await act(async () => {
        fireEvent.click(screen.getByTestId("ki-workspace-report-nl-builder"));
      });
      expect(screen.getByTestId("ki-workspace").getAttribute("data-mode")).toBe("nl-builder");

      await act(async () => {
        fireEvent.click(screen.getByTestId("nl-builder-inline-close"));
      });
      expect(screen.getByTestId("ki-workspace").getAttribute("data-mode")).toBe("report");
      expect(screen.getByTestId("ki-workspace-answer-pane")).toBeInTheDocument();
    });
  });

  // V7.6 SLC-763 — Custom-Reports-Wire-Up Tests.
  describe("V7.6 SLC-763 Custom-Reports wire-up", () => {
    it("does NOT render Meine-Berichte-Dropdown when customReports prop is missing", () => {
      const loadRunner = async () => async () => makeResult("never");
      render(
        <KIWorkspace
          context="mein-tag"
          reports={REPORTS}
          scope={SCOPE}
          voiceEnabled={false}
          loadRunner={loadRunner}
        />,
      );
      expect(screen.queryByTestId("meine-berichte-dropdown")).toBeNull();
    });

    it("renders Meine-Berichte-Dropdown with empty state when customReports=[]", () => {
      render(
        <KIWorkspace
          context="mein-tag"
          reports={REPORTS}
          scope={SCOPE}
          voiceEnabled={false}
          loadRunner={async () => async () => makeResult("never")}
          customReports={[]}
          customReportContextType="mein-tag"
        />,
      );
      const dropdown = screen.getByTestId("meine-berichte-dropdown");
      expect(dropdown).toBeInTheDocument();
      fireEvent.click(screen.getByTestId("meine-berichte-trigger"));
      expect(screen.getByTestId("meine-berichte-empty")).toBeInTheDocument();
    });

    it("clicking a custom-report item calls loadRunner with '__custom__' path and reportId 'custom-<id>'", async () => {
      const customRunner = vi.fn(async (_args: RunReportArgs) =>
        makeResult("custom-1-result"),
      );
      const loadRunner = vi.fn(async (path: string) => {
        if (path === "__custom__") return customRunner;
        return async () => makeResult("standard");
      });
      const customReports = [makeCustomReportRow("Mein erster Bericht", 1)];

      render(
        <KIWorkspace
          context="mein-tag"
          reports={REPORTS}
          scope={SCOPE}
          voiceEnabled={false}
          loadRunner={loadRunner}
          customReports={customReports}
          customReportContextType="mein-tag"
        />,
      );

      fireEvent.click(screen.getByTestId("meine-berichte-trigger"));
      await act(async () => {
        fireEvent.click(screen.getByTestId("meine-berichte-item-select-crep-1"));
      });

      expect(loadRunner).toHaveBeenCalledWith("__custom__");
      expect(customRunner).toHaveBeenCalledTimes(1);
      expect(customRunner.mock.calls[0][0].reportId).toBe("custom-crep-1");
      await waitFor(() => {
        expect(screen.getByTestId("ki-workspace-result")).toHaveTextContent(
          "custom-1-result",
        );
      });
    });

    it("Save-as-Report button is hidden before any free-form question is asked", () => {
      render(
        <KIWorkspace
          context="mein-tag"
          reports={REPORTS}
          scope={SCOPE}
          voiceEnabled={false}
          loadRunner={async () => async () => makeResult("never")}
          customReports={[]}
          customReportContextType="mein-tag"
        />,
      );
      expect(screen.queryByTestId("answer-pane-save-as-report")).toBeNull();
    });

    it("Save-as-Report button is hidden after Standard-Bericht click (DEC-216)", async () => {
      const runner = async () => makeResult("standard-result");
      render(
        <KIWorkspace
          context="mein-tag"
          reports={REPORTS}
          scope={SCOPE}
          voiceEnabled={false}
          loadRunner={async () => runner}
          customReports={[]}
          customReportContextType="mein-tag"
        />,
      );
      await act(async () => {
        fireEvent.click(screen.getByTestId("ki-workspace-report-tagesanalyse"));
      });
      await waitFor(() => {
        expect(screen.getByTestId("ki-workspace-result")).toHaveTextContent(
          "standard-result",
        );
      });
      // selectedReport.id === "tagesanalyse" → kein Save-Button.
      expect(screen.queryByTestId("answer-pane-save-as-report")).toBeNull();
    });

    it("Save-as-Report button is visible after Freie-Frage Send (DEC-216 happy path)", async () => {
      const runner = async () => makeResult("freie-frage-result");
      render(
        <KIWorkspace
          context="mein-tag"
          reports={REPORTS}
          scope={SCOPE}
          voiceEnabled={false}
          loadRunner={async () => runner}
          customReports={[]}
          customReportContextType="mein-tag"
        />,
      );
      const input = screen.getByTestId("ki-workspace-input");
      fireEvent.change(input, { target: { value: "Welche Deals haben keine Aktivitaet?" } });

      await act(async () => {
        fireEvent.click(screen.getByTestId("ki-workspace-send-button"));
      });
      await waitFor(() => {
        expect(screen.getByTestId("ki-workspace-result")).toHaveTextContent(
          "freie-frage-result",
        );
      });
      expect(screen.getByTestId("answer-pane-save-as-report")).toBeInTheDocument();
    });

    it("Save-as-Report button click opens the SaveCustomReportModal", async () => {
      const runner = async () => makeResult("freie-frage-result");
      render(
        <KIWorkspace
          context="mein-tag"
          reports={REPORTS}
          scope={SCOPE}
          voiceEnabled={false}
          loadRunner={async () => runner}
          customReports={[]}
          customReportContextType="mein-tag"
        />,
      );
      fireEvent.change(screen.getByTestId("ki-workspace-input"), {
        target: { value: "Freie Frage Test" },
      });
      await act(async () => {
        fireEvent.click(screen.getByTestId("ki-workspace-send-button"));
      });
      await waitFor(() => {
        expect(screen.getByTestId("answer-pane-save-as-report")).toBeInTheDocument();
      });

      expect(screen.queryByTestId("save-custom-report-modal-mock")).toBeNull();
      fireEvent.click(screen.getByTestId("answer-pane-save-as-report"));
      expect(screen.getByTestId("save-custom-report-modal-mock")).toBeInTheDocument();
    });
  });
});
