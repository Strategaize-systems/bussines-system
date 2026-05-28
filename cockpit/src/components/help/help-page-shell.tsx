import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";

/**
 * V8.3 SLC-826 — Shell fuer /help/[slug]-Detail-Pages.
 *
 * Eigene Schicht parallel zu LegalPageShell (V8.2): kein LegalFooter, dafuer
 * Back-Link "Zurueck zur Uebersicht" zu /help. Inhalt wird in einen
 * `.help-content`-Wrapper gerendert (CSS in globals.css analog `.legal-content`).
 *
 * V8.8 SLC-881 — optional imageBlock rendered above the article. When the
 * page has an annotated screenshot (HotspotImage), it sits between the
 * back-link and the markdown body. Slugs without hotspots leave imageBlock
 * undefined and the page falls back to V8.3 plain markdown.
 */
export function HelpPageShell({
  html,
  imageBlock,
}: {
  html: string;
  imageBlock?: ReactNode;
}) {
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
        {imageBlock ? <div className="mb-8">{imageBlock}</div> : null}
        <article
          className="help-content"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
    </main>
  );
}
