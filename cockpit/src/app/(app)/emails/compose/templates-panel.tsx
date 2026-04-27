"use client";

// =============================================================
// Templates-Panel — linke Spalte des Composing-Studios (SLC-533 MT-3)
// =============================================================
// Filter-Tabs (System/Eigene/Alle), optionaler Category-Filter, Klick wendet
// Vorlage auf Compose-Form an (mit Variablen-Replace), Duplicate-Button bei
// Systemvorlagen, "+ Neue Vorlage" oeffnet NewTemplateDialog.

import { useMemo, useState, useTransition } from "react";
import { Copy, Loader2, Plus, Sparkles, Trash2 } from "lucide-react";

import {
  type EmailTemplate,
  type TemplateFilter,
  duplicateSystemTemplate,
  deleteEmailTemplate,
} from "@/app/(app)/settings/template-actions";
import {
  applyPlaceholders,
  type PlaceholderValues,
} from "@/lib/email/placeholders";
import { Badge } from "@/components/ui/badge";

type Lang = "de" | "en" | "nl";

type TemplatesPanelProps = {
  templates: EmailTemplate[];
  placeholderValues: PlaceholderValues;
  preferredLanguage: Lang;
  onApply: (args: { subject: string; body: string; templateId: string; language: Lang }) => void;
  onCreateClick: () => void;
  onTemplatesChanged: () => void;
};

function bodyForLang(t: EmailTemplate, lang: Lang): string {
  const langKey = `body_${lang}` as const;
  return (t[langKey] as string | null) || t.body_de || t.body_en || t.body_nl || "";
}

function subjectForLang(t: EmailTemplate, lang: Lang): string {
  const langKey = `subject_${lang}` as const;
  return (t[langKey] as string | null) || t.subject_de || t.subject_en || t.subject_nl || "";
}

export function TemplatesPanel({
  templates,
  placeholderValues,
  preferredLanguage,
  onApply,
  onCreateClick,
  onTemplatesChanged,
}: TemplatesPanelProps) {
  const [filter, setFilter] = useState<TemplateFilter>("all");
  const [category, setCategory] = useState<string>("");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const t of templates) {
      if (t.category) set.add(t.category);
    }
    return Array.from(set).sort();
  }, [templates]);

  const filtered = useMemo(() => {
    return templates.filter((t) => {
      if (filter === "system" && !t.is_system) return false;
      if (filter === "own" && t.is_system) return false;
      if (category && t.category !== category) return false;
      return true;
    });
  }, [templates, filter, category]);

  const handleApply = (t: EmailTemplate) => {
    const lang: Lang = ((t.language as Lang) ||
      (preferredLanguage as Lang) ||
      "de") as Lang;
    const subject = applyPlaceholders(subjectForLang(t, lang), placeholderValues);
    const body = applyPlaceholders(bodyForLang(t, lang), placeholderValues);
    onApply({ subject, body, templateId: t.id, language: lang });
  };

  const handleDuplicate = (id: string) => {
    setPendingId(id);
    startTransition(async () => {
      const res = await duplicateSystemTemplate(id);
      setPendingId(null);
      if (res.error) {
        alert(`Duplizieren fehlgeschlagen: ${res.error}`);
        return;
      }
      onTemplatesChanged();
    });
  };

  const handleDelete = (id: string, title: string) => {
    if (!confirm(`Vorlage "${title}" wirklich loeschen?`)) return;
    setPendingId(id);
    startTransition(async () => {
      const res = await deleteEmailTemplate(id);
      setPendingId(null);
      if (res.error) {
        alert(`Loeschen fehlgeschlagen: ${res.error}`);
        return;
      }
      onTemplatesChanged();
    });
  };

  return (
    <div className="flex h-full flex-col gap-3 rounded-lg border border-slate-200 bg-white p-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">Vorlagen</h3>
        <button
          type="button"
          onClick={onCreateClick}
          className="flex items-center gap-1 rounded-md bg-[#4454b8] px-2 py-1 text-[11px] font-medium text-white hover:bg-[#3a4798]"
        >
          <Plus className="h-3 w-3" />
          Neu
        </button>
      </div>

      <div className="flex gap-1 rounded-md bg-slate-100 p-0.5 text-[11px] font-medium">
        {(
          [
            { key: "all", label: "Alle" },
            { key: "system", label: "System" },
            { key: "own", label: "Eigene" },
          ] as const
        ).map((opt) => (
          <button
            key={opt.key}
            type="button"
            onClick={() => setFilter(opt.key)}
            className={
              filter === opt.key
                ? "flex-1 rounded bg-white px-2 py-1 text-slate-900 shadow-sm"
                : "flex-1 rounded px-2 py-1 text-slate-500 hover:text-slate-900"
            }
          >
            {opt.label}
          </button>
        ))}
      </div>

      {categories.length > 0 && (
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700"
        >
          <option value="">Alle Kategorien</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      )}

      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="rounded-md border border-dashed border-slate-200 p-4 text-center text-xs text-slate-500">
            Keine Vorlagen in dieser Auswahl.
          </div>
        ) : (
          <ul className="space-y-2">
            {filtered.map((t) => {
              const isPendingThis = pendingId === t.id && isPending;
              return (
                <li
                  key={t.id}
                  className="group rounded-md border border-slate-200 bg-white p-2 transition-colors hover:border-[#4454b8]/40 hover:bg-[#4454b8]/5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => handleApply(t)}
                      className="flex-1 text-left"
                      disabled={isPendingThis}
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-medium text-slate-900">
                          {t.title}
                        </span>
                        {t.is_system && (
                          <Badge
                            className="bg-[#4454b8]/10 text-[10px] text-[#4454b8] hover:bg-[#4454b8]/20"
                          >
                            System
                          </Badge>
                        )}
                      </div>
                      {(t.category || t.language) && (
                        <div className="mt-1 flex items-center gap-2 text-[10px] text-slate-500">
                          {t.category && <span>{t.category}</span>}
                          {t.language && (
                            <span className="uppercase">{t.language}</span>
                          )}
                        </div>
                      )}
                    </button>

                    <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      {t.is_system ? (
                        <button
                          type="button"
                          onClick={() => handleDuplicate(t.id)}
                          disabled={isPendingThis}
                          title="Als eigene Vorlage duplizieren"
                          className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                        >
                          {isPendingThis ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleDelete(t.id, t.title)}
                          disabled={isPendingThis}
                          title="Loeschen"
                          className="rounded p-1 text-slate-500 hover:bg-red-50 hover:text-red-700"
                        >
                          {isPendingThis ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Trash2 className="h-3 w-3" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="flex items-center gap-1 text-[10px] text-slate-400">
        <Sparkles className="h-3 w-3" />
        Klick auf eine Vorlage uebernimmt Betreff und Body in die Mitte.
      </div>
    </div>
  );
}
