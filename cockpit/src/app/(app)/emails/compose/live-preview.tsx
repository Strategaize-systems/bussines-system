"use client";

// =============================================================
// LivePreview — Live-Preview-Panel im Composing-Studio (SLC-534 MT-2)
// =============================================================
// Rendert den aktuellen Body durch renderBrandedHtml (DEC-095) in einem
// CSS-isolierten <iframe srcDoc=...>. Debounce 250ms via useDebouncedValue.
// WICHTIG: Live-Preview ruft NUR renderBrandedHtml — KEIN injectTracking.
// Tracking-Pixel + Link-Wrapping passieren erst im Send-Pfad. Damit ist
// die Preview bit-identisch zur finalen Mail OHNE den Tracking-Layer
// (DEC-095 Single-Source-of-Truth).

import { useMemo } from "react";

import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { renderBrandedHtml, type RenderVars } from "@/lib/email/render";
import type { Branding } from "@/types/branding";

type LivePreviewProps = {
  body: string;
  subject: string;
  to: string;
  branding: Branding | null;
  vars: RenderVars;
  /** Vom Server-Loader durchgereichter Absender (SMTP_FROM_EMAIL). */
  senderFromAddress: string | null;
};

export function LivePreview({
  body,
  subject,
  to,
  branding,
  vars,
  senderFromAddress,
}: LivePreviewProps) {
  const debouncedBody = useDebouncedValue(body, 250);

  const html = useMemo(
    () => renderBrandedHtml(debouncedBody, branding, vars),
    [debouncedBody, branding, vars],
  );

  return (
    <div className="flex h-full flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4">
      <h3 className="text-sm font-semibold text-slate-900">Live-Preview</h3>

      <div className="space-y-1 rounded-md border border-slate-200 bg-slate-50 p-3 text-[12px] text-slate-700">
        <div>
          <span className="font-medium text-slate-500">Von:&nbsp;</span>
          <span>{senderFromAddress || "(SMTP_FROM_EMAIL nicht konfiguriert)"}</span>
        </div>
        <div>
          <span className="font-medium text-slate-500">An:&nbsp;</span>
          <span>{to || <em className="text-slate-400">noch leer</em>}</span>
        </div>
        <div>
          <span className="font-medium text-slate-500">Betreff:&nbsp;</span>
          <span>{subject || <em className="text-slate-400">noch leer</em>}</span>
        </div>
      </div>

      <div className="flex-1 overflow-hidden rounded-md border border-slate-200 bg-white">
        <iframe
          title="E-Mail Live-Preview"
          srcDoc={html}
          sandbox="allow-same-origin"
          className="h-full min-h-[480px] w-full border-0"
        />
      </div>

      <p className="text-[10px] text-slate-400">
        Tracking-Pixel und Link-Wrapping werden erst beim Senden hinzugefuegt — die Vorschau zeigt
        die Mail bit-identisch zur finalen Version ohne Tracking-Layer.
      </p>
    </div>
  );
}
