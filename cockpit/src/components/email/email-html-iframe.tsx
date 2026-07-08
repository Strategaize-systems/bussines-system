"use client";

// Defense-in-Depth-Layer fuer Email-HTML-Rendering. Pattern P-079, siehe
// dev-system/docs/PATTERN_LIBRARY/11-html-sanitization.md.
//
// Zwei Zustaende (SLC-915 MT-6 / DEC-306):
//  - blocked (default): srcDoc mit bereits gestrippten Remote-Bildern +
//    sandbox="" (blockiert Inline-Scripts, Form-Submits, Top-Frame-Navigation,
//    Same-Origin). Selbst wenn DOMPurify (sanitize-email-html.ts) versagt,
//    faengt der Browser-Sandbox-Layer ab.
//  - loaded (opt-in, Session-State pro Mail): iframe src -> route-scoped
//    /api/emails/[id]/body (eigene CSP erlaubt Remote-Bilder, kein Proxy),
//    sandbox="allow-same-origin" (Hoehenmessung, KEIN allow-scripts).

import { useCallback, useEffect, useRef, useState } from "react";

import { buildEmailDocument } from "@/lib/email/email-frame";

interface EmailHtmlIframeProps {
  /** Bereits sanitisiertes HTML mit gestrippten Remote-Bildern (blocked-State). */
  html: string;
  /** E-Mail-ID fuer den loaded-State (route-scoped Body-Route). Ohne emailId
   *  bleibt der Viewer im blocked-State (kein „Bilder laden"). */
  emailId?: string;
  /** Ob im Roh-HTML Remote-Bilder vorhanden waren -> „Bilder laden"-Banner. */
  hasBlockedImages?: boolean;
}

const MIN_HEIGHT = 80;
const MAX_HEIGHT = 8000;

export function EmailHtmlIframe({
  html,
  emailId,
  hasBlockedImages = false,
}: EmailHtmlIframeProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(MIN_HEIGHT);
  // Session-State pro Mail: bei Mail-Wechsel wird die Komponente neu gemountet
  // (Detail-Ansicht), daher startet jede Mail wieder blockiert.
  const [loaded, setLoaded] = useState(false);

  // Misst die Content-Hoehe und passt das Iframe-Element an. blocked-State:
  // srcDoc ist parent-lesbar. loaded-State: same-origin (Route) + allow-same-
  // origin -> contentDocument ebenfalls lesbar.
  const measureAndResize = useCallback(() => {
    const iframe = iframeRef.current;
    const doc = iframe?.contentDocument;
    if (!iframe || !doc?.body) return;
    const scrollHeight =
      doc.documentElement.scrollHeight || doc.body.scrollHeight || MIN_HEIGHT;
    const next = Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, scrollHeight + 8));
    setHeight(next);
  }, []);

  useEffect(() => {
    // Bei Asset-Late-Load (z.B. Inline-Images) re-measure mit kleinem Delay.
    const timeoutId = window.setTimeout(measureAndResize, 200);
    return () => window.clearTimeout(timeoutId);
  }, [html, loaded, measureAndResize]);

  const showBanner = hasBlockedImages && !!emailId && !loaded;
  const useLoadedRoute = loaded && !!emailId;

  const iframeStyle = {
    width: "100%",
    height: `${height}px`,
    borderWidth: 0,
    display: "block",
  } as const;

  return (
    <div>
      {showBanner && (
        <div className="mb-2 flex items-center justify-between gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          <span>Externe Bilder blockiert (Tracking-Schutz)</span>
          <button
            type="button"
            onClick={() => setLoaded(true)}
            className="shrink-0 rounded border border-amber-300 bg-white px-2 py-1 font-medium text-amber-900 hover:bg-amber-100"
          >
            Bilder laden
          </button>
        </div>
      )}
      {useLoadedRoute ? (
        <iframe
          ref={iframeRef}
          title="Email Inhalt"
          sandbox="allow-same-origin"
          src={`/api/emails/${emailId}/body`}
          onLoad={measureAndResize}
          style={iframeStyle}
        />
      ) : (
        <iframe
          ref={iframeRef}
          title="Email Inhalt"
          sandbox=""
          srcDoc={buildEmailDocument(html)}
          onLoad={measureAndResize}
          style={iframeStyle}
        />
      )}
    </div>
  );
}
