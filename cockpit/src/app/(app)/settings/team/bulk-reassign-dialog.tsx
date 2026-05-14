/**
 * SLC-707 MT-2 — Bulk-Reassign Dialog UI.
 *
 * Flow: Preview → Confirm → Apply.
 *   - Native HTML Form (feedback_native_html_form_pattern)
 *   - useTransition fuer Submit-States
 *   - Inline div fuer Error/Success Feedback (Pattern aus invite-dialog.tsx)
 */

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ArrowRightLeft } from "lucide-react";
import {
  bulkReassignApply,
  bulkReassignPreview,
} from "@/lib/team/bulk-reassign-actions";
import type {
  ApplyResult,
  BulkReassignFilter,
  PreviewResult,
} from "@/lib/team/bulk-reassign";

interface MemberOption {
  user_id: string;
  display_name: string | null;
  email: string | null;
}

interface PipelineOption {
  id: string;
  name: string;
}

interface Props {
  members: MemberOption[];
  pipelines: PipelineOption[];
}

const STATUS_VALUES = [
  { value: "active", label: "Aktiv" },
  { value: "open", label: "Offen" },
  { value: "won", label: "Gewonnen" },
  { value: "lost", label: "Verloren" },
] as const;

function memberLabel(m: MemberOption): string {
  return m.display_name ?? m.email ?? m.user_id;
}

