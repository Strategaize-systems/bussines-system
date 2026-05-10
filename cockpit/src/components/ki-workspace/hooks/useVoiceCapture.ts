"use client";

import { useState, useRef, useCallback } from "react";

export interface UseVoiceCaptureResult {
  isRecording: boolean;
  start: () => Promise<void>;
  stop: () => Promise<string>;
  error: string | null;
}

export function useVoiceCapture(): UseVoiceCaptureResult {
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const start = useCallback(async () => {
    setError(null);
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setError("Mikrofon-Zugriff verweigert");
      return;
    }

    streamRef.current = stream;
    const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ? "audio/webm;codecs=opus"
      : "audio/webm";
    const recorder = new MediaRecorder(stream, { mimeType });
    chunksRef.current = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorderRef.current = recorder;
    recorder.start(1000);
    setIsRecording(true);
  }, []);

  const stop = useCallback(async (): Promise<string> => {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state !== "recording") {
      return "";
    }

    const stopped = new Promise<void>((resolve) => {
      recorder.onstop = () => resolve();
    });
    recorder.stop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    await stopped;
    setIsRecording(false);

    const blob = new Blob(chunksRef.current, { type: "audio/webm" });
    const formData = new FormData();
    formData.append("audio", blob, "recording.webm");

    let res: Response;
    try {
      res = await fetch("/api/transcribe", { method: "POST", body: formData });
    } catch {
      setError("Verbindungsfehler bei Transkription");
      return "";
    }

    let data: { text?: string; error?: string };
    try {
      data = await res.json();
    } catch {
      setError("Transkription fehlgeschlagen");
      return "";
    }

    if (!res.ok || data.error) {
      setError(data.error || "Transkription fehlgeschlagen");
      return "";
    }

    return data.text ?? "";
  }, []);

  return { isRecording, start, stop, error };
}
