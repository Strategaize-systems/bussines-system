"use client";

// =============================================================
// InlineEditDialog (SLC-535 MT-3)
// =============================================================
// Modal mit drei Phasen:
//   1. Recording — Voice-Diktat (oder Textarea-Fallback) mit konkreter
//      Anweisung wie "ergaenze nach Satz 3 folgendes: ..."
//   2. Loading — KI denkt nach (Bedrock-Call ueber applyInlineEdit)
//   3. Diff-Vorschau — alter vs. neuer Body, Akzeptieren / Verwerfen
//
// Fehlerpfade: leere Transkription / KI-Antwort nicht parsebar / KI hat
// nichts geaendert. In allen Faellen bleibt der Modal offen, der User kann
// erneut diktieren.

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { diffWords, type Change } from "diff";
import {
  AlertCircle,
  Check,
  Loader2,
  Mic2,
  RefreshCcw,
  Sparkles,
  X,
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { VoiceRecordButton } from "@/components/voice/voice-record-button";

import { applyInlineEdit } from "./inline-edit-action";

type Lang = "de" | "en" | "nl";
type Phase = "recording" | "loading" | "diff";

type InlineEditDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  originalBody: string;
  language: Lang;
  onAccept: (newBody: string) => void;
};

export function InlineEditDialog({
  open,
  onOpenChange,
  originalBody,
  language,
  onAccept,
}: InlineEditDialogProps) {
  const [phase, setPhase] = useState<Phase>("recording");
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [newBody, setNewBody] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);

  const [pending, startTransition] = useTransition();

  // Beim Schliessen kompletten State resetten, damit das naechste Oeffnen
  // sauber bei Recording startet.
  useEffect(() => {
    if (!open) {
      setPhase("recording");
      setTranscript("");
      setError(null);
      setNewBody(null);
      setSummary(null);
    }
  }, [open]);

  const handleVoiceTranscript = useCallback((text: string) => {
    // Voice-Input wird an den bestehenden Transkript-Text angehaengt — der
    // User kann mehrfach diktieren, falls die erste Version unklar war.
    setTranscript((prev) => (prev ? `${prev} ${text}`.trim() : text));
  }, []);

  const handleApply = useCallback(() => {
    setError(null);
    const trimmed = transcript.trim();
    if (trimmed.length === 0) {
      setError("Keine Anweisung — bitte zuerst diktieren oder eintippen.");
      return;
    }
    setPhase("loading");
    startTransition(async () => {
      const res = await applyInlineEdit(originalBody, trimmed, language);
      if (!res.success || !res.data) {
        setError(res.error);
        setPhase("recording");
        return;
      }
      setNewBody(res.data.newBody);
      setSummary(res.data.summary);
      setPhase("diff");
    });
  }, [transcript, originalBody, language]);

  const handleAccept = useCallback(() => {
    if (newBody === null) return;
    onAccept(newBody);
    onOpenChange(false);
  }, [newBody, onAccept, onOpenChange]);

  const handleRetry = useCallback(() => {
    setPhase("recording");
    setNewBody(null);
    setSummary(null);
    setError(null);
  }, []);

  // Wort-basierter Diff fuer die Vorschau. Sicher fuer DE-Texte; bei sehr
  // langen Bodies (>20k) ohnehin abgewiesen vom Server.
  const diff: Change[] = useMemo(() => {
    if (newBody === null) return [];
    return diffWords(originalBody, newBody);
  }, [originalBody, newBody]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader className="flex flex-row items-start gap-3 space-y-0">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#120774] to-[#4454b8] shadow-sm">
            <Mic2 className="h-5 w-5 text-white" strokeWidth={2.5} />
          </div>
          <div className="flex-1 pt-0.5">
            <DialogTitle className="text-lg font-bold text-slate-900">
              Inline-Edit-Diktat
            </DialogTitle>
            <DialogDescription className="text-xs font-medium text-slate-500">
              Sprich oder tippe eine konkrete Anweisung — z.B. &quot;nach dem
              ersten Satz folgendes einbauen: …&quot;. Die KI liefert eine
              Vorschau, du entscheidest.
            </DialogDescription>
          </div>
        </DialogHeader>

        {phase === "recording" && (
          <div className="space-y-4">
            <div className="space-y-3 rounded-xl border-2 border-[#4454b8]/30 bg-gradient-to-br from-[#4454b8]/5 to-white p-4 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <Label
                  htmlFor="inline-edit-transcript"
                  className="text-xs font-bold uppercase tracking-wide text-slate-600"
                >
                  Anweisung
                </Label>
                <VoiceRecordButton onTranscript={handleVoiceTranscript} />
              </div>
              <Textarea
                id="inline-edit-transcript"
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                rows={3}
                placeholder="z.B. Nach dem ersten Satz folgendes einbauen: Ich habe die Unterlagen vorbereitet."
                className="border-2 rounded-lg"
              />
              <p className="text-[10px] font-semibold text-slate-500">
                Tipp: Sei konkret. &quot;Nach Satz X einfuegen / Schluss durch Y
                ersetzen / Begruessung entfernen.&quot;
              </p>
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
                <AlertCircle
                  className="mt-0.5 h-3.5 w-3.5 shrink-0"
                  strokeWidth={2.5}
                />
                <span>{error}</span>
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
                type="button"
                onClick={handleApply}
                disabled={pending || transcript.trim().length === 0}
                className="bg-gradient-to-r from-[#120774] to-[#4454b8] text-white font-bold shadow-sm hover:shadow-md transition-all"
              >
                <Sparkles className="mr-1.5 h-3.5 w-3.5" strokeWidth={2.5} />
                Vorschau erstellen
              </Button>
            </DialogFooter>
          </div>
        )}

        {phase === "loading" && (
          <div className="flex flex-col items-center justify-center gap-3 py-12">
            <Loader2
              className="h-10 w-10 animate-spin text-[#4454b8]"
              strokeWidth={2.5}
            />
            <p className="text-sm font-bold text-slate-900">
              KI denkt nach…
            </p>
            <p className="text-xs font-medium text-slate-500">
              Bedrock modifiziert den Body gemaess Anweisung.
            </p>
          </div>
        )}

        {phase === "diff" && newBody !== null && (
          <div className="space-y-4">
            <div className="space-y-2 rounded-xl border-2 border-slate-200 bg-slate-50 p-4 shadow-sm">
              <Label className="text-xs font-bold uppercase tracking-wide text-slate-600">
                Aenderung im Vergleich
              </Label>
              <div className="max-h-[360px] overflow-y-auto rounded-lg border-2 border-white bg-white p-4 text-sm leading-relaxed text-slate-800">
                <DiffView changes={diff} />
              </div>
              <div className="flex items-start gap-2 rounded-lg border border-[#4454b8]/20 bg-[#4454b8]/5 px-3 py-2 text-xs font-medium text-[#120774]">
                <Sparkles
                  className="mt-0.5 h-3.5 w-3.5 shrink-0"
                  strokeWidth={2.5}
                />
                <span>
                  <span className="font-bold uppercase tracking-wide text-[10px]">
                    KI-Aenderung:
                  </span>{" "}
                  {summary}
                </span>
              </div>
            </div>

            <DialogFooter className="gap-2 border-t-2 border-slate-100 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleRetry}
                className="border-2"
              >
                <RefreshCcw className="mr-1.5 h-3.5 w-3.5" strokeWidth={2.5} />
                Anweisung aendern
              </Button>
              <div className="flex flex-1 items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  className="border-2 border-slate-300 text-slate-700"
                >
                  <X className="mr-1.5 h-3.5 w-3.5" strokeWidth={2.5} />
                  Verwerfen
                </Button>
                <Button
                  type="button"
                  onClick={handleAccept}
                  className="bg-gradient-to-r from-[#00a84f] to-[#4dcb8b] text-white font-bold shadow-sm hover:shadow-md transition-all"
                >
                  <Check className="mr-1.5 h-3.5 w-3.5" strokeWidth={2.5} />
                  Akzeptieren
                </Button>
              </div>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// =============================================================
// DiffView — rendert eine diffWords-Change-Liste als HTML
// =============================================================
//   added   → gruen unterlegt
//   removed → rot, durchgestrichen
//   sonst   → unveraendert
//
// Whitespace bleibt erhalten (whitespace-pre-wrap am Container), damit
// Zeilenumbrueche im Body sichtbar bleiben.

function DiffView({ changes }: { changes: Change[] }) {
  return (
    <div className="whitespace-pre-wrap break-words">
      {changes.map((part, idx) => {
        if (part.added) {
          return (
            <ins
              key={idx}
              className="rounded bg-emerald-100 px-0.5 text-emerald-900 no-underline"
            >
              {part.value}
            </ins>
          );
        }
        if (part.removed) {
          return (
            <del key={idx} className="rounded bg-red-100 px-0.5 text-red-900">
              {part.value}
            </del>
          );
        }
        return <span key={idx}>{part.value}</span>;
      })}
    </div>
  );
}
