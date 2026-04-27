"use client";

// =============================================================
// NewTemplateDialog (SLC-533 MT-6)
// =============================================================
// Modal mit zwei Tabs:
//   1. Manuell — Title, Subject, Body, Sprache → createEmailTemplate
//   2. KI-Diktat — Voice oder Text-Prompt → generateEmailTemplate (SLC-532)
//      → Editier-Vorschau → User editiert → Speichern via createEmailTemplate

import {
  useCallback,
  useEffect,
  useState,
  useTransition,
  type FormEvent,
} from "react";
import { Loader2, Sparkles, AlertCircle, FileText } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { VoiceRecordButton } from "@/components/voice/voice-record-button";

import { createEmailTemplate } from "@/app/(app)/settings/template-actions";
import { generateEmailTemplate } from "./template-generate-action";

type Lang = "de" | "en" | "nl";
type ModeTab = "manual" | "ai";

const CATEGORIES = [
  "erstansprache",
  "follow-up",
  "nach-termin",
  "angebot",
  "danke",
  "reaktivierung",
  "sonstige",
] as const;

type NewTemplateDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultLanguage: Lang;
  onCreated: () => void;
};

export function NewTemplateDialog({
  open,
  onOpenChange,
  defaultLanguage,
  onCreated,
}: NewTemplateDialogProps) {
  const [tab, setTab] = useState<ModeTab>("manual");

  // Beim Schliessen: State resetten, sonst behaelt der Dialog alte Werte
  // beim erneuten Oeffnen.
  useEffect(() => {
    if (!open) {
      setTab("manual");
      setTitle("");
      setSubject("");
      setBody("");
      setCategory("");
      setLang(defaultLanguage);
      setAiPrompt("");
      setAiError(null);
      setAiHasResult(false);
      setSaveError(null);
    }
  }, [open, defaultLanguage]);

  // Form-State (geteilt zwischen beiden Tabs — KI-Tab kippt nach generate
  // dieselben Felder, dann editiert der User dort weiter und speichert.)
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState("");
  const [lang, setLang] = useState<Lang>(defaultLanguage);

  // KI-Generator
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiHasResult, setAiHasResult] = useState(false);
  const [aiPending, startAiTransition] = useTransition();

  // Save
  const [savePending, startSaveTransition] = useTransition();
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleAiVoice = useCallback((text: string) => {
    setAiPrompt((p) => (p ? `${p} ${text}`.trim() : text));
  }, []);

  const handleGenerate = useCallback(() => {
    setAiError(null);
    if (aiPrompt.trim().length < 5) {
      setAiError("Bitte mindestens 5 Zeichen Anweisung.");
      return;
    }
    startAiTransition(async () => {
      const res = await generateEmailTemplate(aiPrompt.trim(), lang);
      if (!res.success || !res.data) {
        setAiError(res.error || "KI-Anfrage fehlgeschlagen.");
        return;
      }
      setTitle(res.data.title);
      setSubject(res.data.subject);
      setBody(res.data.body);
      if (res.data.suggestedCategory) {
        setCategory(res.data.suggestedCategory);
      }
      setAiHasResult(true);
    });
  }, [aiPrompt, lang]);

  const handleSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      setSaveError(null);

      if (!title.trim() || !subject.trim() || !body.trim()) {
        setSaveError("Titel, Betreff und Body sind Pflicht.");
        return;
      }

      startSaveTransition(async () => {
        const formData = new FormData();
        formData.append("title", title.trim());
        formData.append("language", lang);
        if (category) formData.append("category", category);
        // Sprach-spezifische Felder befuellen
        formData.append(`subject_${lang}`, subject.trim());
        formData.append(`body_${lang}`, body.trim());

        const res = await createEmailTemplate(formData);
        if (res.error) {
          setSaveError(res.error);
          return;
        }
        onCreated();
        onOpenChange(false);
      });
    },
    [title, subject, body, category, lang, onCreated, onOpenChange],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader className="flex flex-row items-start gap-3 space-y-0">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#120774] to-[#4454b8] shadow-sm">
            <FileText className="h-5 w-5 text-white" strokeWidth={2.5} />
          </div>
          <div className="flex-1 pt-0.5">
            <DialogTitle className="text-lg font-bold text-slate-900">Neue Vorlage</DialogTitle>
            <DialogDescription className="text-xs font-medium text-slate-500">
              Erstelle eine eigene Vorlage manuell oder lasse die KI einen Entwurf generieren — du kannst danach alles editieren.
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="flex gap-1 rounded-lg border-2 border-slate-200 bg-slate-50 p-1 text-xs font-bold">
          {(
            [
              { key: "manual" as const, label: "Manuell" },
              { key: "ai" as const, label: "KI-Diktat" },
            ]
          ).map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => setTab(opt.key)}
              className={
                tab === opt.key
                  ? "flex-1 rounded-md bg-white px-3 py-2 text-[#120774] shadow-sm transition-all"
                  : "flex-1 rounded-md px-3 py-2 text-slate-500 transition-all hover:text-slate-900"
              }
            >
              {opt.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {tab === "ai" && !aiHasResult && (
            <div className="space-y-3 rounded-xl border-2 border-[#4454b8]/30 bg-gradient-to-br from-[#4454b8]/5 to-white p-4 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="ai-prompt" className="text-xs font-bold uppercase tracking-wide text-slate-600">
                  Was soll die Vorlage tun?
                </Label>
                <VoiceRecordButton onTranscript={handleAiVoice} />
              </div>
              <Textarea
                id="ai-prompt"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                rows={3}
                placeholder="z.B. Erstansprache fuer Steuerberater im Mittelstand mit Verweis auf Co-Innovation"
                className="border-2 rounded-lg"
              />
              <div className="flex items-center justify-between gap-2">
                <select
                  value={lang}
                  onChange={(e) => setLang(e.target.value as Lang)}
                  className="rounded-lg border-2 border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition-all focus:border-[#4454b8] focus:outline-none focus:ring-2 focus:ring-[#4454b8]/20"
                >
                  <option value="de">Deutsch</option>
                  <option value="en">English</option>
                  <option value="nl">Nederlands</option>
                </select>
                <Button
                  type="button"
                  onClick={handleGenerate}
                  disabled={aiPending || aiPrompt.trim().length < 5}
                  className="gap-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold shadow-sm hover:shadow-md transition-all"
                >
                  {aiPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2.5} />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5" strokeWidth={2.5} />
                  )}
                  Generieren
                </Button>
              </div>
              {aiError && (
                <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={2.5} />
                  <span>{aiError}</span>
                </div>
              )}
            </div>
          )}

          {(tab === "manual" || aiHasResult) && (
            <div className="space-y-3.5">
              <div className="space-y-1.5">
                <Label htmlFor="tpl-title" className="text-xs font-bold uppercase tracking-wide text-slate-600">
                  Titel *
                </Label>
                <Input
                  id="tpl-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className="border-2"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="tpl-language" className="text-xs font-bold uppercase tracking-wide text-slate-600">
                    Sprache
                  </Label>
                  <select
                    id="tpl-language"
                    value={lang}
                    onChange={(e) => setLang(e.target.value as Lang)}
                    className="h-10 w-full rounded-lg border-2 border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition-all focus:border-[#4454b8] focus:outline-none focus:ring-2 focus:ring-[#4454b8]/20"
                  >
                    <option value="de">Deutsch</option>
                    <option value="en">English</option>
                    <option value="nl">Nederlands</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="tpl-category" className="text-xs font-bold uppercase tracking-wide text-slate-600">
                    Kategorie
                  </Label>
                  <select
                    id="tpl-category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="h-10 w-full rounded-lg border-2 border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition-all focus:border-[#4454b8] focus:outline-none focus:ring-2 focus:ring-[#4454b8]/20"
                  >
                    <option value="">— keine —</option>
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="tpl-subject" className="text-xs font-bold uppercase tracking-wide text-slate-600">
                  Betreff *
                </Label>
                <Input
                  id="tpl-subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  required
                  className="border-2"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="tpl-body" className="text-xs font-bold uppercase tracking-wide text-slate-600">
                  Body *
                </Label>
                <Textarea
                  id="tpl-body"
                  rows={8}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  required
                  className="border-2 rounded-lg"
                />
                <p className="text-[10px] font-semibold text-slate-500">
                  Variablen:{" "}
                  <code className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-[#120774]">{"{{vorname}}"}</code>{" "}
                  <code className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-[#120774]">{"{{nachname}}"}</code>{" "}
                  <code className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-[#120774]">{"{{firma}}"}</code>{" "}
                  <code className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-[#120774]">{"{{position}}"}</code>{" "}
                  <code className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-[#120774]">{"{{deal}}"}</code>
                </p>
              </div>

              {aiHasResult && (
                <button
                  type="button"
                  onClick={() => {
                    setAiHasResult(false);
                    setTitle("");
                    setSubject("");
                    setBody("");
                  }}
                  className="text-[11px] font-semibold text-slate-500 underline-offset-2 hover:text-[#120774] hover:underline"
                >
                  ← KI-Prompt aendern und neu generieren
                </button>
              )}
            </div>
          )}

          {saveError && (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={2.5} />
              <span>{saveError}</span>
            </div>
          )}

          <DialogFooter className="gap-2 border-t-2 border-slate-100 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-2"
            >
              Abbrechen
            </Button>
            <Button
              type="submit"
              disabled={
                savePending ||
                (tab === "ai" && !aiHasResult)
              }
              className="bg-gradient-to-r from-[#120774] to-[#4454b8] text-white font-bold shadow-sm hover:shadow-md transition-all"
            >
              {savePending ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" strokeWidth={2.5} />
                  Speichern...
                </>
              ) : (
                "Speichern"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
