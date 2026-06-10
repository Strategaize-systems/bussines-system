"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * V8.12 SLC-908 / BL-502 — Live-Passwortstaerke-Indikator.
 *
 * Zeigt den zxcvbn-Score (0-4) als 5-Segment Tailwind Progress-Bar.
 * zxcvbn (~800KB) wird via dynamic import() geladen -> Lazy-Chunk, NICHT im
 * Main-Bundle (R-V812-3). Der Score-Call ist um 300ms debounced, damit er beim
 * Tippen nicht pro Tastendruck feuert.
 */

const SEGMENTS: { label: string; color: string }[] = [
  { label: "Sehr schwach", color: "bg-red-500" },
  { label: "Schwach", color: "bg-orange-500" },
  { label: "Mittel", color: "bg-yellow-500" },
  { label: "Gut", color: "bg-lime-500" },
  { label: "Stark", color: "bg-green-600" },
];

export function PasswordStrengthIndicator({ password }: { password: string }) {
  const [score, setScore] = useState<number | null>(null);

  useEffect(() => {
    if (!password) {
      setScore(null);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      const { default: zxcvbn } = await import("zxcvbn");
      if (cancelled) return;
      setScore(zxcvbn(password).score);
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [password]);

  if (!password || score === null) {
    return null;
  }

  const segment = SEGMENTS[score];

  return (
    <div className="space-y-1" data-testid="password-strength" aria-live="polite">
      <div className="flex gap-1">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={cn(
              "h-1.5 flex-1 rounded-full",
              i <= score ? segment.color : "bg-muted",
            )}
          />
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Passwortstaerke: {segment.label}
      </p>
    </div>
  );
}
