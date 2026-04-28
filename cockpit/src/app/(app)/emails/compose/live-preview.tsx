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
import { Eye, Shield } from "lucide-react";

import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { renderBrandedHtml, type RenderVars } from "@/lib/email/render";
import type { Branding } from "@/types/branding";
import { AttachmentsPreview } from "@/components/email/attachments-preview";
import type { AttachmentMeta } from "@/lib/email/attachments-whitelist";

type LivePreviewProps = {
  body: string;
  subject: string;
  to: string;
  branding: Branding | null;
  vars: RenderVars;
  /** Vom Server-Loader durchgereichter Absender (SMTP_FROM_EMAIL). */
  senderFromAddress: string | null;
  /** Anhang-Liste fuer Read-only-Anzeige unterhalb der Body-Preview. */
  attachments?: AttachmentMeta[];
};

export function LivePreview({
  body,
  subject,
  to,
  branding,
  vars,
  senderFromAddress,
  attachments = [],
}: LivePreviewProps) {
  const debouncedBody = useDebouncedValue(body, 250);

  const html = useMemo(
    () => renderBrandedHtml(debouncedBody, branding, vars),
    [debouncedBody, branding, vars],
  );

  return (
    <div className="flex h-full flex-col gap-4 rounded-2xl border-2 border-slate-200 bg-white shadow-lg p-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-[#120774] to-[#4454b8]">
          <Eye className="h-4 w-4 text-white" strokeWidth={2.5} />
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-900">Live-Preview</h3>
          <p className="text-[11px] font-medium text-slate-500">
            So sieht die Mail beim Empfaenger aus
          </p>
        </div>
      </div>

      {/* Empfaenger-Header */}
      <div className="space-y-1.5 rounded-xl border-2 border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4 text-xs">
        <div className="flex gap-2">
          <span className="w-14 text-[10px] font-bold uppercase tracking-wide text-slate-500">Von</span>
          <span className="font-semibold text-slate-700">
            {senderFromAddress || (
              <em className="font-medium text-slate-400">(SMTP_FROM_EMAIL nicht konfiguriert)</em>
            )}
          </span>
        </div>
        <div className="flex gap-2">
          <span className="w-14 text-[10px] font-bold uppercase tracking-wide text-slate-500">An</span>
          <span className="font-semibold text-slate-700">
            {to || <em className="font-medium text-slate-400">noch leer</em>}
          </span>
        </div>
        <div className="flex gap-2">
          <span className="w-14 text-[10px] font-bold uppercase tracking-wide text-slate-500">Betreff</span>
          <span className="font-semibold text-slate-700">
            {subject || <em className="font-medium text-slate-400">noch leer</em>}
          </span>
        </div>
      </div>

      {/* iframe-Frame */}
      <div className="flex-1 overflow-hidden rounded-xl border-2 border-slate-200 bg-slate-50 shadow-inner">
        <iframe
          title="E-Mail Live-Preview"
          srcDoc={html}
          sandbox="allow-same-origin"
          className="h-full min-h-[480px] w-full border-0 bg-white"
        />
      </div>

      {/* Anhang-Indikator (SLC-542 MT-6) */}
      <AttachmentsPreview attachments={attachments} />

      {/* Tracking-Hinweis */}
      <div className="flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
        <Shield className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" strokeWidth={2.5} />
        <p className="text-[10px] font-medium leading-relaxed text-slate-500">
          Tracking-Pixel und Link-Wrapping werden erst beim Senden hinzugefuegt — diese Vorschau zeigt die
          Mail bit-identisch zur finalen Version ohne Tracking-Layer.
        </p>
      </div>
    </div>
  );
}
