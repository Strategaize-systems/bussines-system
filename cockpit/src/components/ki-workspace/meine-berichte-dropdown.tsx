"use client";

// V7.6 SLC-763 MT-3 — Meine-Berichte-Dropdown.
//
// Render-States:
//   - 0 Items → Empty-Hint
//   - 1-5 Items → einfache Liste mit last_used_at-Postfix
//   - 6+ Items → Type-Ahead-Filter (case-insensitive includes)
//
// Sub-Features:
//   - Klick auf Item → `onSelect(report)` (KIWorkspace ruft runCustomReport)
//   - ⋮-Sub-Menu → "Umbenennen" + "Loeschen" Actions
//   - Inline-Rename via Sub-Modal mit name-Input + 409-Handling
//   - Loeschen mit Confirm-Dialog
//
// Server-Action-Calls direkt aus dem Component (Rename + Delete). Nach
// Success wird `onChanged` aufgerufen, damit das Parent `router.refresh()`
// triggert und die Liste neu geladen wird.
//
// Pattern-Reuse:
//   - shadcn-Dialog aus SaveCustomReportModal (V7.6 SLC-763 MT-2).
//   - Native HTML Form-Pattern aus feedback_native_html_form_pattern.

import * as React from "react";
import {
  BookmarkPlus,
  ChevronDown,
  MoreVertical,
  Pencil,
  Trash2,
  AlertTriangle,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { renameCustomReport } from "@/lib/custom-reports/actions/rename";
import { deleteCustomReport } from "@/lib/custom-reports/actions/delete";
import type { CustomReportRow } from "@/lib/custom-reports/types";

const TYPE_AHEAD_THRESHOLD = 6;

export interface MeineBerichteDropdownProps {
  reports: CustomReportRow[];
  onSelect: (report: CustomReportRow) => void;
  onChanged: () => void;
}

export function MeineBerichteDropdown({
  reports,
  onSelect,
  onChanged,
}: MeineBerichteDropdownProps) {
  const [open, setOpen] = React.useState(false);
  const [filter, setFilter] = React.useState("");
  const [subMenuOpenId, setSubMenuOpenId] = React.useState<string | null>(null);
  const [renameTarget, setRenameTarget] = React.useState<CustomReportRow | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<CustomReportRow | null>(null);

  const containerRef = React.useRef<HTMLDivElement | null>(null);

  // Click-outside schliesst das Panel (nicht die Sub-Modals — Dialog handelt
  // sein Outside-Verhalten selbst).
  React.useEffect(() => {
    if (!open) return;
    function handleClick(event: MouseEvent) {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(event.target as Node)) {
        setOpen(false);
        setSubMenuOpenId(null);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const showFilter = reports.length >= TYPE_AHEAD_THRESHOLD;
  const filtered = showFilter
    ? reports.filter((r) =>
        r.name.toLowerCase().includes(filter.toLowerCase()),
      )
    : reports;

  function handleSelect(report: CustomReportRow) {
    setOpen(false);
    setSubMenuOpenId(null);
    onSelect(report);
  }

  return (
    <div
      ref={containerRef}
      className="relative"
      data-testid="meine-berichte-dropdown"
    >
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          "shrink-0 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium",
          "border border-brand-primary/30 bg-white text-brand-primary",
          "hover:bg-brand-primary/10 transition-colors",
        )}
        aria-haspopup="menu"
        aria-expanded={open}
        data-testid="meine-berichte-trigger"
      >
        <BookmarkPlus className="h-3 w-3" />
        Meine Berichte
        {reports.length > 0 && (
          <span
            className="rounded-full bg-brand-primary/10 px-1.5 text-[10px] font-semibold"
            data-testid="meine-berichte-count"
          >
            {reports.length}
          </span>
        )}
        <ChevronDown
          className={cn(
            "h-3 w-3 transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      {open && (
        <div
          className={cn(
            "absolute right-0 top-full z-30 mt-1 w-72 rounded-md border border-border bg-white shadow-md",
            "max-h-[400px] overflow-y-auto",
          )}
          role="menu"
          data-testid="meine-berichte-panel"
        >
          {reports.length === 0 && (
            <p
              className="px-3 py-4 text-xs text-muted-foreground"
              data-testid="meine-berichte-empty"
            >
              Stelle eine freie Frage und speichere die Antwort als Bericht.
            </p>
          )}

          {showFilter && (
            <div className="border-b border-border px-2 py-2">
              <input
                type="text"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Filtern ..."
                className="w-full rounded-md border border-input bg-background px-2 py-1 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-brand-primary/40"
                data-testid="meine-berichte-filter"
              />
            </div>
          )}

          {reports.length > 0 && (
            <ul className="py-1" data-testid="meine-berichte-list">
              {filtered.length === 0 && (
                <li
                  className="px-3 py-2 text-xs text-muted-foreground"
                  data-testid="meine-berichte-no-match"
                >
                  Keine Berichte gefunden.
                </li>
              )}
              {filtered.map((report) => (
                <li
                  key={report.id}
                  className="relative flex items-center gap-1 px-1 hover:bg-slate-50"
                  data-testid={`meine-berichte-item-${report.id}`}
                >
                  <button
                    type="button"
                    onClick={() => handleSelect(report)}
                    className="flex-1 truncate rounded px-2 py-1.5 text-left text-xs text-foreground hover:text-brand-primary"
                    data-testid={`meine-berichte-item-select-${report.id}`}
                  >
                    <span className="block truncate font-medium">{report.name}</span>
                    {report.last_used_at && (
                      <span className="block text-[10px] text-muted-foreground">
                        Zuletzt: {relativeTimeDE(report.last_used_at)}
                      </span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSubMenuOpenId((cur) =>
                        cur === report.id ? null : report.id,
                      );
                    }}
                    aria-label="Optionen"
                    data-testid={`meine-berichte-item-more-${report.id}`}
                    className="p-1 text-muted-foreground hover:text-brand-primary"
                  >
                    <MoreVertical className="h-3 w-3" />
                  </button>

                  {subMenuOpenId === report.id && (
                    <div
                      className="absolute right-1 top-full z-40 mt-0.5 w-32 rounded-md border border-border bg-white shadow-md"
                      role="menu"
                      data-testid={`meine-berichte-submenu-${report.id}`}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setSubMenuOpenId(null);
                          setRenameTarget(report);
                        }}
                        className="flex w-full items-center gap-2 px-3 py-1.5 text-xs hover:bg-slate-50"
                        data-testid={`meine-berichte-item-rename-${report.id}`}
                      >
                        <Pencil className="h-3 w-3" />
                        Umbenennen
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSubMenuOpenId(null);
                          setDeleteTarget(report);
                        }}
                        className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-red-700 hover:bg-red-50"
                        data-testid={`meine-berichte-item-delete-${report.id}`}
                      >
                        <Trash2 className="h-3 w-3" />
                        Loeschen
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <RenameCustomReportDialog
        target={renameTarget}
        onOpenChange={(o) => {
          if (!o) setRenameTarget(null);
        }}
        onSaved={() => {
          setRenameTarget(null);
          onChanged();
        }}
      />

      <DeleteCustomReportConfirm
        target={deleteTarget}
        onOpenChange={(o) => {
          if (!o) setDeleteTarget(null);
        }}
        onDeleted={() => {
          setDeleteTarget(null);
          onChanged();
        }}
      />
    </div>
  );
}

interface RenameDialogProps {
  target: CustomReportRow | null;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

function RenameCustomReportDialog({
  target,
  onOpenChange,
  onSaved,
}: RenameDialogProps) {
  const [name, setName] = React.useState("");
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [isPending, startTransition] = React.useTransition();

  React.useEffect(() => {
    if (target) {
      setName(target.name);
      setErrorMessage(null);
    }
  }, [target]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!target) return;
    const trimmed = name.trim();
    if (trimmed.length < 2 || trimmed.length > 80) {
      setErrorMessage("Name muss 2-80 Zeichen lang sein.");
      return;
    }
    setErrorMessage(null);
    startTransition(async () => {
      const res = await renameCustomReport({ id: target.id, name: trimmed });
      if (res.ok) {
        onSaved();
        return;
      }
      if (res.code === "duplicate_name") {
        setErrorMessage("Name bereits vergeben.");
        return;
      }
      setErrorMessage(res.message ?? "Umbenennen fehlgeschlagen.");
    });
  }

  const open = target !== null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="rename-custom-report-dialog" className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil size={16} className="text-brand-primary" />
            Bericht umbenennen
          </DialogTitle>
          <DialogDescription>
            Vergib einen neuen Namen fuer den Bericht.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit}
          data-testid="rename-custom-report-form"
          className="space-y-3"
        >
          <div>
            <label
              htmlFor="rename-custom-report-name"
              className="block text-xs font-semibold text-slate-700 mb-1"
            >
              Name
            </label>
            <input
              id="rename-custom-report-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isPending}
              required
              minLength={2}
              maxLength={80}
              data-testid="rename-custom-report-name"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/40 disabled:cursor-not-allowed disabled:opacity-60"
            />
          </div>

          {errorMessage && (
            <div
              role="alert"
              data-testid="rename-custom-report-error"
              className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 flex items-start gap-2"
            >
              <AlertTriangle size={14} className="shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
              data-testid="rename-custom-report-cancel"
            >
              Abbrechen
            </Button>
            <Button
              type="submit"
              disabled={isPending || name.trim().length < 2}
              data-testid="rename-custom-report-submit"
              className="bg-brand-primary text-brand-foreground hover:bg-brand-primary-dark"
            >
              {isPending ? "Speichere..." : "Speichern"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface DeleteConfirmProps {
  target: CustomReportRow | null;
  onOpenChange: (open: boolean) => void;
  onDeleted: () => void;
}

function DeleteCustomReportConfirm({
  target,
  onOpenChange,
  onDeleted,
}: DeleteConfirmProps) {
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [isPending, startTransition] = React.useTransition();

  React.useEffect(() => {
    if (target) setErrorMessage(null);
  }, [target]);

  function handleDelete() {
    if (!target) return;
    startTransition(async () => {
      const res = await deleteCustomReport({ id: target.id });
      if (res.ok) {
        onDeleted();
        return;
      }
      setErrorMessage(res.message ?? "Loeschen fehlgeschlagen.");
    });
  }

  const open = target !== null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-testid="delete-custom-report-dialog"
        className="sm:max-w-md"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trash2 size={16} className="text-red-700" />
            Bericht loeschen?
          </DialogTitle>
          <DialogDescription>
            {target ? (
              <>
                Bericht &quot;{target.name}&quot; wird unwiderruflich geloescht.
              </>
            ) : null}
          </DialogDescription>
        </DialogHeader>

        {errorMessage && (
          <div
            role="alert"
            data-testid="delete-custom-report-error"
            className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 flex items-start gap-2"
          >
            <AlertTriangle size={14} className="shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
            data-testid="delete-custom-report-cancel"
          >
            Abbrechen
          </Button>
          <Button
            type="button"
            onClick={handleDelete}
            disabled={isPending}
            data-testid="delete-custom-report-confirm"
            className="bg-red-600 text-white hover:bg-red-700"
          >
            {isPending ? "Loesche..." : "Loeschen"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Einfacher relativer Zeit-Helper auf Deutsch (`gerade eben`, `vor X Minuten`,
 * `vor X Stunden`, `vor X Tagen`). Vermeidet eine date-fns-Dependency fuer
 * V7.6 (nur ein Verwendungsort).
 */
function relativeTimeDE(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diffSeconds = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (diffSeconds < 60) return "gerade eben";
  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) return `vor ${diffMinutes} Min.`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `vor ${diffHours} Std.`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `vor ${diffDays} Tag${diffDays === 1 ? "" : "en"}`;
  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) return `vor ${diffMonths} Mon.`;
  const diffYears = Math.floor(diffMonths / 12);
  return `vor ${diffYears} Jahr${diffYears === 1 ? "" : "en"}`;
}
