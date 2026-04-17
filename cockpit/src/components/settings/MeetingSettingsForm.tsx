"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  saveUserSettings,
  type UserSettings,
  type MeetingAgendaMode,
} from "@/app/actions/user-settings";
import { PushSubscribeButton } from "./PushSubscribeButton";
import { Bell, Calendar, Brain, X, Plus } from "lucide-react";

interface Props {
  initial: UserSettings | null;
  vapidPublicKey: string;
}

const AGENDA_MODE_OPTIONS: { value: MeetingAgendaMode; label: string; desc: string }[] = [
  { value: "on_click", label: "Auf Klick", desc: "KI-Agenda wird nur bei Klick generiert" },
  { value: "auto", label: "Automatisch", desc: "KI-Agenda wird automatisch vor dem Meeting generiert" },
  { value: "off", label: "Aus", desc: "Keine KI-Agenda-Generierung" },
];

const INTERNAL_MINUTES_OPTIONS = [5, 10, 15, 30, 60];

export function MeetingSettingsForm({ initial, vapidPublicKey }: Props) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  // Form state with defaults
  const [externalHours, setExternalHours] = useState<number[]>(
    initial?.meeting_reminder_external_hours ?? [24, 2]
  );
  const [internalEnabled, setInternalEnabled] = useState(
    initial?.meeting_reminder_internal_enabled ?? false
  );
  const [internalMinutes, setInternalMinutes] = useState(
    initial?.meeting_reminder_internal_minutes ?? 30
  );
  const [agendaMode, setAgendaMode] = useState<MeetingAgendaMode>(
    initial?.meeting_agenda_mode ?? "on_click"
  );

  // New hour input
  const [newHour, setNewHour] = useState("");

  function addHour() {
    const h = parseInt(newHour, 10);
    if (isNaN(h) || h < 0 || h > 168) return;
    if (externalHours.includes(h)) return;
    setExternalHours((prev) => [...prev, h].sort((a, b) => b - a));
    setNewHour("");
  }

  function removeHour(h: number) {
    setExternalHours((prev) => prev.filter((v) => v !== h));
  }

  function handleSave() {
    setMessage(null);
    startTransition(async () => {
      const result = await saveUserSettings({
        meeting_reminder_external_hours: externalHours,
        meeting_reminder_internal_enabled: internalEnabled,
        meeting_reminder_internal_minutes: internalMinutes,
        meeting_agenda_mode: agendaMode,
      });

      if (result.error) {
        setMessage({ kind: "error", text: result.error });
      } else {
        setMessage({ kind: "ok", text: "Einstellungen gespeichert" });
        setTimeout(() => setMessage(null), 3000);
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* External Reminder Hours */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Bell className="h-4 w-4 text-slate-600" />
            Externe Erinnerungen
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Teilnehmer werden per E-Mail erinnert. Legen Sie fest, wie viele Stunden vor dem Meeting die Erinnerung verschickt wird.
          </p>
          <div className="flex flex-wrap gap-2">
            {externalHours.map((h) => (
              <span
                key={h}
                className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700"
              >
                {h === 0 ? "Bei Start" : h === 1 ? "1 Stunde" : `${h} Stunden`}
                <button
                  type="button"
                  onClick={() => removeHour(h)}
                  className="ml-1 rounded-full p-0.5 hover:bg-slate-200"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min={0}
              max={168}
              placeholder="Stunden"
              value={newHour}
              onChange={(e) => setNewHour(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addHour())}
              className="w-28"
            />
            <Button type="button" variant="outline" size="sm" onClick={addHour}>
              <Plus className="mr-1 h-3 w-3" />
              Hinzufuegen
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Erlaubt: 0–168 Stunden (0 = bei Meeting-Start, 168 = 7 Tage vorher). Max. 10 Zeitpunkte.
          </p>
        </CardContent>
      </Card>

      {/* Internal Reminder (SMTP Fallback) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Calendar className="h-4 w-4 text-slate-600" />
            Interne Erinnerung
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Sie selbst erhalten eine Erinnerung vor Ihrem Meeting — per Browser-Push oder E-Mail.
          </p>

          <PushSubscribeButton
            vapidPublicKey={vapidPublicKey}
            hasSubscription={!!initial?.push_subscription}
          />

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="internal-enabled"
              checked={internalEnabled}
              onChange={(e) => setInternalEnabled(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <Label htmlFor="internal-enabled" className="cursor-pointer">
              Interne Erinnerung aktivieren
            </Label>
          </div>

          {internalEnabled && (
            <div className="flex items-center gap-3">
              <Label className="text-sm text-muted-foreground whitespace-nowrap">
                Minuten vorher:
              </Label>
              <div className="flex gap-1">
                {INTERNAL_MINUTES_OPTIONS.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setInternalMinutes(m)}
                    className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
                      internalMinutes === m
                        ? "bg-blue-600 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Agenda Mode */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Brain className="h-4 w-4 text-slate-600" />
            KI-Agenda
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Die KI kann automatisch eine Agenda fuer Ihre Meetings erstellen, basierend auf Deal-Kontext und bisheriger Kommunikation.
          </p>
          {AGENDA_MODE_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className="flex items-start gap-3 cursor-pointer rounded-lg border p-3 transition-colors hover:bg-slate-50"
            >
              <input
                type="radio"
                name="agenda-mode"
                value={opt.value}
                checked={agendaMode === opt.value}
                onChange={() => setAgendaMode(opt.value)}
                className="mt-0.5 h-4 w-4 text-blue-600"
              />
              <div>
                <span className="text-sm font-medium">{opt.label}</span>
                <p className="text-xs text-muted-foreground">{opt.desc}</p>
              </div>
            </label>
          ))}
        </CardContent>
      </Card>

      {/* Save */}
      <div className="flex items-center gap-3">
        <Button onClick={handleSave} disabled={isPending}>
          {isPending ? "Speichern…" : "Einstellungen speichern"}
        </Button>
        {message && (
          <span
            className={`text-sm ${
              message.kind === "ok" ? "text-green-600" : "text-red-600"
            }`}
          >
            {message.text}
          </span>
        )}
      </div>
    </div>
  );
}
