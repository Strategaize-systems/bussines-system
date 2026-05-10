"use client";

import { useState, useCallback } from "react";
import { Mic, Send, Square } from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  KIWorkspaceProps,
  KIWorkspaceReport,
  ReportRunner,
} from "./types";
import { AnswerPane } from "./AnswerPane";
import { useReportRun } from "./hooks/useReportRun";
import { useVoiceCapture } from "./hooks/useVoiceCapture";

interface ExtendedProps extends KIWorkspaceProps {
  className?: string;
  /** Test/SLC-662 injection point — overrides default _mock loader. */
  loadRunner?: (serverActionPath: string) => Promise<ReportRunner>;
}

const FREE_QUESTION_REPORT_ID = "freie-frage";

export function KIWorkspace({
  context,
  reports,
  scope,
  voiceEnabled,
  className,
  loadRunner,
}: ExtendedProps) {
  const [inputText, setInputText] = useState("");
  const [selectedReport, setSelectedReport] = useState<KIWorkspaceReport | null>(null);
  const reportRun = useReportRun({ loadRunner });
  const voice = useVoiceCapture();

  const handleReportClick = useCallback(
    async (report: KIWorkspaceReport) => {
      setSelectedReport(report);
      await reportRun.run(report, scope);
    },
    [reportRun, scope],
  );

  const handleRefresh = useCallback(async () => {
    if (!selectedReport) return;
    await reportRun.run(selectedReport, scope, { bypassCache: true });
  }, [reportRun, scope, selectedReport]);

  const handleVoiceClick = useCallback(async () => {
    if (voice.isRecording) {
      const text = await voice.stop();
      if (text) {
        setInputText((prev) => (prev ? `${prev} ${text}` : text));
      }
    } else {
      await voice.start();
    }
  }, [voice]);

  return (
    <div
      className={cn("flex flex-col gap-3", className)}
      data-testid="ki-workspace"
      data-context={context}
    >
      <div
        className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 snap-x"
        data-testid="ki-workspace-report-buttons"
      >
        {reports.map((report) => (
          <button
            key={report.id}
            type="button"
            onClick={() => handleReportClick(report)}
            disabled={reportRun.isLoading}
            className={cn(
              "shrink-0 snap-start rounded-full px-3 py-1.5 text-xs font-medium",
              "border border-brand-primary/30 bg-brand-primary/10 text-brand-primary",
              "hover:bg-brand-primary hover:text-brand-foreground transition-colors",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              selectedReport?.id === report.id &&
                "bg-brand-primary text-brand-foreground",
            )}
            data-testid={`ki-workspace-report-${report.id}`}
          >
            {report.label}
          </button>
        ))}
      </div>

      <div className="flex w-full items-center gap-2">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Frage stellen ..."
          className={cn(
            "flex-1 min-w-0 rounded-md border border-input bg-background px-3 py-2",
            "text-sm placeholder:text-muted-foreground",
            "focus:outline-none focus:ring-2 focus:ring-brand-primary/40",
          )}
          data-testid="ki-workspace-input"
        />
        {voiceEnabled && (
          <button
            type="button"
            onClick={handleVoiceClick}
            className={cn(
              "shrink-0 inline-flex items-center justify-center rounded-md w-9 h-9 transition-colors",
              voice.isRecording
                ? "bg-red-100 text-red-700 hover:bg-red-200"
                : "bg-muted text-muted-foreground hover:bg-brand-primary/10 hover:text-brand-primary",
            )}
            aria-pressed={voice.isRecording}
            aria-label={voice.isRecording ? "Aufnahme stoppen" : "Spracheingabe starten"}
            data-testid="ki-workspace-voice-button"
          >
            {voice.isRecording ? (
              <Square className="h-4 w-4 fill-current" />
            ) : (
              <Mic className="h-4 w-4" />
            )}
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            if (!inputText.trim()) return;
            const freeReport: KIWorkspaceReport = {
              id: FREE_QUESTION_REPORT_ID,
              label: "Freie Frage",
              serverActionPath: reports[0]?.serverActionPath ?? "",
              cacheable: false,
            };
            void handleReportClick(freeReport);
          }}
          disabled={!inputText.trim() || reportRun.isLoading}
          className={cn(
            "shrink-0 inline-flex items-center justify-center rounded-md w-9 h-9",
            "bg-brand-primary text-brand-foreground hover:bg-brand-primary-dark",
            "disabled:opacity-50 disabled:cursor-not-allowed transition-colors",
          )}
          aria-label="Frage senden"
          data-testid="ki-workspace-send-button"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>

      {voice.error && (
        <p className="text-xs text-red-600" role="status">
          {voice.error}
        </p>
      )}

      <AnswerPane
        isLoading={reportRun.isLoading}
        error={reportRun.error}
        result={reportRun.result}
        onRefresh={selectedReport ? handleRefresh : undefined}
      />
    </div>
  );
}
