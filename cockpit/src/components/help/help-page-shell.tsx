import Link from "next/link";
import { ArrowLeft } from "lucide-react";

/**
 * V8.3 SLC-826 — Shell fuer /help/[slug]-Detail-Pages.
 *
 * Eigene Schicht parallel zu LegalPageShell (V8.2): kein LegalFooter, dafuer
 * Back-Link "Zurueck zur Uebersicht" zu /help. Inhalt wird in einen
 * `.help-content`-Wrapper gerendert (CSS in globals.css analog `.legal-content`).
 */
export function HelpPageShell({ html }: { html: string }) {
  return (
    <main className="px-8 py-8">
      <div className="max-w-[900px] mx-auto">
        <Link
          href="/help"
          className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 mb-6 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 rounded"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          Zurueck zur Uebersicht
        </Link>
        <article
          className="help-content"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
    </main>
  );
}
