"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Loader2, Check } from "lucide-react";
import { VoiceRecordButton } from "@/components/voice/voice-record-button";

export type EmailTemplateOption = {
  id: string;
  title: string;
  subject_de: string | null;
  subject_nl: string | null;
  subject_en: string | null;
  body_de: string | null;
  body_nl: string | null;
  body_en: string | null;
};

interface EmailComposeProps {
  defaultTo?: string;
  defaultSubject?: string;
  defaultFollowUpDate?: string;
  contactId?: string;
  companyId?: string;
  dealId?: string;
  onSubmit: (formData: FormData) => void;
  isPending?: boolean;
  templates?: EmailTemplateOption[];
  placeholderValues?: {
    vorname?: string;
    nachname?: string;
    firma?: string;
    position?: string;
    deal?: string;
  };
  contactLanguage?: string;
}

type ImproveMode = "correct" | "formal" | "summarize";

function applyPlaceholders(
  text: string,
  values?: EmailComposeProps["placeholderValues"]
): string {
  if (!values) return text;
  let result = text;
  if (values.vorname) result = result.replace(/\{\{vorname\}\}/g, values.vorname);
  if (values.nachname) result = result.replace(/\{\{nachname\}\}/g, values.nachname);
  if (values.firma) result = result.replace(/\{\{firma\}\}/g, values.firma);
  if (values.position) result = result.replace(/\{\{position\}\}/g, values.position);
  if (values.deal) result = result.replace(/\{\{deal\}\}/g, values.deal);
  return result;
}

export function EmailCompose({
  defaultTo,
  defaultSubject,
  defaultFollowUpDate,
  contactId,
  companyId,
  dealId,
  onSubmit,
  isPending,
  templates,
  placeholderValues,
  contactLanguage,
}: EmailComposeProps) {
  const [body, setBody] = useState("");
  const [subject, setSubject] = useState(defaultSubject ?? "");
  const [improving, setImproving] = useState(false);
  const [improveResult, setImproveResult] = useState<string[] | null>(null);

  const handleTemplateSelect = (templateId: string) => {
    if (!templateId || !templates) return;
    const tpl = templates.find((t) => t.id === templateId);
    if (!tpl) return;

    const lang = contactLanguage || "de";
    const subjectField = `subject_${lang}` as keyof EmailTemplateOption;
    const bodyField = `body_${lang}` as keyof EmailTemplateOption;

    const rawSubject = (tpl[subjectField] as string) || tpl.subject_de || "";
    const rawBody = (tpl[bodyField] as string) || tpl.body_de || "";

    setSubject(applyPlaceholders(rawSubject, placeholderValues));
    setBody(applyPlaceholders(rawBody, placeholderValues));
  };

  const handleVoiceTranscript = useCallback((text: string) => {
    setBody((prev) => (prev ? prev + " " + text : text));
  }, []);

  const handleImprove = useCallback(async (mode: ImproveMode) => {
    if (!body.trim()) return;

    setImproving(true);
    setImproveResult(null);

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
        setImproveResult(["KI-Verbesserung nicht verfügbar."]);
        return;
      }

      const data = await res.json();
      if (data.success && data.data) {
        setBody(data.data.improvedText);
        setImproveResult(data.data.changes);
      } else {
        setImproveResult([data.error || "Fehler bei KI-Verbesserung."]);
      }
    } catch {
      setImproveResult(["Verbindungsfehler."]);
    } finally {
      setImproving(false);
    }
  }, [body]);

  return (
    <form action={onSubmit} className="space-y-4">
      {contactId && <input type="hidden" name="contact_id" value={contactId} />}
      {companyId && <input type="hidden" name="company_id" value={companyId} />}
      {dealId && <input type="hidden" name="deal_id" value={dealId} />}

      <div className="space-y-2">
        <Label htmlFor="to_address">An *</Label>
        <Input
          id="to_address"
          name="to_address"
          type="email"
          defaultValue={defaultTo ?? ""}
          placeholder="empfaenger@example.com"
          required
        />
      </div>

      {/* Template Selector */}
      {templates && templates.length > 0 && (
        <div className="space-y-2">
          <Label htmlFor="template">Template</Label>
          <select
            id="template"
            onChange={(e) => handleTemplateSelect(e.target.value)}
            className="select-premium"
          >
            <option value="">— Kein Template —</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="subject">Betreff *</Label>
        <Input
          id="subject"
          name="subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Betreff der E-Mail"
          required
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="body">Nachricht *</Label>
          <VoiceRecordButton onTranscript={handleVoiceTranscript} />
        </div>
        <Textarea
          id="body"
          name="body"
          rows={8}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Ihre Nachricht..."
          required
        />

        {/* KI Improve Buttons */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase">KI:</span>
          {(["correct", "formal", "summarize"] as ImproveMode[]).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => handleImprove(mode)}
              disabled={improving || !body.trim()}
              className="flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium border border-[#4454b8]/20 text-[#4454b8] hover:bg-[#4454b8]/5 disabled:opacity-30 transition-colors"
            >
              {improving ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Sparkles className="h-3 w-3" />
              )}
              {{ correct: "Korrektur", formal: "Formaler", summarize: "Kürzen" }[mode]}
            </button>
          ))}
        </div>

        {/* Improve result feedback */}
        {improveResult && (
          <div className="flex items-start gap-1.5 text-[11px] text-green-700 bg-green-50 rounded p-2">
            <Check className="h-3 w-3 mt-0.5 shrink-0" />
            <span>{improveResult.join(" · ")}</span>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="follow_up_date">Follow-up am</Label>
        <Input
          id="follow_up_date"
          name="follow_up_date"
          type="date"
          defaultValue={defaultFollowUpDate ?? ""}
        />
      </div>

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "Senden..." : "E-Mail senden"}
      </Button>
    </form>
  );
}
