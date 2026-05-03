"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { PushSubscribeButton } from "@/components/settings/PushSubscribeButton";
import {
  updateBriefingSettings,
  type BriefingSettings,
  type BriefingTriggerMinutes,
} from "./actions";
import { AlertCircle, BellOff, CheckCircle2, Mail, Smartphone } from "lucide-react";

const TRIGGER_OPTIONS: BriefingTriggerMinutes[] = [15, 30, 45, 60];

interface Props {
  initial: BriefingSettings;
  vapidPublicKey: string;
}

export function BriefingForm({ initial, vapidPublicKey }: Props) {
  const [triggerMinutes, setTriggerMinutes] = useState<BriefingTriggerMinutes>(
    initial.triggerMinutes
  );
  const [pushEnabled, setPushEnabled] = useState(initial.pushEnabled);
  const [emailEnabled, setEmailEnabled] = useState(initial.emailEnabled);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();

  const bothOff = !pushEnabled && !emailEnabled;
  const dirty =
    triggerMinutes !== initial.triggerMinutes ||
    pushEnabled !== initial.pushEnabled ||
    emailEnabled !== initial.emailEnabled;

  const showSubscribeHint = pushEnabled && !initial.hasPushSubscription;

  function save() {
    setError(null);
    startTransition(async () => {
      const res = await updateBriefingSettings({
        triggerMinutes,
        pushEnabled,
        emailEnabled,
      });
      if (res.ok) {
        setSavedAt(Date.now());
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Trigger-Zeit */}
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-slate-900">
          Wie lange vor dem Meeting?
        </legend>
        <p className="text-xs text-slate-500 mb-2">
          Das Briefing wird kurz vor diesem Zeitpunkt generiert.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {TRIGGER_OPTIONS.map((m) => (
            <label
              key={m}
              className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2 cursor-pointer text-sm transition-colors ${
                triggerMinutes === m
                  ? "border-purple-500 bg-purple-50 text-purple-900 font-medium"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              <input
                type="radio"
                name="trigger-minutes"
                value={m}
                checked={triggerMinutes === m}
                onChange={() => setTriggerMinutes(m)}
                className="sr-only"
              />
              {m} Min
            </label>
          ))}
        </div>
      </fieldset>

      {/* Lieferung */}
      <fieldset className="space-y-3">
        <legend className="text-sm font-medium text-slate-900">Lieferung</legend>

        <label className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3">
          <div className="flex items-center gap-3">
            <Smartphone className="h-4 w-4 text-slate-500" />
            <div>
              <p className="text-sm font-medium text-slate-900">Push-Notification</p>
              <p className="text-xs text-slate-500">
                Push direkt im Browser auf Desktop oder Mobile.
              </p>
            </div>
          </div>
          <input
            type="checkbox"
            checked={pushEnabled}
            onChange={(e) => setPushEnabled(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500"
          />
        </label>

        <label className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3">
          <div className="flex items-center gap-3">
            <Mail className="h-4 w-4 text-slate-500" />
            <div>
              <p className="text-sm font-medium text-slate-900">E-Mail</p>
              <p className="text-xs text-slate-500">
                Briefing als E-Mail an deine eingehende Adresse.
              </p>
            </div>
          </div>
          <input
            type="checkbox"
            checked={emailEnabled}
            onChange={(e) => setEmailEnabled(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500"
          />
        </label>

        {bothOff && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 flex items-start gap-2">
            <BellOff className="h-4 w-4 mt-0.5 shrink-0" />
            <span>
              Briefing wird komplett deaktiviert — der Cron ueberspringt diesen
              User. Aktiviere mindestens einen Kanal, damit Briefings generiert
              werden.
            </span>
          </div>
        )}

        {showSubscribeHint && vapidPublicKey && (
          <div className="rounded-lg border border-purple-200 bg-purple-50 px-3 py-3 text-sm text-purple-900 space-y-2">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>
                Push-Notifications sind aktiviert, aber dein Browser hat noch
                keine Subscription. Klicke unten, um Push zu aktivieren.
              </span>
            </div>
            <PushSubscribeButton
              vapidPublicKey={vapidPublicKey}
              hasSubscription={initial.hasPushSubscription}
            />
          </div>
        )}
      </fieldset>

      <div className="flex items-center gap-3 pt-2 border-t border-slate-100">
        <Button onClick={save} disabled={!dirty || isPending}>
          {isPending ? "Speichern..." : "Speichern"}
        </Button>
        {error && (
          <p className="text-sm text-red-600 flex items-center gap-1">
            <AlertCircle className="h-3.5 w-3.5" />
            {error}
          </p>
        )}
        {savedAt && !error && !dirty && (
          <p className="text-sm text-emerald-700 flex items-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Gespeichert.
          </p>
        )}
      </div>
    </div>
  );
}
