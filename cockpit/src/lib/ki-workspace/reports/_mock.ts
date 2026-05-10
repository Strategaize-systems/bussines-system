import type { RunReportArgs, ReportResult } from "@/components/ki-workspace/types";

export async function runReport(args: RunReportArgs): Promise<ReportResult> {
  await new Promise<void>((resolve) => setTimeout(resolve, 200));
  const dealLine = args.scope.dealId ? ` / Deal ${args.scope.dealId}` : "";
  return {
    markdown:
      `# Mock-Report ${args.reportId}\n\n` +
      `Kontext: ${args.scope.userId}${dealLine}.\n\n` +
      "Dieser Bericht ist ein Foundation-Mock. " +
      "Die echte Bedrock-Anbindung wird in SLC-662 (Mein Tag), " +
      "SLC-664 (Deal-Detail) und SLC-666 (Cockpit) verdrahtet.",
    completedAt: new Date().toISOString(),
    model: "mock",
    refreshable: true,
  };
}

export const runMockReport = runReport;
