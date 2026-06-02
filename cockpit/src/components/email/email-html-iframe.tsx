"use client";

// Defense-in-Depth-Layer fuer Email-HTML-Rendering. Sandbox="" blockiert
// Inline-Scripts, Form-Submits, Top-Frame-Navigation und Same-Origin-Access
// — selbst wenn DOMPurify (sanitize-email-html.ts) versagt, faengt der
// Browser-Sandbox-Layer ab. Pattern P-079, siehe
// dev-system/docs/PATTERN_LIBRARY/11-html-sanitization.md.

import { useCallback, useEffect, useRef, useState } from "react";

interface EmailHtmlIframeProps {
  html: string;
}

// Minimaler Style-Reset im Iframe — Tailwind ist NICHT im Iframe verfuegbar
// (sandbox="" + srcDoc), daher Defaults inline.
const FRAME_STYLES = `
  *, *::before, *::after { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    font-size: 14px;
    line-height: 1.5;
    color: rgb(51 65 85);
    word-break: break-word;
    padding: 0;
  }
  p { margin: 0 0 0.5rem 0; }
  h1, h2, h3, h4, h5, h6 { margin: 1rem 0 0.5rem 0; font-weight: 600; }
  h1 { font-size: 1.5rem; }
  h2 { font-size: 1.25rem; }
  h3 { font-size: 1.125rem; }
  a { color: rgb(37 99 235); text-decoration: underline; }
  img { max-width: 100%; height: auto; }
  ul, ol { padding-left: 1.5rem; margin: 0 0 0.5rem 0; }
  blockquote { border-left: 3px solid rgb(203 213 225); padding-left: 0.75rem; margin: 0.5rem 0; color: rgb(100 116 139); }
  table { border-collapse: collapse; max-width: 100%; }
  th, td { padding: 4px 8px; border: 1px solid rgb(226 232 240); text-align: left; }
  thead { background: rgb(248 250 252); }
  pre, code { font-family: ui-monospace, monospace; font-size: 0.875rem; background: rgb(248 250 252); padding: 2px 4px; border-radius: 3px; }
  hr { border: 0; border-top: 1px solid rgb(226 232 240); margin: 1rem 0; }
`;

function buildSrcDoc(html: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${FRAME_STYLES}</style></head><body>${html}</body></html>`;
}

const MIN_HEIGHT = 80;
const MAX_HEIGHT = 8000;

export function EmailHtmlIframe({ html }: EmailHtmlIframeProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(MIN_HEIGHT);

  // Misst die Content-Hoehe und passt das Iframe-Element an. Mit sandbox=""
  // ist same-origin nicht erlaubt, aber das Parent-Window kann trotzdem auf
  // contentDocument zugreifen, solange das Doc per srcDoc gesetzt wurde.
  const measureAndResize = useCallback(() => {
    const iframe = iframeRef.current;
    const doc = iframe?.contentDocument;
    if (!iframe || !doc?.body) return;
    const scrollHeight = doc.documentElement.scrollHeight || doc.body.scrollHeight || MIN_HEIGHT;
    const next = Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, scrollHeight + 8));
    setHeight(next);
  }, []);

  useEffect(() => {
    // Bei Asset-Late-Load (z.B. Inline-Images) re-measure mit kleinem Delay.
    const timeoutId = window.setTimeout(measureAndResize, 200);
    return () => window.clearTimeout(timeoutId);
  }, [html, measureAndResize]);

  return (
    <iframe
      ref={iframeRef}
      title="Email Inhalt"
      sandbox=""
      srcDoc={buildSrcDoc(html)}
      onLoad={measureAndResize}
      style={{
        width: "100%",
        height: `${height}px`,
        borderWidth: 0,
        display: "block",
      }}
    />
  );
}
