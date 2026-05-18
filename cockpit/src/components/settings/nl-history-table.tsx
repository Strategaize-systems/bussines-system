// SLC-756 MT-2 — Inspection-Log-Tabelle fuer NL-Workflow-Sculptor.
//
// Reuse-Pattern aus settings/team/team-members-table.tsx (shadcn Table +
// Wrapper-Rahmen) plus shadcn Select + Badge + Tooltip aus dem bestehenden
// UI-Set (cockpit/src/components/ui/*). Trigger-/Status-Whitelist gespiegelt
// aus lib/automation/sculptor-schema.ts (TRIGGER_EVENTS) — Drift-frei.
//
// TooltipProvider wird global in (app)/layout.tsx gemountet, daher hier nicht.

"use client";

import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import type { EnrichedNlHistoryRow } from "@/app/(app)/settings/workflow-automation/nl-history/page";
import type { SculptResultStatus } from "@/lib/automation/sculptor";

export type StatusFilter = SculptResultStatus | "all";
export type TriggerFilter = "deal.stage_changed" | "deal.created" | "activity.created" | "all";

const STATUS_LABEL: Record<SculptResultStatus, string> = {
  success: "Erfolgreich",
  reject: "Abgelehnt",
  validation_fail: "Validierung fehlgeschlagen",
  infra_fail: "Infra-Fehler",
};

// Style-Guide V2: success=green, reject=amber, validation_fail=red, infra_fail=red.
const STATUS_TONE: Record<SculptResultStatus, string> = {
  success: "bg-green-100 text-green-800 border-green-200",
  reject: "bg-amber-100 text-amber-800 border-amber-200",
  validation_fail: "bg-red-100 text-red-800 border-red-200",
  infra_fail: "bg-red-100 text-red-800 border-red-200",
};

const TRIGGER_LABEL: Record<TriggerFilter, string> = {
  all: "Alle Trigger",
  "deal.stage_changed": "Deal: Phase gewechselt",
  "deal.created": "Deal: erstellt",
  "activity.created": "Aktivitaet: erstellt",
};

const TRUNCATE_LIMIT = 80;

interface NlHistoryTableProps {
  rows: EnrichedNlHistoryRow[];
}

