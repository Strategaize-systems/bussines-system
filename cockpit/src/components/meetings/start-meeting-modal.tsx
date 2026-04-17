"use client";

import { useState, useTransition } from "react";
import { Video, AlertTriangle, Loader2, X, Check } from "lucide-react";
import { startMeeting } from "@/app/actions/meetings";

interface Contact {
  id: string;
  first_name: string;
  last_name: string;
  email?: string | null;
  consent_status?: string | null;
}

interface StartMeetingModalProps {
  dealId: string;
  dealTitle: string;
  contacts: Contact[];
  onClose: () => void;
}

export function StartMeetingModal({
  dealId,
  dealTitle,
  contacts,
  onClose,
}: StartMeetingModalProps) {
  const [selected, setSelected] = useState<Set<string>>(
    new Set(contacts.map((c) => c.id)),
  );
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{
    hostUrl?: string;
    recordingEnabled?: boolean;
    missingConsent?: Array<{ name: string; email: string }>;
    invitesSent?: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectedContacts = contacts.filter((c) => selected.has(c.id));
  const hasMissingConsent = selectedContacts.some(
    (c) => c.consent_status !== "granted",
  );

  const handleStart = () => {
    setError(null);
    startTransition(async () => {
      const res = await startMeeting(
        dealId,
        Array.from(selected),
        `Meeting: ${dealTitle}`,
      );

      if (res.error) {
        setError(res.error);
        return;
      }

      setResult({
        hostUrl: res.hostRedirectUrl,
        recordingEnabled: res.recordingEnabled,
        missingConsent: res.missingConsent,
        invitesSent: res.invitesSent,
      });

      // Open Jitsi in new tab
      if (res.hostRedirectUrl) {
        window.open(res.hostRedirectUrl, "_blank");
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-2">
            <Video className="h-5 w-5 text-[#4454b8]" />
            <h2 className="text-lg font-semibold text-slate-800">
              Meeting starten
            </h2>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-slate-100">
            <X className="h-5 w-5 text-slate-400" />
          </button>
        </div>

        <div className="px-6 py-4">
          {/* Success state */}
          {result?.hostUrl ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-green-700">
                <Check className="h-5 w-5" />
                <span className="font-medium">Meeting gestartet</span>
              </div>
              {result.invitesSent && result.invitesSent > 0 && (
                <p className="text-sm text-slate-600">
                  {result.invitesSent} Einladung{result.invitesSent > 1 ? "en" : ""} versendet.
                </p>
              )}
              {!result.recordingEnabled && result.missingConsent && result.missingConsent.length > 0 && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-600" />
                    <div>
                      <p className="text-sm font-medium text-amber-800">
                        Aufzeichnung deaktiviert
                      </p>
                      <p className="mt-1 text-xs text-amber-700">
                        Fehlende Einwilligung:{" "}
                        {result.missingConsent.map((c) => c.name).join(", ")}
                      </p>
                    </div>
                  </div>
                </div>
              )}
              <p className="text-xs text-slate-500">
                Jitsi wurde in einem neuen Tab geoeffnet.
              </p>
            </div>
          ) : (
            <>
              {/* Participant selection */}
              <p className="mb-3 text-sm text-slate-600">
                Teilnehmer fuer das Meeting auswaehlen:
              </p>

              {contacts.length === 0 ? (
                <p className="text-sm text-slate-400">
                  Keine Kontakte mit diesem Deal verknuepft.
                </p>
              ) : (
                <div className="max-h-60 space-y-1 overflow-y-auto">
                  {contacts.map((c) => (
                    <label
                      key={c.id}
                      className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 hover:bg-slate-50"
                    >
                      <input
                        type="checkbox"
                        checked={selected.has(c.id)}
                        onChange={() => toggle(c.id)}
                        className="h-4 w-4 rounded border-slate-300 text-[#4454b8] focus:ring-[#4454b8]"
                      />
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium text-slate-700">
                          {c.first_name} {c.last_name}
                        </span>
                        {c.email && (
                          <span className="ml-2 text-xs text-slate-400 truncate">
                            {c.email}
                          </span>
                        )}
                      </div>
                      {c.consent_status === "granted" ? (
                        <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-700">
                          Consent
                        </span>
                      ) : (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                          Kein Consent
                        </span>
                      )}
                    </label>
                  ))}
                </div>
              )}

              {/* Consent warning banner */}
              {hasMissingConsent && selected.size > 0 && (
                <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                    <p className="text-xs text-amber-700">
                      <span className="font-medium">Aufzeichnung deaktiviert</span> — nicht
                      alle Teilnehmer haben eingewilligt:{" "}
                      {selectedContacts
                        .filter((c) => c.consent_status !== "granted")
                        .map((c) => `${c.first_name} ${c.last_name}`)
                        .join(", ")}
                    </p>
                  </div>
                </div>
              )}

              {error && (
                <p className="mt-3 text-sm text-red-600">{error}</p>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t border-slate-200 px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
          >
            {result?.hostUrl ? "Schliessen" : "Abbrechen"}
          </button>
          {!result?.hostUrl && (
            <button
              onClick={handleStart}
              disabled={isPending}
              className="flex items-center gap-2 rounded-lg bg-[#4454b8] px-4 py-2 text-sm font-medium text-white hover:bg-[#3a4aa0] disabled:opacity-50"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Wird gestartet...
                </>
              ) : (
                <>
                  <Video className="h-4 w-4" />
                  Meeting starten
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
