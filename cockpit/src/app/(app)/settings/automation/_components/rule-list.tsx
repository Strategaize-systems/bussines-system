"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  Pencil,
  Pause,
  Play,
  Trash2,
  Zap,
  AlertCircle,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  pauseAutomationRule,
  activateAutomationRule,
  deleteAutomationRule,
  listAutomationRules,
} from "../actions";
import type { AutomationRuleListItem, RuleStatus } from "@/types/automation";

const TRIGGER_LABELS: Record<string, string> = {
  "deal.stage_changed": "Wenn Deal in Stage wechselt",
  "deal.created": "Wenn neuer Deal erstellt wird",
  "activity.created": "Wenn neue Activity erstellt wird",
};

function statusBadge(status: RuleStatus) {
  switch (status) {
    case "active":
      return (
        <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
          Aktiv
        </Badge>
      );
    case "paused":
      return (
        <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">
          Pausiert
        </Badge>
      );
    case "disabled":
      return (
        <Badge className="bg-slate-200 text-slate-700 hover:bg-slate-200">
          Deaktiviert
        </Badge>
      );
  }
}

function lastRunBadge(status: string | null) {
  if (!status) {
    return <span className="text-xs text-slate-400">Noch nicht gelaufen</span>;
  }
  const map: Record<string, { label: string; cls: string }> = {
    success: { label: "Erfolgreich", cls: "bg-emerald-50 text-emerald-700" },
    partial_failed: {
      label: "Teilweise fehlgeschlagen",
      cls: "bg-amber-50 text-amber-700",
    },
    failed: { label: "Fehlgeschlagen", cls: "bg-rose-50 text-rose-700" },
    skipped: { label: "Uebersprungen", cls: "bg-slate-100 text-slate-700" },
    pending: { label: "Pending", cls: "bg-slate-100 text-slate-700" },
    running: { label: "Laeuft", cls: "bg-sky-50 text-sky-700" },
  };
  const m = map[status] ?? { label: status, cls: "bg-slate-100 text-slate-700" };
  return (
    <Badge className={`${m.cls} hover:${m.cls}`}>{m.label}</Badge>
  );
}

function formatRelative(iso: string | null): string {
  if (!iso) return "noch nicht gelaufen";
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return "gerade eben";
  if (ms < 3_600_000) return `vor ${Math.floor(ms / 60_000)} Min.`;
  if (ms < 86_400_000) return `vor ${Math.floor(ms / 3_600_000)} Std.`;
  return `vor ${Math.floor(ms / 86_400_000)} Tagen`;
}

function successRate(item: AutomationRuleListItem): string | null {
  const total = item.run_count_7d ?? 0;
  if (total === 0) return null;
  const success = item.success_count_7d ?? 0;
  const pct = Math.round((success / total) * 100);
  return `${pct}% (${success}/${total})`;
}

export function RuleList({
  initialRules,
}: {
  initialRules: AutomationRuleListItem[];
}) {
  const [rules, setRules] = useState(initialRules);
  const [confirmDelete, setConfirmDelete] =
    useState<AutomationRuleListItem | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function refresh() {
    void listAutomationRules().then(setRules);
  }

  function toggle(rule: AutomationRuleListItem) {
    setError(null);
    // Optimistic update
    const target: RuleStatus = rule.status === "active" ? "paused" : "active";
    setRules((prev) =>
      prev.map((r) => (r.id === rule.id ? { ...r, status: target } : r))
    );
    startTransition(async () => {
      const result =
        target === "active"
          ? await activateAutomationRule(rule.id)
          : await pauseAutomationRule(rule.id);
      if (!result.ok) {
        setError(result.error);
        // revert
        refresh();
      } else {
        refresh();
      }
    });
  }

  function performDelete() {
    if (!confirmDelete) return;
    const id = confirmDelete.id;
    setError(null);
    startTransition(async () => {
      const result = await deleteAutomationRule(id);
      if (!result.ok) {
        setError(result.error);
      } else {
        setRules((prev) => prev.filter((r) => r.id !== id));
        setConfirmDelete(null);
      }
    });
  }

  if (rules.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 p-8 text-center">
        <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-amber-50">
          <Zap className="h-5 w-5 text-amber-600" />
        </div>
        <p className="text-sm font-medium text-slate-900">
          Keine Regeln angelegt
        </p>
        <p className="mt-1 text-sm text-slate-500">
          Lege deine erste Workflow-Regel an, um Routine-Reaktionen zu
          automatisieren.
        </p>
        <Link
          href="/settings/automation/new"
          className={`${buttonVariants({ variant: "default" })} mt-4 inline-flex gap-2`}
        >
          Erste Regel anlegen
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error ? (
        <div className="flex items-start gap-2 rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      {rules.map((rule) => {
        const rate = successRate(rule);
        return (
          <div
            key={rule.id}
            className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-medium text-slate-900">{rule.name}</h3>
                  {statusBadge(rule.status)}
                </div>
                <p className="mt-1 text-sm text-slate-600">
                  {TRIGGER_LABELS[rule.trigger_event] ?? rule.trigger_event}
                </p>
                {rule.description ? (
                  <p className="mt-1 text-xs text-slate-500 line-clamp-2">
                    {rule.description}
                  </p>
                ) : null}
                {rule.status === "paused" && rule.paused_reason ? (
                  <p className="mt-1 text-xs text-amber-700">
                    Pausierungs-Grund: {rule.paused_reason}
                  </p>
                ) : null}
                <div className="mt-2 flex items-center gap-3 flex-wrap text-xs text-slate-500">
                  <span>
                    Letzter Lauf: {formatRelative(rule.last_run_at)}
                  </span>
                  {lastRunBadge(rule.last_run_status)}
                  {rate ? (
                    <span className="text-slate-500">
                      7-Tage-Erfolgsquote: {rate}
                    </span>
                  ) : null}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={isPending || rule.status === "disabled"}
                  onClick={() => toggle(rule)}
                  title={rule.status === "active" ? "Pausieren" : "Aktivieren"}
                >
                  {rule.status === "active" ? (
                    <Pause className="h-4 w-4" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                </Button>
                <Link
                  href={`/settings/automation/${rule.id}/edit`}
                  title="Bearbeiten"
                  className={`${buttonVariants({ variant: "ghost", size: "sm" })} inline-flex`}
                >
                  <Pencil className="h-4 w-4" />
                </Link>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                  onClick={() => setConfirmDelete(rule)}
                  disabled={isPending}
                  title="Loeschen"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        );
      })}

      <Dialog
        open={confirmDelete !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmDelete(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Regel loeschen?</DialogTitle>
            <DialogDescription>
              {confirmDelete
                ? `"${confirmDelete.name}" und alle zugehoerigen Run-History-Eintraege werden gelöscht. Aktion ist nicht rueckgaengig.`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmDelete(null)}
              disabled={isPending}
            >
              Abbrechen
            </Button>
            <Button
              variant="destructive"
              onClick={performDelete}
              disabled={isPending}
            >
              {isPending ? "Loesche..." : "Loeschen"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
