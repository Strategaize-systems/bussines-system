"use client";

// =============================================================
// ComposeForm — Erfassen-Spalte des Composing-Studios
// =============================================================
// Felder An, Betreff, Body, Follow-up
// + KI-Vorschlag An/Betreff (deterministisch via recipientSuggest)
// + KI-Improve-Buttons (Korrektur, Formaler, Kuerzen)
// + Voice-Recording-Button (anhaengen) — bestehender VoiceRecordButton
// + Inline-Edit-Diktat-Button (oeffnet InlineEditDialog mit Diff-Vorschau)

import { useCallback, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  Loader2,
  Check,
  Wand2,
  Mic2,
  AlertCircle,
  Send,
} from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { VoiceRecordButton } from "@/components/voice/voice-record-button";

import { recipientSuggest } from "./recipient-suggest";
import { sendComposedEmail } from "./send-action";
import { InlineEditDialog } from "./inline-edit-dialog";
import { AttachmentsSection } from "@/components/email/attachments-section";
import type { AttachmentMeta } from "@/lib/email/attachments-whitelist";

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
  composeSessionId: string;
  attachments: AttachmentMeta[];
  onAddAttachment: (att: AttachmentMeta) => void;
  onRemoveAttachment: (storagePath: string) => void;
  onClearAttachments: () => void;
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
  composeSessionId,
  attachments,
  onAddAttachment,
  onRemoveAttachment,
  onClearAttachments,
}: ComposeFormProps) {
  const router = useRouter();

  const [improving, setImproving] = useState<ImproveMode | null>(null);
  const [improveResult, setImproveResult] = useState<string[] | null>(null);
  const [improveError, setImproveError] = useState<string | null>(null);

  const [suggestPending, startSuggestTransition] = useTransition();
  const [suggestNote, setSuggestNote] = useState<string | null>(null);

  const [sendPending, startSendTransition] = useTransition();
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendWarning, setSendWarning] = useState<string | null>(null);

  const [inlineEditOpen, setInlineEditOpen] = useState(false);

  const handleSend = useCallback(() => {
    setSendError(null);
    setSendWarning(null);

    if (!to.trim()) {
      setSendError("Empfaenger fehlt.");
      return;
    }
    if (!subject.trim()) {
      setSendError("Betreff fehlt.");
      return;
    }

    startSendTransition(async () => {
      const result = await sendComposedEmail({
        to,
        subject,
        body,
        dealId,
        contactId,
        companyId,
        templateId,
        followUpDate: followUpDate || null,
        attachments,
      });

      if (!result.success) {
        setSendError(result.error ?? "Unbekannter Fehler beim Senden.");
        return;
      }

      if (result.warning) {
        setSendWarning(result.warning);
        return;
      }

      // Erfolgreicher Send → Anhang-State im Eltern-Container leeren,
      // damit ein erneuter Page-Use ohne Reload mit sauberem Zustand startet.
      onClearAttachments();
      router.push("/emails");
    });
  }, [
    to,
    subject,
    body,
    dealId,
    contactId,
    companyId,
    templateId,
    followUpDate,
    attachments,
    onClearAttachments,
    router,
  ]);

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
    <div className="flex h-full flex-col gap-5 rounded-2xl border-2 border-slate-200 bg-white shadow-lg p-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-slate-900">Erfassen</h3>
          <p className="text-[11px] font-medium text-slate-500">
            Empfaenger, Betreff und Nachricht — KI hilft beim Vorausfuellen
          </p>
        </div>
        {dealId && (
          <button
            type="button"
            onClick={handleSuggest}
            disabled={suggestPending}
            className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#120774] to-[#4454b8] px-3 py-2 text-xs font-bold text-white shadow-sm transition-all hover:shadow-md disabled:opacity-50"
            title="An / Betreff aus Deal-Kontext vorschlagen"
          >
            {suggestPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2.5} />
            ) : (
              <Wand2 className="h-3.5 w-3.5" strokeWidth={2.5} />
            )}
            KI-Vorschlag An / Betreff
          </button>
        )}
      </div>

      {suggestNote && (
        <div className="flex items-start gap-2 rounded-lg border border-[#4454b8]/20 bg-[#4454b8]/5 px-3 py-2 text-xs font-medium text-[#120774]">
          <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={2.5} />
          <span>{suggestNote}</span>
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="compose-to" className="text-xs font-bold uppercase tracking-wide text-slate-600">
          An
        </Label>
        <Input
          id="compose-to"
          type="email"
          value={to}
          onChange={(e) => onChange({ to: e.target.value })}
          placeholder="empfaenger@example.com"
          className="border-2"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="compose-subject" className="text-xs font-bold uppercase tracking-wide text-slate-600">
          Betreff
        </Label>
        <Input
          id="compose-subject"
          type="text"
          value={subject}
          onChange={(e) => onChange({ subject: e.target.value })}
          placeholder="Betreff der E-Mail"
          className="border-2"
        />
      </div>

      <div className="flex flex-1 flex-col space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor="compose-body" className="text-xs font-bold uppercase tracking-wide text-slate-600">
            Nachricht
          </Label>
          <div className="flex items-center gap-2">
            <VoiceRecordButton onTranscript={handleVoiceTranscript} />
            <button
              type="button"
              onClick={() => setInlineEditOpen(true)}
              disabled={!body.trim()}
              title={
                body.trim()
                  ? "Inline-Diktat: Body gezielt aendern"
                  : "Body fuellen, dann Inline-Diktat verfuegbar"
              }
              className="flex items-center gap-1.5 rounded-lg border-2 border-[#4454b8]/20 bg-white px-2.5 py-1.5 text-[11px] font-bold text-[#120774] transition-all hover:border-[#4454b8] hover:shadow-sm disabled:cursor-not-allowed disabled:border-dashed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-400"
            >
              <Mic2 className="h-3 w-3" strokeWidth={2.5} />
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
          className="flex-1 border-2 rounded-lg focus:ring-2 focus:ring-[#4454b8]/20"
        />

        {/* Anhaenge (DEC-101) */}
        <AttachmentsSection
          composeSessionId={composeSessionId}
          attachments={attachments}
          onAdd={onAddAttachment}
          onRemove={onRemoveAttachment}
        />

        {/* KI-Improve-Bar */}
        <div className="flex items-center gap-2 rounded-lg border-2 border-slate-200 bg-slate-50 px-3 py-2">
          <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">
            <Sparkles className="h-3 w-3 text-[#4454b8]" strokeWidth={2.5} />
            KI-Verbesserung
          </span>
          <div className="ml-auto flex items-center gap-1.5">
            {(["correct", "formal", "summarize"] as ImproveMode[]).map((mode) => {
              const isThis = improving === mode;
              return (
                <button
                  key={mode}
                  type="button"
                  onClick={() => handleImprove(mode)}
                  disabled={!!improving || !body.trim()}
                  className="flex items-center gap-1 rounded-md bg-white border-2 border-[#4454b8]/20 px-2.5 py-1 text-[11px] font-bold text-[#120774] transition-all hover:border-[#4454b8] hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {isThis ? (
                    <Loader2 className="h-3 w-3 animate-spin" strokeWidth={2.5} />
                  ) : (
                    <Sparkles className="h-3 w-3" strokeWidth={2.5} />
                  )}
                  {IMPROVE_LABEL[mode]}
                </button>
              );
            })}
          </div>
        </div>

        {improveResult && improveResult.length > 0 && (
          <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">
            <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={2.5} />
            <span>{improveResult.join(" · ")}</span>
          </div>
        )}

        {improveError && (
          <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={2.5} />
            <span>{improveError}</span>
          </div>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="compose-followup" className="text-xs font-bold uppercase tracking-wide text-slate-600">
          Follow-up am
        </Label>
        <Input
          id="compose-followup"
          type="date"
          value={followUpDate}
          onChange={(e) => onChange({ followUpDate: e.target.value })}
          className="border-2"
        />
      </div>

      {sendError && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={2.5} />
          <span>{sendError}</span>
        </div>
      )}

      {sendWarning && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={2.5} />
          <span>{sendWarning}</span>
        </div>
      )}

      <InlineEditDialog
        open={inlineEditOpen}
        onOpenChange={setInlineEditOpen}
        originalBody={body}
        language={language}
        onAccept={(newBody) => onChange({ body: newBody })}
      />

      {/* Senden-Footer */}
      <div className="flex items-center justify-between gap-3 border-t-2 border-slate-100 pt-4">
        <span className="text-[11px] font-semibold text-slate-400">
          {templateId ? `Vorlage angewendet · ${templateId.slice(0, 8)}…` : "Keine Vorlage angewendet"}
        </span>
        <Button
          type="button"
          onClick={handleSend}
          disabled={sendPending}
          className="bg-gradient-to-r from-[#00a84f] to-[#4dcb8b] text-white font-bold shadow-sm hover:shadow-md transition-all px-5 py-2.5 h-auto"
        >
          {sendPending ? (
            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" strokeWidth={2.5} />
          ) : (
            <Send className="mr-1.5 h-4 w-4" strokeWidth={2.5} />
          )}
          {sendPending ? "Wird gesendet…" : "Senden"}
        </Button>
      </div>
    </div>
  );
}
