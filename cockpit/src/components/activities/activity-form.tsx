"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus } from "lucide-react";
import { createActivity } from "@/lib/actions/activity-actions";
import { VoiceRecordButton } from "@/components/voice/voice-record-button";

const selectClass = "select-premium";

const ACTIVITY_TYPES = [
  { value: "note", label: "Notiz" },
  { value: "call", label: "Anruf" },
  { value: "email", label: "E-Mail" },
  { value: "meeting", label: "Meeting" },
  { value: "task", label: "Aufgabe" },
];

const CONVERSATION_TYPES = [
  "Erstgespräch",
  "Follow-up",
  "Qualifikation",
  "Verhandlung",
  "Bedarfsschärfung",
  "Beziehungspflege",
  "Empfehlungsgespräch",
  "Abschlussgespräch",
];

const CONVERSATION_ACTIVITY_TYPES = ["call", "meeting"];

interface ActivityFormProps {
  contactId?: string;
  companyId?: string;
  dealId?: string;
}

export function ActivityForm({ contactId, companyId, dealId }: ActivityFormProps) {
  const [showForm, setShowForm] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [activityType, setActivityType] = useState("note");
  const [summaryValue, setSummaryValue] = useState("");

  const isConversation = CONVERSATION_ACTIVITY_TYPES.includes(activityType);

  const handleSubmit = (formData: FormData) => {
    startTransition(async () => {
      const result = await createActivity(formData);
      if (!result.error) {
        setShowForm(false);
        setActivityType("note");
        setSummaryValue("");
      }
    });
  };

  if (!showForm) {
    return (
      <Button
        size="sm"
        variant="outline"
        className="h-10 px-4 rounded-lg border-0 bg-gradient-to-r from-[#120774] to-[#4454b8] text-white text-sm font-bold hover:shadow-lg transition-all"
        onClick={() => setShowForm(true)}
      >
        <Plus className="mr-2 h-4 w-4" />
        Aktivität
      </Button>
    );
  }

  return (
    <form action={handleSubmit} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      {contactId && <input type="hidden" name="contact_id" value={contactId} />}
      {companyId && <input type="hidden" name="company_id" value={companyId} />}
      {dealId && <input type="hidden" name="deal_id" value={dealId} />}

      <div className="grid grid-cols-2 gap-3">
        <select
          name="type"
          required
          value={activityType}
          onChange={(e) => setActivityType(e.target.value)}
          className={selectClass}
        >
          {ACTIVITY_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
        <Input name="title" placeholder="Titel" className="h-9" />
      </div>

      {isConversation && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">Gesprächstyp</Label>
              <select name="conversation_type" className={selectClass}>
                <option value="">— Auswählen —</option>
                {CONVERSATION_TYPES.map((ct) => (
                  <option key={ct} value={ct}>{ct}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">Teilnehmer</Label>
              <Input
                name="participants"
                placeholder="z.B. Hr. Müller, Fr. Schmidt"
                className="h-9"
              />
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold text-slate-700">Zusammenfassung</Label>
              <VoiceRecordButton
                onTranscript={(text) => setSummaryValue((prev) => prev ? `${prev}\n${text}` : text)}
              />
            </div>
            <Textarea
              name="summary"
              placeholder="Kernaussagen des Gesprächs — oder diktieren"
              rows={3}
              value={summaryValue}
              onChange={(e) => setSummaryValue(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">Einwände</Label>
              <Input
                name="objections"
                placeholder="z.B. Budget, Timing"
                className="h-9"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">Chancen</Label>
              <Input
                name="opportunities"
                placeholder="z.B. Upsell, Empfehlung"
                className="h-9"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">Risiken</Label>
              <Input
                name="risks"
                placeholder="z.B. Entscheider unsicher"
                className="h-9"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">Nächste Schritte</Label>
              <Input
                name="next_steps"
                placeholder="z.B. Angebot senden"
                className="h-9"
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-semibold text-slate-700">Qualifikationssignale</Label>
            <Input
              name="qualification_signals"
              placeholder="z.B. Budget bestätigt, Champion identifiziert"
              className="h-9"
            />
          </div>
        </>
      )}

      {!isConversation && (
        <Textarea
          name="description"
          placeholder="Beschreibung (optional)"
          rows={2}
        />
      )}

      <div className="flex items-center gap-2">
        <Input name="due_date" type="date" className="h-9 w-40" />
        <div className="flex-1" />
        <Button type="button" size="sm" variant="ghost" onClick={() => setShowForm(false)}>
          Abbrechen
        </Button>
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? "Speichern..." : "Speichern"}
        </Button>
      </div>
    </form>
  );
}
