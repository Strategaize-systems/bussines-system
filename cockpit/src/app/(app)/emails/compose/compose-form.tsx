"use client";

// =============================================================
// ComposeForm — Erfassen-Spalte des Composing-Studios (SLC-533 MT-4)
// =============================================================
// Felder An, Betreff, Body, Follow-up
// + KI-Vorschlag An/Betreff (deterministisch via recipientSuggest)
// + KI-Improve-Buttons (Korrektur, Formaler, Kuerzen) — wiederverwendet aus
//   email-compose.tsx
// + Voice-Recording-Button (anhaengen) — bestehender VoiceRecordButton
// + Inline-Edit-Diktat-Button als Placeholder (kommt in SLC-535)

import { useCallback, useState, useTransition } from "react";
import {
  Sparkles,
  Loader2,
  Check,
  Wand2,
  Mic2,
  AlertCircle,
} from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { VoiceRecordButton } from "@/components/voice/voice-record-button";

import { recipientSuggest } from "./recipient-suggest";

type Lang = "de" | "en" | "nl";
type ImproveMode = "correct" | "formal" | "summarize";

type ComposeFormProps = {
  to: string;
  subject: string;
  body: string;
  followUpDate: string;
  onChange: (changes: {
    to?: string;
    subject?: string;
    body?: string;
    followUpDate?: string;
  }) => void;
  dealId: string | null;
  contactId: string | null;
  companyId: string | null;
  templateId: string | null;
  language: Lang;
};

const IMPROVE_LABEL: Record<ImproveMode, string> = {
  correct: "Korrektur",
  formal: "Formaler",
  summarize: "Kuerzen",
};

