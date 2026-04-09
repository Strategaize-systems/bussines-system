"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronLeft, ChevronRight, Shield, Filter, X } from "lucide-react";
import type { AuditLogEntry } from "./actions";

const ACTION_LABELS: Record<string, string> = {
  stage_change: "Stage-Wechsel",
  status_change: "Status-Wechsel",
  create: "Erstellt",
  update: "Aktualisiert",
  delete: "Gelöscht",
};

const ACTION_COLORS: Record<string, string> = {
  stage_change: "bg-blue-100 text-blue-800",
  status_change: "bg-purple-100 text-purple-800",
  create: "bg-green-100 text-green-800",
  update: "bg-amber-100 text-amber-800",
  delete: "bg-red-100 text-red-800",
};

const ENTITY_LABELS: Record<string, string> = {
  deal: "Deal",
  meeting: "Termin",
  task: "Aufgabe",
  contact: "Kontakt",
  company: "Firma",
  proposal: "Proposal",
};

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function ChangesPreview({
  changes,
}: {
  changes: AuditLogEntry["changes"];
}) {
  if (!changes) return <span className="text-slate-400">-</span>;

  const parts: string[] = [];

  if (changes.before && changes.after) {
    // Show key diffs
    for (const key of Object.keys(changes.after)) {
      const oldVal = changes.before[key];
      const newVal = changes.after[key];
      if (oldVal !== newVal) {
        parts.push(`${key}: ${oldVal ?? "-"} → ${newVal ?? "-"}`);
      }
    }
  } else if (changes.after) {
    for (const [key, val] of Object.entries(changes.after)) {
      if (val !== null && val !== undefined) {
        parts.push(`${key}: ${val}`);
      }
    }
  } else if (changes.before) {
    for (const [key, val] of Object.entries(changes.before)) {
      if (val !== null && val !== undefined) {
        parts.push(`${key}: ${val}`);
      }
    }
  }

  if (parts.length === 0) return <span className="text-slate-400">-</span>;

  return (
    <div className="max-w-xs space-y-0.5">
      {parts.slice(0, 3).map((p, i) => (
        <div key={i} className="text-xs text-slate-600 truncate">
          {p}
        </div>
      ))}
      {parts.length > 3 && (
        <div className="text-xs text-slate-400">
          +{parts.length - 3} weitere
        </div>
      )}
    </div>
  );
}

interface AuditLogClientProps {
  entries: AuditLogEntry[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  currentEntityType?: string;
  currentAction?: string;
}

export function AuditLogClient({
  entries,
  totalCount,
  totalPages,
  currentPage,
  currentEntityType,
  currentAction,
}: AuditLogClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function updateParams(updates: Record<string, string | undefined>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, val] of Object.entries(updates)) {
      if (val) {
        params.set(key, val);
      } else {
        params.delete(key);
      }
    }
    // Reset to page 1 on filter change unless page is explicitly being set
    if (!("page" in updates)) {
      params.delete("page");
    }
    router.push(`/audit-log?${params.toString()}`);
  }

  const hasFilters = currentEntityType || currentAction;

  return (
    <>
      <PageHeader
        title="Audit-Log"
        subtitle={`${totalCount} Einträge — nur für Administratoren`}
      >
        <Shield className="h-5 w-5 text-slate-400" />
      </PageHeader>

      <div className="px-8 py-6 max-w-[1800px] mx-auto">
        {/* Filters */}
        <div className="flex items-center gap-3 mb-6">
          <Filter className="h-4 w-4 text-slate-400" />

          <Select
            value={currentEntityType ?? ""}
            onValueChange={(val) =>
              updateParams({ entity_type: val || undefined })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Alle Entitäten" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Alle Entitäten</SelectItem>
              <SelectItem value="deal">Deal</SelectItem>
              <SelectItem value="meeting">Termin</SelectItem>
              <SelectItem value="task">Aufgabe</SelectItem>
              <SelectItem value="contact">Kontakt</SelectItem>
              <SelectItem value="company">Firma</SelectItem>
              <SelectItem value="proposal">Proposal</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={currentAction ?? ""}
            onValueChange={(val) =>
              updateParams({ action: val || undefined })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Alle Aktionen" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Alle Aktionen</SelectItem>
              <SelectItem value="stage_change">Stage-Wechsel</SelectItem>
              <SelectItem value="status_change">Status-Wechsel</SelectItem>
              <SelectItem value="create">Erstellt</SelectItem>
              <SelectItem value="update">Aktualisiert</SelectItem>
              <SelectItem value="delete">Gelöscht</SelectItem>
            </SelectContent>
          </Select>

          {hasFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                updateParams({
                  entity_type: undefined,
                  action: undefined,
                  page: undefined,
                })
              }
            >
              <X className="h-3.5 w-3.5 mr-1" />
              Filter zurücksetzen
            </Button>
          )}
        </div>

        {/* Table */}
        {entries.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
            <Shield className="mx-auto h-10 w-10 text-slate-300 mb-3" />
            <p className="text-sm text-slate-500">
              {hasFilters
                ? "Keine Einträge für die gewählten Filter."
                : "Noch keine Audit-Log-Einträge vorhanden."}
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Zeitpunkt</TableHead>
                  <TableHead>Aktor</TableHead>
                  <TableHead>Aktion</TableHead>
                  <TableHead>Entität</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead>Kontext</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="text-xs text-slate-500 whitespace-nowrap">
                      {formatDate(entry.created_at)}
                    </TableCell>
                    <TableCell className="text-sm font-medium text-slate-700">
                      {entry.profiles?.display_name ?? "System"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          ACTION_COLORS[entry.action] ??
                          "bg-slate-100 text-slate-700"
                        }
                      >
                        {ACTION_LABELS[entry.action] ?? entry.action}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-slate-600">
                      {ENTITY_LABELS[entry.entity_type] ?? entry.entity_type}
                    </TableCell>
                    <TableCell>
                      <ChangesPreview changes={entry.changes} />
                    </TableCell>
                    <TableCell className="text-xs text-slate-500 max-w-[200px] truncate">
                      {entry.context ?? "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <p className="text-xs text-slate-500">
              Seite {currentPage} von {totalPages} ({totalCount} Einträge)
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage <= 1}
                onClick={() =>
                  updateParams({ page: String(currentPage - 1) })
                }
              >
                <ChevronLeft className="h-3.5 w-3.5 mr-1" />
                Zurück
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage >= totalPages}
                onClick={() =>
                  updateParams({ page: String(currentPage + 1) })
                }
              >
                Weiter
                <ChevronRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