export function NlHistoryTable({ rows }: NlHistoryTableProps) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [triggerFilter, setTriggerFilter] = useState<TriggerFilter>("all");

  const filteredRows = useMemo(
    () => filterNlHistoryRows(rows, statusFilter, triggerFilter),
    [rows, statusFilter, triggerFilter],
  );

  if (rows.length === 0) {
    return (
      <div
        className="rounded-xl border border-slate-200/60 bg-white p-10 text-center text-sm text-slate-500"
        data-testid="nl-history-table-empty"
      >
        Noch keine NL-Sculpt-Versuche vorhanden.
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="nl-history-table">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Status
          </span>
          <Select
            value={statusFilter}
            onValueChange={(v: string | null) => {
              if (v) setStatusFilter(v as StatusFilter);
            }}
          >
            <SelectTrigger
              className="w-48"
              data-testid="nl-history-status-filter"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Status</SelectItem>
              <SelectItem value="success">{STATUS_LABEL.success}</SelectItem>
              <SelectItem value="reject">{STATUS_LABEL.reject}</SelectItem>
              <SelectItem value="validation_fail">
                {STATUS_LABEL.validation_fail}
              </SelectItem>
              <SelectItem value="infra_fail">{STATUS_LABEL.infra_fail}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Trigger
          </span>
          <Select
            value={triggerFilter}
            onValueChange={(v: string | null) => {
              if (v) setTriggerFilter(v as TriggerFilter);
            }}
          >
            <SelectTrigger
              className="w-56"
              data-testid="nl-history-trigger-filter"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{TRIGGER_LABEL.all}</SelectItem>
              <SelectItem value="deal.stage_changed">
                {TRIGGER_LABEL["deal.stage_changed"]}
              </SelectItem>
              <SelectItem value="deal.created">
                {TRIGGER_LABEL["deal.created"]}
              </SelectItem>
              <SelectItem value="activity.created">
                {TRIGGER_LABEL["activity.created"]}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <span
          className="ml-auto text-xs text-slate-500"
          data-testid="nl-history-row-count"
        >
          {filteredRows.length} von {rows.length}
        </span>
      </div>

      {filteredRows.length === 0 ? (
        <div
          className="rounded-xl border border-slate-200/60 bg-white p-10 text-center text-sm text-slate-500"
          data-testid="nl-history-filtered-empty"
        >
          Keine Eintraege fuer diese Filter-Kombination.
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200/60 bg-white shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Datum</TableHead>
                <TableHead>User</TableHead>
                <TableHead>NL-Input</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Trigger / Grund</TableHead>
                <TableHead className="text-right">Kosten (USD)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRows.map((row) => (
                <NlHistoryRow key={row.audit_log_id} row={row} />
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

function NlHistoryRow({ row }: { row: EnrichedNlHistoryRow }) {
  const truncated =
    row.nl_input.length > TRUNCATE_LIMIT
      ? `${row.nl_input.slice(0, TRUNCATE_LIMIT)}…`
      : row.nl_input;

  return (
    <TableRow data-testid="nl-history-row" data-status={row.result_status}>
      <TableCell className="text-slate-600">
        {new Date(row.created_at).toLocaleString("de-DE", {
          dateStyle: "medium",
          timeStyle: "short",
        })}
      </TableCell>
      <TableCell className="text-slate-700">{row.actor_email}</TableCell>
      <TableCell className="max-w-md">
        {row.nl_input.length > TRUNCATE_LIMIT ? (
          <Tooltip>
            <TooltipTrigger className="cursor-help text-left text-slate-700">
              {truncated}
            </TooltipTrigger>
            <TooltipContent className="max-w-md whitespace-pre-wrap text-left">
              {row.nl_input}
            </TooltipContent>
          </Tooltip>
        ) : (
          <span className="text-slate-700">{truncated}</span>
        )}
      </TableCell>
      <TableCell>
        <Badge className={cn(STATUS_TONE[row.result_status], "border")}>
          {STATUS_LABEL[row.result_status]}
        </Badge>
      </TableCell>
      <TableCell className="text-slate-600">
        {formatTriggerOrReason(row)}
      </TableCell>
      <TableCell className="text-right tabular-nums text-slate-700">
        {row.sculptor_cost_usd.toFixed(4)}
      </TableCell>
    </TableRow>
  );
}

/**
 * Filtert die Rows nach Status und Trigger-Event. Pure-Function — wird vom
 * useMemo in der Component genutzt und ist exportiert fuer Unit-Tests
 * (Slice-Spec MT-2: Status-Filter-Toggle).
 */
export function filterNlHistoryRows(
  rows: EnrichedNlHistoryRow[],
  statusFilter: StatusFilter,
  triggerFilter: TriggerFilter,
): EnrichedNlHistoryRow[] {
  return rows.filter((r) => {
    if (statusFilter !== "all" && r.result_status !== statusFilter) {
      return false;
    }
    if (triggerFilter !== "all") {
      const trigger = extractTriggerEvent(r);
      if (trigger !== triggerFilter) {
        return false;
      }
    }
    return true;
  });
}

/**
 * Extrahiert den `trigger_event`-Wert aus result_payload, sofern vorhanden.
 * Bei success-Eintraegen ist trigger_event Bestandteil des Sculpt-Schemas
 * (siehe lib/automation/sculptor-schema.ts). Bei anderen Status fehlt das
 * Feld in der Regel — dann liefert die Funktion null und der Row wird vom
 * Trigger-Filter (sofern aktiv) ausgeblendet.
 */
function extractTriggerEvent(row: EnrichedNlHistoryRow): string | null {
  const payload = row.result_payload;
  if (
    payload &&
    typeof payload === "object" &&
    "trigger_event" in payload &&
    typeof (payload as { trigger_event: unknown }).trigger_event === "string"
  ) {
    return (payload as { trigger_event: string }).trigger_event;
  }
  return null;
}

function formatTriggerOrReason(row: EnrichedNlHistoryRow): string {
  if (row.result_status === "success") {
    const trigger = extractTriggerEvent(row);
    if (trigger && trigger in TRIGGER_LABEL) {
      return TRIGGER_LABEL[trigger as TriggerFilter];
    }
    return trigger ?? "—";
  }
  if (row.result_status === "reject") {
    const payload = row.result_payload;
    if (
      payload &&
      typeof payload === "object" &&
      "reason" in payload &&
      typeof (payload as { reason: unknown }).reason === "string"
    ) {
      return (payload as { reason: string }).reason;
    }
    return "Abgelehnt (ohne Begruendung)";
  }
  return "—";
}