export function ComposeForm({
  to,
  subject,
  body,
  followUpDate,
  onChange,
  dealId,
  contactId,
  companyId,
  templateId,
  language,
}: ComposeFormProps) {
  const [improving, setImproving] = useState<ImproveMode | null>(null);
  const [improveResult, setImproveResult] = useState<string[] | null>(null);
  const [improveError, setImproveError] = useState<string | null>(null);

  const [suggestPending, startSuggestTransition] = useTransition();
  const [suggestNote, setSuggestNote] = useState<string | null>(null);

  const handleVoiceTranscript = useCallback(
    (text: string) => {
      onChange({ body: body ? `${body} ${text}`.trim() : text });
    },
    [body, onChange],
  );

  const handleSuggest = useCallback(() => {
    if (!dealId) {
      setSuggestNote("Kein Deal-Kontext — Vorschlag nicht moeglich.");
      return;
    }
    setSuggestNote(null);
    startSuggestTransition(async () => {
      const res = await recipientSuggest(dealId);
      const changes: { to?: string; subject?: string } = {};
      if (res.to) changes.to = res.to;
      if (res.subject && !subject) changes.subject = res.subject;
      if (Object.keys(changes).length === 0) {
        setSuggestNote("Kein Vorschlag verfuegbar.");
      } else {
        onChange(changes);
        setSuggestNote(
          res.source === "inbound-mail"
            ? "Vorschlag aus letzter Inbound-Mail."
            : res.source === "primary-contact"
            ? "Vorschlag aus Primary-Contact des Deals."
            : null,
        );
      }
    });
  }, [dealId, onChange, subject]);

  const handleImprove = useCallback(
    async (mode: ImproveMode) => {
      if (!body.trim() || improving) return;

      setImproving(mode);
      setImproveResult(null);
      setImproveError(null);

      try {
        const res = await fetch("/api/ai/query", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "email-improve",
            context: { text: body, mode },
          }),
        });

        if (!res.ok) {
          setImproveError("KI-Verbesserung nicht verfuegbar.");
          return;
        }

        const data = await res.json();
        if (data.success && data.data) {
          onChange({ body: data.data.improvedText });
          setImproveResult(data.data.changes ?? []);
        } else {
          setImproveError(data.error || "Fehler bei KI-Verbesserung.");
        }
      } catch {
        setImproveError("Verbindungsfehler.");
      } finally {
        setImproving(null);
      }
    },
    [body, improving, onChange],
  );

  return (
    <div className="flex h-full flex-col gap-4 rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-900">Erfassen</h3>
        {dealId && (
          <button
            type="button"
            onClick={handleSuggest}
            disabled={suggestPending}
            className="flex items-center gap-1.5 rounded-md border border-[#4454b8]/40 bg-white px-2 py-1 text-[11px] font-medium text-[#4454b8] hover:bg-[#4454b8]/5 disabled:opacity-40"
            title="An / Betreff aus Deal-Kontext vorschlagen"
          >
            {suggestPending ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Wand2 className="h-3 w-3" />
            )}
            KI-Vorschlag An / Betreff
          </button>
        )}
      </div>

      {suggestNote && (
        <div className="flex items-start gap-1.5 rounded-md bg-slate-50 p-2 text-[11px] text-slate-600">
          <Check className="mt-0.5 h-3 w-3 shrink-0 text-[#4454b8]" />
          <span>{suggestNote}</span>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="compose-to">An</Label>
        <Input
          id="compose-to"
          type="email"
          value={to}
          onChange={(e) => onChange({ to: e.target.value })}
          placeholder="empfaenger@example.com"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="compose-subject">Betreff</Label>
        <Input
          id="compose-subject"
          type="text"
          value={subject}
          onChange={(e) => onChange({ subject: e.target.value })}
          placeholder="Betreff der E-Mail"
        />
      </div>

      <div className="flex flex-1 flex-col space-y-2">
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor="compose-body">Nachricht</Label>
          <div className="flex items-center gap-2">
            <VoiceRecordButton onTranscript={handleVoiceTranscript} />
            {/* Inline-Edit-Diktat — Placeholder, kommt in SLC-535 */}
            <button
              type="button"
              disabled
              title="Inline-Diktat kommt in SLC-535"
              className="flex items-center gap-1 rounded-md bg-slate-50 px-2 py-1 text-[11px] font-medium text-slate-400"
            >
              <Mic2 className="h-3 w-3" />
              Inline-Diktat
            </button>
          </div>
        </div>
        <Textarea
          id="compose-body"
          rows={10}
          value={body}
          onChange={(e) => onChange({ body: e.target.value })}
          placeholder={
            language === "en"
              ? "Your message..."
              : language === "nl"
              ? "Uw bericht..."
              : "Ihre Nachricht..."
          }
          className="flex-1"
        />

        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase text-slate-400">
            KI:
          </span>
          {(["correct", "formal", "summarize"] as ImproveMode[]).map((mode) => {
            const isThis = improving === mode;
            return (
              <button
                key={mode}
                type="button"
                onClick={() => handleImprove(mode)}
                disabled={!!improving || !body.trim()}
                className="flex items-center gap-1 rounded border border-[#4454b8]/20 px-2 py-1 text-[11px] font-medium text-[#4454b8] transition-colors hover:bg-[#4454b8]/5 disabled:opacity-30"
              >
                {isThis ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Sparkles className="h-3 w-3" />
                )}
                {IMPROVE_LABEL[mode]}
              </button>
            );
          })}
        </div>

        {improveResult && improveResult.length > 0 && (
          <div className="flex items-start gap-1.5 rounded p-2 text-[11px] text-green-700 bg-green-50">
            <Check className="mt-0.5 h-3 w-3 shrink-0" />
            <span>{improveResult.join(" - ")}</span>
          </div>
        )}

        {improveError && (
          <div className="flex items-start gap-1.5 rounded bg-red-50 p-2 text-[11px] text-red-700">
            <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
            <span>{improveError}</span>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="compose-followup">Follow-up am</Label>
        <Input
          id="compose-followup"
          type="date"
          value={followUpDate}
          onChange={(e) => onChange({ followUpDate: e.target.value })}
        />
      </div>

      <div className="rounded-md border border-dashed border-slate-200 p-3 text-center text-[11px] text-slate-500">
        Senden-Button kommt in SLC-534 — Live-Preview + sendEmailWithTracking-Wiring.
        {templateId && (
          <span className="ml-1 text-slate-400">
            (Vorlage angewendet: {templateId.slice(0, 8)}...)
          </span>
        )}
        {contactId && (
          <span className="ml-1 hidden text-slate-400">
            contact={contactId.slice(0, 8)}
          </span>
        )}
        {companyId && (
          <span className="ml-1 hidden text-slate-400">
            company={companyId.slice(0, 8)}
          </span>
        )}
      </div>
    </div>
  );
}
