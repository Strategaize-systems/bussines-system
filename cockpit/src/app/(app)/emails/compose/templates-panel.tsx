"use client";

// =============================================================
// Templates-Panel — linke Spalte des Composing-Studios
// =============================================================
// Style-Guide V2 (BL-403): Card-Frame mit border-2 + shadow-lg, Filter-Tabs
// visuell prominent, Action-Icons immer sichtbar (F-3 Discoverability),
// Default-Filter "system" (F-4 Premium-Anker beim Erst-Oeffnen).

import { useMemo, useState, useTransition } from "react";
import { Copy, FileText, Loader2, Plus, Sparkles, Trash2 } from "lucide-react";

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
  const [filter, setFilter] = useState<TemplateFilter>("system");
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
    <div className="flex h-full flex-col gap-4 rounded-2xl border-2 border-slate-200 bg-white shadow-lg p-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="text-base font-bold text-slate-900">Vorlagen</h3>
          <p className="text-[11px] font-medium text-slate-500">
            Klick wendet Betreff + Body an
          </p>
        </div>
        <button
          type="button"
          onClick={onCreateClick}
          className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#120774] to-[#4454b8] px-3 py-2 text-xs font-bold text-white shadow-sm transition-all hover:shadow-md"
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
          Neu
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1 rounded-lg border-2 border-slate-200 bg-slate-50 p-1 text-xs font-bold">
        {(
          [
            { key: "system", label: "System" },
            { key: "own", label: "Eigene" },
            { key: "all", label: "Alle" },
          ] as const
        ).map((opt) => (
          <button
            key={opt.key}
            type="button"
            onClick={() => setFilter(opt.key)}
            className={
              filter === opt.key
                ? "flex-1 rounded-md bg-white px-3 py-1.5 text-[#120774] shadow-sm transition-all"
                : "flex-1 rounded-md px-3 py-1.5 text-slate-500 transition-all hover:text-slate-900"
            }
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Category Select */}
      {categories.length > 0 && (
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded-lg border-2 border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition-all focus:border-[#4454b8] focus:outline-none focus:ring-2 focus:ring-[#4454b8]/20"
        >
          <option value="">Alle Kategorien</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      )}

      {/* Liste */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-6 text-center">
            <FileText className="h-6 w-6 text-slate-300" strokeWidth={2} />
            <p className="text-xs font-semibold text-slate-500">
              Keine Vorlagen in dieser Auswahl
            </p>
            <p className="text-[10px] text-slate-400">
              Filter wechseln oder neue Vorlage anlegen
            </p>
          </div>
        ) : (
          <ul className="space-y-2.5">
            {filtered.map((t) => {
              const isPendingThis = pendingId === t.id && isPending;
              return (
                <li
                  key={t.id}
                  className="group overflow-hidden rounded-xl border-2 border-slate-200 bg-white shadow-sm transition-all hover:border-[#4454b8] hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-2 p-3">
                    <button
                      type="button"
                      onClick={() => handleApply(t)}
                      className="flex-1 text-left"
                      disabled={isPendingThis}
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-900 transition-colors group-hover:text-[#120774]">
                          {t.title}
                        </span>
                        {t.is_system && (
                          <span className="inline-flex items-center rounded-md border border-[#4454b8]/30 bg-[#4454b8]/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[#4454b8]">
                            System
                          </span>
                        )}
                      </div>
                      {(t.category || t.language) && (
                        <div className="mt-1.5 flex items-center gap-2 text-[10px] font-semibold text-slate-500">
                          {t.category && (
                            <span className="rounded bg-slate-100 px-1.5 py-0.5">{t.category}</span>
                          )}
                          {t.language && (
                            <span className="rounded bg-slate-100 px-1.5 py-0.5 uppercase">
                              {t.language}
                            </span>
                          )}
                        </div>
                      )}
                    </button>

                    <div className="flex shrink-0 items-center gap-1">
                      {t.is_system ? (
                        <button
                          type="button"
                          onClick={() => handleDuplicate(t.id)}
                          disabled={isPendingThis}
                          title="Als eigene Vorlage duplizieren"
                          className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-500 transition-all hover:border-[#4454b8] hover:bg-[#4454b8]/5 hover:text-[#4454b8]"
                        >
                          {isPendingThis ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" strokeWidth={2.5} />
                          )}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleDelete(t.id, t.title)}
                          disabled={isPendingThis}
                          title="Loeschen"
                          className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-500 transition-all hover:border-red-300 hover:bg-red-50 hover:text-red-700"
                        >
                          {isPendingThis ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" strokeWidth={2.5} />
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

      {/* Footer Hint */}
      <div className="flex items-center gap-1.5 rounded-lg bg-slate-50 px-2.5 py-2 text-[10px] font-semibold text-slate-500">
        <Sparkles className="h-3 w-3 text-[#4454b8]" strokeWidth={2.5} />
        Variablen wie {`{{vorname}}`} werden automatisch ersetzt
      </div>
    </div>
  );
}
