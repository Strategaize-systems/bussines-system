"use client";

import { useState, useRef, useCallback } from "react";
import { Mic, Square, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type RecordingState = "idle" | "recording" | "transcribing";

interface VoiceRecordButtonProps {
  onTranscript: (text: string) => void;
  className?: string;
}

export function VoiceRecordButton({ onTranscript, className }: VoiceRecordButtonProps) {
  const [state, setState] = useState<RecordingState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startRecording = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : "audio/webm",
      });

      chunksRef.current = [];
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        // Stop all tracks
        stream.getTracks().forEach((t) => t.stop());

        // Clear timer
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }

        setState("transcribing");

        try {
          const blob = new Blob(chunksRef.current, { type: "audio/webm" });
          const formData = new FormData();
          formData.append("audio", blob, "recording.webm");

          const res = await fetch("/api/transcribe", {
            method: "POST",
            body: formData,
          });

          const data = await res.json();

          if (!res.ok || data.error) {
            setError(data.error || "Transkription fehlgeschlagen");
            setState("idle");
            return;
          }

          onTranscript(data.text);
          setState("idle");
          setDuration(0);
        } catch {
          setError("Verbindungsfehler bei Transkription");
          setState("idle");
        }
      };

      mediaRecorder.start(1000); // collect in 1s chunks
      setState("recording");
      setDuration(0);

      // Duration timer
      timerRef.current = setInterval(() => {
        setDuration((d) => d + 1);
      }, 1000);
    } catch {
      setError("Mikrofon-Zugriff verweigert");
    }
  }, [onTranscript]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {state === "idle" && (
        <button
          type="button"
          onClick={startRecording}
          className="flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-[#4454b8]/10 hover:text-[#4454b8]"
          title="Spracheingabe starten"
        >
          <Mic className="h-3.5 w-3.5" />
          Diktieren
        </button>
      )}

      {state === "recording" && (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={stopRecording}
            className="flex items-center gap-1.5 rounded-lg bg-red-100 px-3 py-1.5 text-xs font-bold text-red-700 transition-colors hover:bg-red-200"
          >
            <Square className="h-3 w-3 fill-red-600" />
            Stopp
          </button>
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
            </span>
            <span className="text-xs font-medium text-red-600 tabular-nums">{formatDuration(duration)}</span>
          </div>
        </div>
      )}

      {state === "transcribing" && (
        <div className="flex items-center gap-1.5 text-xs font-medium text-[#4454b8]">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Transkribiere...
        </div>
      )}

      {error && (
        <span className="text-xs text-red-600">{error}</span>
      )}
    </div>
  );
}
