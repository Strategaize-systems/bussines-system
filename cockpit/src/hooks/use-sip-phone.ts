"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  Inviter,
  Registerer,
  Session,
  SessionState,
  UserAgent,
} from "sip.js";
import { getSipConfig } from "@/app/(app)/calls/actions";

export type SipPhoneStatus =
  | "idle"
  | "connecting"
  | "registering"
  | "registered"
  | "calling"
  | "ringing"
  | "connected"
  | "ended"
  | "error";

export type SipPhoneError =
  | "mic-denied"
  | "sip-connect-failed"
  | "register-failed"
  | "call-failed"
  | null;

type CallOptions = {
  number: string;
  callId: string; // DB-UUID → wird als X-Call-ID Header an Asterisk gesendet (MixMonitor-Dateiname)
};

type CallbackMap = {
  onConnected?: () => void;
  onEnded?: (reason: "local" | "remote" | "failed") => void;
};

export function useSipPhone(callbacks?: CallbackMap) {
  const [status, setStatus] = useState<SipPhoneStatus>("idle");
  const [error, setError] = useState<SipPhoneError>(null);

  const userAgentRef = useRef<UserAgent | null>(null);
  const registererRef = useRef<Registerer | null>(null);
  const inviterRef = useRef<Inviter | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const cbRef = useRef(callbacks);
  cbRef.current = callbacks;

  // Hidden <audio> element for remote media playback
  useEffect(() => {
    const audio = document.createElement("audio");
    audio.autoplay = true;
    audio.style.display = "none";
    document.body.appendChild(audio);
    audioRef.current = audio;
    return () => {
      audio.remove();
      audioRef.current = null;
    };
  }, []);

  const attachRemoteMedia = useCallback((session: Session) => {
    const sessionDescriptionHandler = session.sessionDescriptionHandler as
      | { peerConnection?: RTCPeerConnection }
      | undefined;
    const pc = sessionDescriptionHandler?.peerConnection;
    if (!pc || !audioRef.current) return;

    const remoteStream = new MediaStream();
    pc.getReceivers().forEach((receiver) => {
      if (receiver.track) remoteStream.addTrack(receiver.track);
    });
    audioRef.current.srcObject = remoteStream;
  }, []);

  const connect = useCallback(async () => {
    if (userAgentRef.current) return; // already connected

    setStatus("connecting");
    setError(null);

    try {
      // Dynamic import — sip.js bundle only loaded when needed (~200 KB)
      const sip = await import("sip.js");
      const config = await getSipConfig();

      const uri = sip.UserAgent.makeURI(`sip:${config.username}@${config.domain}`);
      if (!uri) throw new Error("Invalid SIP URI");

      const ua = new sip.UserAgent({
        uri,
        transportOptions: { server: config.wssUrl },
        authorizationUsername: config.username,
        authorizationPassword: config.password,
        sessionDescriptionHandlerFactoryOptions: {
          peerConnectionConfiguration: {
            iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
          },
        },
        logBuiltinEnabled: false,
      });

      userAgentRef.current = ua;

      setStatus("registering");
      await ua.start();
      const registerer = new sip.Registerer(ua);
      registererRef.current = registerer;
      await registerer.register();

      setStatus("registered");
    } catch (e) {
      console.error("SIP connect failed:", e);
      setError("sip-connect-failed");
      setStatus("error");
      throw e;
    }
  }, []);

  const call = useCallback(
    async (options: CallOptions) => {
      const ua = userAgentRef.current;
      if (!ua) {
        setError("sip-connect-failed");
        setStatus("error");
        return;
      }

      // Request mic BEFORE SIP INVITE so browser permission prompt happens upfront
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch {
        setError("mic-denied");
        setStatus("error");
        return;
      }

      try {
        const sip = await import("sip.js");
        const target = sip.UserAgent.makeURI(
          `sip:${options.number}@${(await getSipConfig()).domain}`
        );
        if (!target) throw new Error("Invalid target URI");

        const inviter = new sip.Inviter(ua, target, {
          extraHeaders: [`X-Call-ID: ${options.callId}`],
          sessionDescriptionHandlerOptions: {
            constraints: { audio: true, video: false },
          },
        });
        inviterRef.current = inviter;

        inviter.stateChange.addListener((state: SessionState) => {
          // Use string literal compare — avoids having to import SessionState enum at runtime
          if (state === "Establishing") {
            setStatus("ringing");
          } else if (state === "Established") {
            attachRemoteMedia(inviter);
            setStatus("connected");
            cbRef.current?.onConnected?.();
          } else if (state === "Terminated") {
            setStatus("ended");
            cbRef.current?.onEnded?.("remote");
          }
        });

        setStatus("calling");
        await inviter.invite();
      } catch (e) {
        console.error("SIP call failed:", e);
        setError("call-failed");
        setStatus("error");
        cbRef.current?.onEnded?.("failed");
      }
    },
    [attachRemoteMedia]
  );

  const hangup = useCallback(async () => {
    const inviter = inviterRef.current;
    if (!inviter) return;

    try {
      const state = inviter.state;
      if (state === "Establishing" || state === "Initial") {
        await inviter.cancel();
      } else if (state === "Established") {
        await inviter.bye();
      }
    } catch (e) {
      console.error("SIP hangup failed:", e);
    }
    inviterRef.current = null;
    setStatus("ended");
    cbRef.current?.onEnded?.("local");
  }, []);

  const disconnect = useCallback(async () => {
    try {
      if (inviterRef.current) {
        await hangup();
      }
      if (registererRef.current) {
        await registererRef.current.unregister();
        registererRef.current = null;
      }
      if (userAgentRef.current) {
        await userAgentRef.current.stop();
        userAgentRef.current = null;
      }
    } catch (e) {
      console.error("SIP disconnect failed:", e);
    }
    setStatus("idle");
    setError(null);
  }, [hangup]);

  // Cleanup on unmount — prevent zombie sessions
  useEffect(() => {
    return () => {
      void disconnect();
    };
  }, [disconnect]);

  return { status, error, connect, call, hangup, disconnect };
}
