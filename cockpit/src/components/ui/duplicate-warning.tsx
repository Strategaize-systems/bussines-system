"use client";

import { useState, useCallback } from "react";
import { AlertTriangle } from "lucide-react";
import Link from "next/link";
import type { DuplicateResult } from "@/lib/duplicate-check";

interface DuplicateWarningProps {
  result: DuplicateResult | null;
  entityType: "contact" | "company";
  onDismiss: () => void;
}

export function DuplicateWarning({ result, entityType, onDismiss }: DuplicateWarningProps) {
  if (!result || !result.found) return null;

  const href = entityType === "contact"
    ? `/contacts/${result.existingId}`
    : `/companies/${result.existingId}`;

  const label = entityType === "contact" ? "Kontakt" : "Firma";

  return (
    <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
      <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
      <div className="flex-1 text-sm">
        <p className="font-medium text-amber-800">
          {label} existiert bereits: <strong>{result.existingLabel}</strong>
        </p>
        <div className="flex items-center gap-3 mt-1.5">
          <Link
            href={href}
            className="text-xs font-bold text-amber-700 underline hover:text-amber-900"
          >
            Zum bestehenden Eintrag
          </Link>
          <button
            type="button"
            onClick={onDismiss}
            className="text-xs font-bold text-slate-500 hover:text-slate-700"
          >
            Trotzdem anlegen
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Hook for duplicate checking with debounce.
 */
export function useDuplicateCheck(
  checkFn: (value: string) => Promise<DuplicateResult>
) {
  const [result, setResult] = useState<DuplicateResult | null>(null);
  const [dismissed, setDismissed] = useState(false);

  const check = useCallback(
    async (value: string) => {
      setDismissed(false);
      const res = await checkFn(value);
      setResult(res);
    },
    [checkFn]
  );

  const dismiss = useCallback(() => {
    setDismissed(true);
  }, []);

  return {
    result: dismissed ? null : result,
    check,
    dismiss,
  };
}
