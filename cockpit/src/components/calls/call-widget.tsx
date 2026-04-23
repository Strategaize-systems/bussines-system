"use client";

import { useEffect, useRef, useState } from "react";
import { Phone, PhoneOff, Loader2, AlertCircle } from "lucide-react";
import { useSipPhone, type SipPhoneStatus } from "@/hooks/use-sip-phone";
import {
  createCall,
  updateCallStatus,
  createCallActivity,
} from "@/app/(app)/calls/actions";
import { useRouter } from "next/navigation";

interface CallWidgetProps {
  phoneNumber: string;
  contactName?: string | null;
  dealId?: string;
  contactId?: string;
  onClose: () => void;
}

const statusConfig: Record<
  SipPhoneStatus,
  { label: string; tone: "info" | "progress" | "success" | "error" | "idle" }
> = {
  idle: { label: "Bereit", tone: "idle" },
  connecting: { label: "Verbinde mit Server...", tone: "progress" },
  registering: { label: "Registriere...", tone: "progress" },
  registered: { label: "Bereit zum Anrufen", tone: "info" },
  calling: { label: "Wähle...", tone: "progress" },
  ringing: { label: "Es klingelt...", tone: "progress" },
  connected: { label: "Verbunden", tone: "success" },
  ended: { label: "Beendet", tone: "idle" },
  error: { label: "Fehler", tone: "error" },
};

export function CallWidget({
  phoneNumber,
  contactName,
  dealId,
  contactId,
  onClose,
}: CallWidgetProps) {
  const router = useRouter();
  const [callId, setCallId] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const startedAtRef = useRef<number | null>(null);
  const connectedAtRef = useRef<string | null>(null);
  const hasFinalizedRef = useRef(false);

  const { status, error, connect, call, hangup } = useSipPhone({
    onConnected: () => {
      connectedAtRef.current = new Date().toISOString();
      startedAtRef.current = Date.now();
      if (callId) {
        void updateCallStatus(callId, "connected", {
          connectedAt: connectedAtRef.current,
        });
      }
    },
    onEnded: async (reason) => {
      if (hasFinalizedRef.current || !callId) return;
      hasFinalizedRef.current = true;

      const endedAt = new Date().toISOString();
      const durationSeconds = startedAtRef.current
        ? Math.floor((Date.now() - startedAtRef.current) / 1000)
        : 0;

      const finalStatus = reason === "failed" ? "failed" : "completed";
      try {
        await updateCallStatus(callId, finalStatus, {
          endedAt,
          durationSeconds,
        });
        await createCallActivity(callId);
        router.refresh();
      } catch (e) {
        console.error("Failed to finalize call:", e);
      }
    },
  });

  // Start call when widget opens: createCall in DB → connect SIP → invite
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const newCall = await createCall({
          dealId,
          contactId,
          phoneNumber,
          direction: "outbound",
        });
        if (cancelled) return;
        setCallId(newCall.id);

        await connect();
        if (cancelled) return;

        await call({ number: phoneNumber, callId: newCall.id });
      } catch (e) {
        console.error("Failed to start call:", e);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phoneNumber]);

  // Timer during connected state
  useEffect(() => {
    if (status !== "connected") return;
    const interval = setInterval(() => {
      if (startedAtRef.current) {
        setElapsed(Math.floor((Date.now() - startedAtRef.current) / 1000));
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [status]);

  const handleClose = async () => {
    if (status === "calling" || status === "ringing" || status === "connected") {
      await hangup();
    }
    onClose();
  };

  const cfg = statusConfig[status];
  const toneClass = {
    info: "text-slate-600",
    progress: "text-blue-600",
    success: "text-green-600",
    error: "text-red-600",
    idle: "text-slate-500",
  }[cfg.tone];

  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");

  return (
    <div className="fixed bottom-6 right-6 z-50 w-96 rounded-2xl border-2 border-slate-200 bg-white shadow-2xl">
      <div className="border-b border-slate-100 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-11 w-11 items-center justify-center rounded-full ${
                status === "connected"
                  ? "bg-green-100"
                  : status === "error"
                  ? "bg-red-100"
                  : "bg-slate-100"
              }`}
            >
              {status === "error" ? (
                <AlertCircle className="h-5 w-5 text-red-600" />
              ) : status === "calling" ||
                status === "ringing" ||
                status === "connecting" ||
                status === "registering" ? (
                <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
              ) : (
                <Phone
                  className={`h-5 w-5 ${
                    status === "connected" ? "text-green-600" : "text-slate-600"
                  }`}
                />
              )}
            </div>
            <div>
              <div className="font-bold text-slate-900">
                {contactName ?? "Unbekannter Kontakt"}
              </div>
              <div className="text-xs text-slate-500">{phoneNumber}</div>
            </div>
          </div>
          {status === "connected" && (
            <div className="font-mono text-lg font-bold text-green-600">
              {mm}:{ss}
            </div>
          )}
        </div>
      </div>

      <div className="p-4">
        <div className={`mb-4 text-center text-sm font-semibold ${toneClass}`}>
          {cfg.label}
        </div>

        {error === "mic-denied" && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
            Mikrofon-Zugriff wurde verweigert. Bitte in den Browser-Einstellungen erlauben
            und Seite neu laden.
          </div>
        )}
        {error === "sip-connect-failed" && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
            Verbindung zum Telefon-Server fehlgeschlagen.
          </div>
        )}
        {error === "call-failed" && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
            Anruf konnte nicht aufgebaut werden.
          </div>
        )}

        <button
          onClick={handleClose}
          className={`flex h-12 w-full items-center justify-center gap-2 rounded-lg font-bold text-white shadow-md transition-all ${
            status === "ended" || status === "error"
              ? "bg-slate-500 hover:bg-slate-600"
              : "bg-red-500 hover:bg-red-600 hover:shadow-lg"
          }`}
        >
          <PhoneOff className="h-5 w-5" />
          {status === "ended" || status === "error" ? "Schließen" : "Auflegen"}
        </button>
      </div>
    </div>
  );
}
