import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { KIWorkspace } from "../KIWorkspace";
import { __resetCacheForTests } from "@/lib/ki-workspace/cache";
import type {
  KIWorkspaceReport,
  ReportResult,
  RunReportArgs,
} from "../types";

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
    expect(runner.mock.calls[0][0]).toEqual({ reportId: "tagesanalyse", scope: SCOPE });
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
});
