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
import { NLBuilderInline } from "./nl-builder-inline";
import { useReportRun } from "./hooks/useReportRun";
import { useVoiceCapture } from "./hooks/useVoiceCapture";
import { MeineBerichteDropdown } from "./meine-berichte-dropdown";
import { SaveCustomReportModal } from "./save-custom-report-modal";
import type {
  CustomReportContextType,
  CustomReportRow,
} from "@/lib/custom-reports/types";

interface ExtendedProps extends KIWorkspaceProps {
  className?: string;
  /** Test/SLC-662 injection point — overrides default _mock loader. */
  loadRunner?: (serverActionPath: string) => Promise<ReportRunner>;
  // V7.6 SLC-763 — Optional. Wenn gesetzt, rendert KIWorkspace die
  // "Meine Berichte"-Dropdown rechts neben den Standard-Buttons und ein
  // Save-Modal nach freier Frage. Wird vom Page-Wrapper befuellt
  // (Server-Component-Side via `listCustomReports`).
  customReports?: CustomReportRow[];
  /** Pflicht wenn customReports gesetzt — "mein-tag" oder "cockpit". */
  customReportContextType?: CustomReportContextType;
  /**
   * Wird nach Save/Rename/Delete eines Custom-Reports aufgerufen. Page-Wrapper
   * triggert dann `router.refresh()`, damit `listCustomReports` neu laeuft.
   */
  onCustomReportsChanged?: () => void;
}

const FREE_QUESTION_REPORT_ID = "freie-frage";
// V7.6 SLC-761 MT-2 — special-cased Report-ID, das den NL-Builder-Mode
// triggert statt einen Bedrock-Report-Runner aufzurufen. Sichtbarkeit per
// canSculpt-Filter im ki-workspace-wrapper.tsx.
const NL_BUILDER_REPORT_ID = "nl-builder";
// V7.6 SLC-763 — Pseudo-Pfad fuer Custom-Reports. mein-tag-wrapper +
// cockpit-ki-workspace-Wrapper resolvieren den auf einen Adapter, der die
// `runCustomReport`-Server-Action aufruft. reportId steckt die UUID via
// "custom-<uuid>"-Prefix mit drin.
const CUSTOM_REPORT_SERVER_ACTION_PATH = "__custom__";
const CUSTOM_REPORT_ID_PREFIX = "custom-";

type WorkspaceMode = "report" | "nl-builder";

