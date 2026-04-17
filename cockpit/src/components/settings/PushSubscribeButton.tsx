"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Bell, BellOff, AlertTriangle } from "lucide-react";

interface Props {
  /** VAPID public key from server (base64url) */
  vapidPublicKey: string;
  /** Whether user already has a push subscription stored server-side */
  hasSubscription: boolean;
}

type PushState =
  | "loading"
  | "unsupported"
  | "denied"
  | "active"
  | "inactive"
  | "ios_needs_a2hs";

function isIosSafari(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) && !("standalone" in navigator && (navigator as { standalone?: boolean }).standalone);
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator && !!(navigator as { standalone?: boolean }).standalone)
  );
}

/**
 * Convert a base64url VAPID key to Uint8Array for PushManager.subscribe().
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

export function PushSubscribeButton({ vapidPublicKey, hasSubscription }: Props) {
  const [state, setState] = useState<PushState>("loading");
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Detect push support and current state
  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      // iOS Safari without A2HS
      if (isIosSafari() && !isStandalone()) {
        setState("ios_needs_a2hs");
      } else {
        setState("unsupported");
      }
      return;
    }

    if (Notification.permission === "denied") {
      setState("denied");
      return;
    }

    setState(hasSubscription ? "active" : "inactive");
  }, [hasSubscription]);

  const subscribe = useCallback(async () => {
    setError(null);
    setIsPending(true);
    try {
      // 1. Register service worker
      const registration = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;

      // 2. Request permission
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState("denied");
        setIsPending(false);
        return;
      }

      // 3. Subscribe to push
      const keyBytes = urlBase64ToUint8Array(vapidPublicKey);
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: keyBytes.buffer as ArrayBuffer,
      });

      // 4. Send subscription to server
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription.toJSON()),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `HTTP ${res.status}`);
      }

      setState("active");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fehler beim Aktivieren");
    } finally {
      setIsPending(false);
    }
  }, [vapidPublicKey]);

  const unsubscribe = useCallback(async () => {
    setError(null);
    setIsPending(true);
    try {
      // Unsubscribe from browser
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          await subscription.unsubscribe();
        }
      }

      // Remove from server
      const res = await fetch("/api/push/subscribe", { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `HTTP ${res.status}`);
      }

      setState("inactive");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fehler beim Deaktivieren");
    } finally {
      setIsPending(false);
    }
  }, []);

  // ── Render ────────────────────────────────────────────────────

  if (state === "loading") {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Bell className="h-4 w-4 animate-pulse" />
        Wird geladen…
      </div>
    );
  }

  if (state === "ios_needs_a2hs") {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
        <div className="flex items-center gap-2 font-medium">
          <AlertTriangle className="h-4 w-4" />
          iPhone / iPad
        </div>
        <p className="mt-1">
          Browser-Push auf iOS erfordert &quot;Zum Home-Bildschirm&quot; (Teilen → Zum Home-Bildschirm).
          Danach erscheint die Push-Option hier.
        </p>
      </div>
    );
  }

  if (state === "unsupported") {
    return (
      <p className="text-sm text-muted-foreground">
        Browser-Push wird in diesem Browser nicht unterstuetzt. Sie erhalten Erinnerungen per E-Mail.
      </p>
    );
  }

  if (state === "denied") {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
        <div className="flex items-center gap-2 font-medium">
          <BellOff className="h-4 w-4" />
          Push-Benachrichtigungen blockiert
        </div>
        <p className="mt-1">
          Bitte erlauben Sie Benachrichtigungen in den Browser-Einstellungen und laden Sie die Seite neu.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        {state === "active" ? (
          <>
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-green-700">
              <Bell className="h-4 w-4" />
              Push aktiv
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={unsubscribe}
              disabled={isPending}
            >
              {isPending ? "Deaktivieren…" : "Deaktivieren"}
            </Button>
          </>
        ) : (
          <Button onClick={subscribe} disabled={isPending} size="sm">
            <Bell className="mr-1.5 h-4 w-4" />
            {isPending ? "Aktivieren…" : "Browser-Push aktivieren"}
          </Button>
        )}
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