export function BulkReassignDialog({ members, pipelines }: Props) {
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [fromId, setFromId] = useState<string>("");
  const [toId, setToId] = useState<string>("");
  const [pipelineId, setPipelineId] = useState<string>("");
  const [status, setStatus] = useState<string>("");
  const [createdFrom, setCreatedFrom] = useState<string>("");
  const [createdTo, setCreatedTo] = useState<string>("");

  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  const [isPreviewPending, startPreviewTransition] = useTransition();
  const [isApplyPending, startApplyTransition] = useTransition();

  function resetForm() {
    setFromId("");
    setToId("");
    setPipelineId("");
    setStatus("");
    setCreatedFrom("");
    setCreatedTo("");
    setPreview(null);
    setError(null);
    setSuccess(null);
    setShowConfirm(false);
  }

  function buildFilter(): BulkReassignFilter {
    const f: BulkReassignFilter = {};
    if (pipelineId) f.pipeline_id = pipelineId;
    if (status) f.status = status;
    if (createdFrom) f.created_at_from = createdFrom;
    if (createdTo) f.created_at_to = createdTo;
    return f;
  }

  function handlePreview(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setPreview(null);

    if (!fromId || !toId) {
      setError("Bitte Quell- und Ziel-User auswaehlen.");
      return;
    }
    if (fromId === toId) {
      setError("Quell- und Ziel-User muessen unterschiedlich sein.");
      return;
    }

    startPreviewTransition(async () => {
      const result = await bulkReassignPreview({
        from: fromId,
        to: toId,
        filter: buildFilter(),
      });
      setPreview(result);
      if (!result.ok) setError(result.error);
    });
  }

  function handleApply() {
    if (!preview || !preview.ok || preview.total === 0) return;
    startApplyTransition(async () => {
      const result: ApplyResult = await bulkReassignApply({
        from: fromId,
        to: toId,
        filter: buildFilter(),
      });
      setShowConfirm(false);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      const fromMember = members.find((m) => m.user_id === fromId);
      const toMember = members.find((m) => m.user_id === toId);
      setSuccess(
        `${result.total} Records von ${fromMember ? memberLabel(fromMember) : fromId} zu ${
          toMember ? memberLabel(toMember) : toId
        } verschoben.`,
      );
      setPreview(null);
      setTimeout(() => {
        setOpen(false);
        resetForm();
        router.refresh();
      }, 1500);
    });
  }

  const targetOptions = members.filter((m) => m.user_id !== fromId);
  const fromMember = members.find((m) => m.user_id === fromId);
  const toMember = members.find((m) => m.user_id === toId);
  const previewTotal =
    preview && preview.ok ? preview.total : 0;
  const previewTables =
    preview && preview.ok ? preview.tables.filter((t) => t.count > 0) : [];

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) resetForm();
      }}
    >
      <DialogTrigger
        render={
          <Button variant="outline">
            <ArrowRightLeft className="mr-2 h-4 w-4" />
            Bulk-Reassign
          </Button>
        }
      />
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Records zwischen Mitgliedern verschieben</DialogTitle>
          <DialogDescription>
            Verschiebt Owner-Records (Deals, Aktivitaeten, Meetings, Angebote, etc.) von einem Mitglied zu einem anderen.
            Erst Vorschau anzeigen, dann mit Bestaetigung uebernehmen.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handlePreview} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Quell-User (from)</label>
              <Select
                value={fromId}
                onValueChange={(v: string | null) => {
                  if (v) {
                    setFromId(v);
                    setPreview(null);
                    if (v === toId) setToId("");
                  }
                }}
                disabled={isPreviewPending || isApplyPending}
              >
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {fromMember ? memberLabel(fromMember) : "Bitte waehlen…"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {members.map((m) => (
                    <SelectItem key={m.user_id} value={m.user_id}>
                      {memberLabel(m)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Ziel-User (to)</label>
              <Select
                value={toId}
                onValueChange={(v: string | null) => {
                  if (v) {
                    setToId(v);
                    setPreview(null);
                  }
                }}
                disabled={isPreviewPending || isApplyPending || !fromId}
              >
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {toMember ? memberLabel(toMember) : "Bitte waehlen…"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {targetOptions.map((m) => (
                    <SelectItem key={m.user_id} value={m.user_id}>
                      {memberLabel(m)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <fieldset className="space-y-3 rounded-lg border border-slate-200/60 bg-slate-50/40 p-4">
            <legend className="px-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Filter (optional, schraenkt das Verschieben pro Tabelle ein)
            </legend>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Pipeline</label>
                <Select
                  value={pipelineId}
                  onValueChange={(v: string | null) => {
                    setPipelineId(v ?? "");
                    setPreview(null);
                  }}
                  disabled={isPreviewPending || isApplyPending}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue>
                      {pipelineId
                        ? (pipelines.find((p) => p.id === pipelineId)?.name ?? pipelineId)
                        : "Alle Pipelines"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {pipelines.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Deal-Status</label>
                <Select
                  value={status}
                  onValueChange={(v: string | null) => {
                    setStatus(v ?? "");
                    setPreview(null);
                  }}
                  disabled={isPreviewPending || isApplyPending}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue>
                      {status
                        ? (STATUS_VALUES.find((s) => s.value === status)?.label ?? status)
                        : "Alle Status"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_VALUES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <label
                  htmlFor="reassign-created-from"
                  className="text-sm font-medium text-slate-700"
                >
                  Erstellt ab
                </label>
                <input
                  id="reassign-created-from"
                  type="date"
                  value={createdFrom}
                  onChange={(e) => {
                    setCreatedFrom(e.target.value);
                    setPreview(null);
                  }}
                  disabled={isPreviewPending || isApplyPending}
                  className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50"
                />
              </div>
              <div className="space-y-1.5">
                <label
                  htmlFor="reassign-created-to"
                  className="text-sm font-medium text-slate-700"
                >
                  Erstellt bis (exklusiv)
                </label>
                <input
                  id="reassign-created-to"
                  type="date"
                  value={createdTo}
                  onChange={(e) => {
                    setCreatedTo(e.target.value);
                    setPreview(null);
                  }}
                  disabled={isPreviewPending || isApplyPending}
                  className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50"
                />
              </div>
            </div>
          </fieldset>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              {error}
            </div>
          )}
          {success && (
            <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
              {success}
            </div>
          )}

          {preview && preview.ok && previewTotal > 0 && (
            <div className="rounded-lg border border-slate-200 bg-white p-3">
              <div className="mb-2 flex items-center justify-between">
                <div className="text-sm font-semibold text-slate-800">Vorschau</div>
                <div className="text-sm text-slate-600">
                  Total: <span className="font-semibold text-slate-900">{previewTotal}</span> Records
                </div>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                    <th className="py-1">Tabelle</th>
                    <th className="py-1 text-right">Records</th>
                  </tr>
                </thead>
                <tbody>
                  {previewTables.map((t) => (
                    <tr key={t.name} className="border-t border-slate-100">
                      <td className="py-1 text-slate-700">{t.name}</td>
                      <td className="py-1 text-right font-mono text-slate-900">{t.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {preview && preview.ok && previewTotal === 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              Keine Records mit dieser Auswahl gefunden — Filter oder Quell-User anpassen.
            </div>
          )}

          <DialogFooter>
            <DialogClose
              render={
                <Button
                  type="button"
                  variant="outline"
                  disabled={isPreviewPending || isApplyPending}
                >
                  Abbrechen
                </Button>
              }
            />
            <Button
              type="submit"
              variant="outline"
              disabled={
                isPreviewPending || isApplyPending || !fromId || !toId || fromId === toId
              }
            >
              {isPreviewPending ? "Vorschau laeuft…" : "Vorschau"}
            </Button>
            <Button
              type="button"
              disabled={
                isPreviewPending ||
                isApplyPending ||
                !preview ||
                !preview.ok ||
                previewTotal === 0
              }
              onClick={() => setShowConfirm(true)}
            >
              Reassign starten
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>

      {/* Confirm-Dialog innerhalb des Parent-Dialog-Trees, oeffnet nur wenn previewTotal > 0 */}
      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Bulk-Reassign bestaetigen</DialogTitle>
            <DialogDescription>
              {previewTotal} Records von{" "}
              <span className="font-semibold">
                {fromMember ? memberLabel(fromMember) : fromId}
              </span>{" "}
              zu{" "}
              <span className="font-semibold">
                {toMember ? memberLabel(toMember) : toId}
              </span>{" "}
              verschieben?
            </DialogDescription>
          </DialogHeader>
          {previewTotal > 1000 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              Achtung: Grosse Migration ({previewTotal} Records). Kann mehrere Sekunden dauern.
            </div>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={isApplyPending}
              onClick={() => setShowConfirm(false)}
            >
              Abbrechen
            </Button>
            <Button type="button" disabled={isApplyPending} onClick={handleApply}>
              {isApplyPending ? "Verschiebe…" : "Jetzt verschieben"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
