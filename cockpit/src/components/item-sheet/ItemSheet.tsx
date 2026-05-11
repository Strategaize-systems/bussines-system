"use client";

// SLC-665 MT-3+MT-4 (DEC-170) — Generic Detail Sheet
//
// State-controlled Sheet, das je nach `data.kind` unterschiedliche Bodies
// rendert. Tasks: keine eigene Detail-Ansicht in V6.6 — der bestehende
// TaskSheet-Create/Edit-Flow auf Mein Tag bleibt unangetastet (DEC-170:
// Sheet oeffnet IMMER, ohne Bedrock-Summary kompakte Basis-Daten als
// Fallback). Activities: zeigt Bedrock-Summary-Sektionen (Risiken /
// Einwaende / Naechste Schritte / Teilnehmer / Zusammenfassung)
// conditional und faellt sonst auf kompakte Basis-Daten zurueck.

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Sparkles } from "lucide-react";
import type { ItemSheetData } from "./types";

interface ItemSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: ItemSheetData | null;
}

export function ItemSheet({ open, onOpenChange, data }: ItemSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{getTitle(data)}</SheetTitle>
        </SheetHeader>
        <div className="px-8 pb-8">
          {data === null ? null : data.kind === "task" ? (
            <TaskBody data={data} />
          ) : (
            <ActivityBody data={data} />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function getTitle(data: ItemSheetData | null): string {
  if (!data) return "";
  if (data.kind === "task") return data.task.title || "Aufgabe";
  return data.activity.title || activityTypeLabel(data.activity.type);
}

function activityTypeLabel(type: string): string {
  const map: Record<string, string> = {
    note: "Notiz",
    call: "Anruf",
    email: "E-Mail",
    inbox: "Empfangene E-Mail",
    meeting: "Meeting",
    stage_change: "Stage-Wechsel",
    task: "Aufgabe",
    signal: "Signal",
    briefing: "Briefing",
  };
  return map[type] ?? "Aktivitaet";
}

function TaskBody({
  data,
}: {
  data: Extract<ItemSheetData, { kind: "task" }>;
}) {
  const t = data.task;
  return (
    <div className="space-y-3 text-sm">
      <MetaRow label="Status" value={t.status} />
      <MetaRow label="Faellig" value={formatDate(t.due_date)} />
      <MetaRow label="Prioritaet" value={t.priority} />
      {t.description ? (
        <div>
          <p className="text-xs font-semibold text-slate-500 mb-1">Details</p>
          <p className="text-sm text-slate-800 whitespace-pre-wrap">
            {t.description}
          </p>
        </div>
      ) : null}
    </div>
  );
}

function ActivityBody({
  data,
}: {
  data: Extract<ItemSheetData, { kind: "activity" }>;
}) {
  const { activity, bedrockSummary, autoReplyHint } = data;
  const hasBedrock =
    bedrockSummary !== undefined &&
    bedrockSummary !== null &&
    (
      (bedrockSummary.risiken?.length ?? 0) > 0 ||
      (bedrockSummary.einwaende?.length ?? 0) > 0 ||
      (bedrockSummary.naechsteSchritte?.length ?? 0) > 0 ||
      (bedrockSummary.teilnehmer?.length ?? 0) > 0 ||
      Boolean(bedrockSummary.zusammenfassung?.trim())
    );

  return (
    <div className="space-y-4 text-sm">
      <MetaRow label="Typ" value={activityTypeLabel(activity.type)} />
      <MetaRow label="Erstellt" value={formatDateTime(activity.created_at)} />

      {!hasBedrock && (activity.description || activity.summary) ? (
        <div>
          <p className="text-xs font-semibold text-slate-500 mb-1">Inhalt</p>
          <p className="text-sm text-slate-800 whitespace-pre-wrap">
            {activity.description || activity.summary}
          </p>
        </div>
      ) : null}

      {autoReplyHint ? (
        <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800">
          Automatische Antwort erkannt — wahrscheinlich Out-of-Office.
        </div>
      ) : null}

      {hasBedrock ? (
        <div className="space-y-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-purple-700">
            <Sparkles className="h-3.5 w-3.5" />
            KI-Zusammenfassung
          </div>

          <BedrockSection
            title="Risiken"
            items={bedrockSummary?.risiken}
          />
          <BedrockSection
            title="Einwaende"
            items={bedrockSummary?.einwaende}
          />
          <BedrockSection
            title="Naechste Schritte"
            items={bedrockSummary?.naechsteSchritte}
          />
          <BedrockSection
            title="Teilnehmer"
            items={bedrockSummary?.teilnehmer}
          />
          {bedrockSummary?.zusammenfassung?.trim() ? (
            <div>
              <p className="text-xs font-semibold text-slate-500 mb-1">
                Zusammenfassung
              </p>
              <p className="text-sm text-slate-800 whitespace-pre-wrap">
                {bedrockSummary.zusammenfassung}
              </p>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function BedrockSection({
  title,
  items,
}: {
  title: string;
  items: string[] | undefined;
}) {
  if (!items || items.length === 0) return null;
  return (
    <div>
      <p className="text-xs font-semibold text-slate-500 mb-1">{title}</p>
      <ul className="list-disc pl-5 space-y-0.5">
        {items.map((it, i) => (
          <li key={i} className="text-sm text-slate-800">
            {it}
          </li>
        ))}
      </ul>
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="flex gap-2 text-sm">
      <span className="text-xs font-semibold text-slate-500 w-20 shrink-0">
        {label}
      </span>
      <span className="text-slate-800">{value}</span>
    </div>
  );
}

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("de-DE");
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