export function KIWorkspace({
  context,
  reports,
  scope,
  voiceEnabled,
  className,
  loadRunner,
  customReports,
  customReportContextType,
  onCustomReportsChanged,
}: ExtendedProps) {
  const [inputText, setInputText] = useState("");
  const [selectedReport, setSelectedReport] = useState<KIWorkspaceReport | null>(null);
  // V7.6 SLC-761 MT-2 — Mode-Switch zwischen Bedrock-Berichts-Anzeige und
  // inline NL-Rule-Builder. Default "report" haelt das bisherige Verhalten
  // unveraendert; "nl-builder" wird durch Klick auf den 6. Button gesetzt.
  const [mode, setMode] = useState<WorkspaceMode>("report");
  // V7.6 SLC-763 — Save-Modal-Open-State (controlled). Wird durch
  // AnswerPane.onSaveAsReport-Callback getoggled, erscheint NUR nach freier
  // Frage (DEC-216).
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const reportRun = useReportRun({ loadRunner });
  const voice = useVoiceCapture();

  const canShowCustomReports =
    customReports !== undefined &&
    customReportContextType !== undefined;

  const handleReportClick = useCallback(
    async (report: KIWorkspaceReport) => {
      setSelectedReport(report);
      if (report.id === NL_BUILDER_REPORT_ID) {
        // Short-Circuit: KEIN reportRun.run(), NLBuilderInline rendert inline
        // statt AnswerPane. Workspace-Input-Bar wird disabled (siehe JSX).
        setMode("nl-builder");
        return;
      }
      setMode("report");
      await reportRun.run(report, scope);
    },
    [reportRun, scope],
  );

  const handleRefresh = useCallback(async () => {
    if (!selectedReport) return;
    await reportRun.run(selectedReport, scope, { bypassCache: true });
  }, [reportRun, scope, selectedReport]);

  // V7.6 SLC-763 — Klick auf Item in der Dropdown. Wir bauen einen Pseudo-
  // KIWorkspaceReport mit `serverActionPath="__custom__"`, der Wrapper
  // (mein-tag-wrapper / cockpit-ki-workspace) muss diesen Pfad in einen
  // runCustomReport-Adapter aufloesen.
  const handleCustomReportClick = useCallback(
    async (row: CustomReportRow) => {
      const pseudo: KIWorkspaceReport = {
        id: `${CUSTOM_REPORT_ID_PREFIX}${row.id}`,
        label: row.name,
        serverActionPath: CUSTOM_REPORT_SERVER_ACTION_PATH,
        cacheable: false,
      };
      setSelectedReport(pseudo);
      setMode("report");
      await reportRun.run(pseudo, scope);
    },
    [reportRun, scope],
  );

  const isFreeFormResult =
    selectedReport?.id === FREE_QUESTION_REPORT_ID &&
    reportRun.result !== null &&
    !reportRun.isLoading;

  const handleSaveAsReport = useCallback(() => {
    setSaveModalOpen(true);
  }, []);

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

  const isNlBuilderMode = mode === "nl-builder";
  const inputPlaceholder = isNlBuilderMode
    ? "Workflow-Modus aktiv — verwende die NL-Eingabe unten"
    : "Frage stellen ...";

  return (
    <div
      className={cn("flex flex-col gap-3", className)}
      data-testid="ki-workspace"
      data-context={context}
      data-mode={mode}
    >
      <div className="flex items-center gap-2">
        <div
          className="flex flex-1 gap-2 overflow-x-auto pb-1 -mx-1 px-1 snap-x"
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
        {canShowCustomReports && (
          <MeineBerichteDropdown
            reports={customReports ?? []}
            onSelect={(row) => void handleCustomReportClick(row)}
            onChanged={() => onCustomReportsChanged?.()}
          />
        )}
      </div>

      <div className="flex w-full items-center gap-2">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={inputPlaceholder}
          disabled={isNlBuilderMode}
          className={cn(
            "flex-1 min-w-0 rounded-md border border-input bg-background px-3 py-2",
            "text-sm placeholder:text-muted-foreground",
            "focus:outline-none focus:ring-2 focus:ring-brand-primary/40",
            "disabled:cursor-not-allowed disabled:bg-muted/50 disabled:opacity-60",
          )}
          data-testid="ki-workspace-input"
        />
        {voiceEnabled && (
          <button
            type="button"
            onClick={handleVoiceClick}
            disabled={isNlBuilderMode}
            className={cn(
              "shrink-0 inline-flex items-center justify-center rounded-md w-9 h-9 transition-colors",
              voice.isRecording
                ? "bg-red-100 text-red-700 hover:bg-red-200"
                : "bg-muted text-muted-foreground hover:bg-brand-primary/10 hover:text-brand-primary",
              "disabled:cursor-not-allowed disabled:opacity-50",
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
          disabled={!inputText.trim() || reportRun.isLoading || isNlBuilderMode}
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

      {isNlBuilderMode ? (
        <NLBuilderInline
          onClose={() => {
            setMode("report");
            setSelectedReport(null);
          }}
        />
      ) : (
        <AnswerPane
          isLoading={reportRun.isLoading}
          error={reportRun.error}
          result={reportRun.result}
          onRefresh={selectedReport ? handleRefresh : undefined}
          reportId={selectedReport?.id}
          onSaveAsReport={
            canShowCustomReports && isFreeFormResult
              ? handleSaveAsReport
              : undefined
          }
        />
      )}

      {canShowCustomReports && customReportContextType && (
        <SaveCustomReportModal
          open={saveModalOpen}
          onOpenChange={setSaveModalOpen}
          promptTemplate={inputText}
          contextType={customReportContextType}
          onSaved={() => {
            setSaveModalOpen(false);
            onCustomReportsChanged?.();
          }}
        />
      )}
    </div>
  );
}
