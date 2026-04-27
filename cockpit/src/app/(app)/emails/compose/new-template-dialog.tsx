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
import { Loader2, Sparkles, AlertCircle } from "lucide-react";

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
        <DialogHeader>
          <DialogTitle>Neue Vorlage</DialogTitle>
          <DialogDescription>
            Erstelle eine eigene Vorlage manuell oder lasse die KI einen
            Entwurf generieren — du kannst danach alles editieren.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-1 rounded-md bg-slate-100 p-0.5 text-xs font-medium">
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
                  ? "flex-1 rounded bg-white px-3 py-1.5 text-slate-900 shadow-sm"
                  : "flex-1 rounded px-3 py-1.5 text-slate-500 hover:text-slate-900"
              }
            >
              {opt.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {tab === "ai" && !aiHasResult && (
            <div className="space-y-3 rounded-md border border-[#4454b8]/20 bg-[#4454b8]/5 p-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="ai-prompt" className="text-xs">
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
              />
              <div className="flex items-center justify-between gap-2">
                <select
                  value={lang}
                  onChange={(e) => setLang(e.target.value as Lang)}
                  className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs"
                >
                  <option value="de">Deutsch</option>
                  <option value="en">English</option>
                  <option value="nl">Nederlands</option>
                </select>
                <Button
                  type="button"
                  onClick={handleGenerate}
                  disabled={aiPending || aiPrompt.trim().length < 5}
                  className="gap-1.5"
                >
                  {aiPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5" />
                  )}
                  Generieren
                </Button>
              </div>
              {aiError && (
                <div className="flex items-start gap-1.5 rounded bg-red-50 p-2 text-[11px] text-red-700">
                  <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
                  <span>{aiError}</span>
                </div>
              )}
            </div>
          )}

          {(tab === "manual" || aiHasResult) && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="tpl-title" className="text-xs">
                  Titel *
                </Label>
                <Input
                  id="tpl-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="tpl-language" className="text-xs">
                    Sprache
                  </Label>
                  <select
                    id="tpl-language"
                    value={lang}
                    onChange={(e) => setLang(e.target.value as Lang)}
                    className="w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm"
                  >
                    <option value="de">Deutsch</option>
                    <option value="en">English</option>
                    <option value="nl">Nederlands</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="tpl-category" className="text-xs">
                    Kategorie
                  </Label>
                  <select
                    id="tpl-category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm"
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
                <Label htmlFor="tpl-subject" className="text-xs">
                  Betreff *
                </Label>
                <Input
                  id="tpl-subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="tpl-body" className="text-xs">
                  Body *
                </Label>
                <Textarea
                  id="tpl-body"
                  rows={8}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  required
                />
                <p className="text-[10px] text-slate-500">
                  Variablen: <code>{"{{vorname}}"}</code>,{" "}
                  <code>{"{{nachname}}"}</code>,{" "}
                  <code>{"{{firma}}"}</code>,{" "}
                  <code>{"{{position}}"}</code>,{" "}
                  <code>{"{{deal}}"}</code>
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
                  className="text-[11px] text-slate-500 underline-offset-2 hover:text-slate-900 hover:underline"
                >
                  ← KI-Prompt aendern und neu generieren
                </button>
              )}
            </div>
          )}

          {saveError && (
            <div className="flex items-start gap-1.5 rounded bg-red-50 p-2 text-[11px] text-red-700">
              <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
              <span>{saveError}</span>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Abbrechen
            </Button>
            <Button
              type="submit"
              disabled={
                savePending ||
                (tab === "ai" && !aiHasResult)
              }
            >
              {savePending ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
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
