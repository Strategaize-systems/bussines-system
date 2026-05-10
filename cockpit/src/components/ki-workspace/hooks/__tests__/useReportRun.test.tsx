import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useReportRun } from "../useReportRun";
import { __resetCacheForTests } from "@/lib/ki-workspace/cache";
import type {
  KIWorkspaceReport,
  ReportResult,
  RunReportArgs,
} from "../../types";

const REPORT: KIWorkspaceReport = {
  id: "tagesanalyse",
  label: "Tagesanalyse",
  serverActionPath: "@/lib/ki-workspace/reports/_mock",
  cacheable: true,
};

const SCOPE = { userId: "u1" };

function makeResult(suffix: string): ReportResult {
  return {
    markdown: `# ${suffix}`,
    completedAt: "2026-05-10T08:00:00Z",
    model: "test",
    refreshable: true,
  };
}

describe("useReportRun", () => {
  beforeEach(() => {
    __resetCacheForTests();
  });

  it("cache-miss: calls runner once and stores result", async () => {
    const runner = vi.fn(async (_args: RunReportArgs) => makeResult("fresh"));
    const { result } = renderHook(() =>
      useReportRun({ loadRunner: async () => runner }),
    );

    await act(async () => {
      await result.current.run(REPORT, SCOPE);
    });

    expect(runner).toHaveBeenCalledTimes(1);
    expect(runner.mock.calls[0][0]).toEqual({ reportId: "tagesanalyse", scope: SCOPE });
    expect(result.current.result?.markdown).toBe("# fresh");
    expect(result.current.error).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it("cache-hit: skips runner on second call within TTL", async () => {
    const runner = vi.fn(async (_args: RunReportArgs) => makeResult("first"));
    const { result } = renderHook(() =>
      useReportRun({ loadRunner: async () => runner }),
    );

    await act(async () => {
      await result.current.run(REPORT, SCOPE);
    });
    await act(async () => {
      await result.current.run(REPORT, SCOPE);
    });

    expect(runner).toHaveBeenCalledTimes(1);
    expect(result.current.result?.markdown).toBe("# first");
  });

  it("bypass-cache: forces runner re-call even when cached", async () => {
    let callCount = 0;
    const runner = vi.fn(async (_args: RunReportArgs) => {
      callCount += 1;
      return makeResult(`call-${callCount}`);
    });
    const { result } = renderHook(() =>
      useReportRun({ loadRunner: async () => runner }),
    );

    await act(async () => {
      await result.current.run(REPORT, SCOPE);
    });
    await act(async () => {
      await result.current.run(REPORT, SCOPE, { bypassCache: true });
    });

    expect(runner).toHaveBeenCalledTimes(2);
    expect(result.current.result?.markdown).toBe("# call-2");
  });

  it("error-state: runner rejection sets error, result stays null", async () => {
    const runner = vi.fn(async () => {
      throw new Error("Bedrock 500");
    });
    const { result } = renderHook(() =>
      useReportRun({ loadRunner: async () => runner }),
    );

    await act(async () => {
      await result.current.run(REPORT, SCOPE);
    });

    expect(result.current.error).toBe("Bedrock 500");
    expect(result.current.result).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });
});
