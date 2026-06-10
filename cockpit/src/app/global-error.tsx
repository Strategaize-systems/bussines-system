// BS V8.12 SLC-911 MT-4 — Next.js Global Error Boundary mit Sentry-Capture.
// Pattern aus immoscheckheft/src/app/global-error.tsx (SLC-330).
//
// Wird von Next.js 16 automatisch geladen wenn ein unhandled Error im
// Render-Tree auftritt. Muss ein eigenes <html><body> rendern, weil das
// Root-Layout in diesem Fall nicht aktiv ist.
//
// captureException ist no-op solange SENTRY_DSN leer (self-warned, AC-911-8).

"use client";

import { useEffect } from "react";

import { captureException } from "@/lib/monitoring/sentry";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}): React.JSX.Element {
  useEffect(() => {
    captureException(error, {
      source: "global-error-boundary",
      metadata: { digest: error.digest },
    });
  }, [error]);

  return (
    <html lang="de">
      <body className="min-h-screen flex items-center justify-center bg-background text-foreground p-6">
        <div className="max-w-md text-center space-y-4">
          <h1 className="text-2xl font-semibold">Es ist ein Fehler aufgetreten</h1>
          <p className="text-muted-foreground">
            Wir wurden ueber das Problem informiert und kuemmern uns darum.
            Versuchen Sie bitte, die Seite neu zu laden.
          </p>
          <button
            type="button"
            onClick={() => reset()}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Erneut versuchen
          </button>
        </div>
      </body>
    </html>
  );
}
