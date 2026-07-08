// Geteilte Iframe-Dokument-Huelle fuer das Email-HTML-Rendering (SLC-915 MT-6).
// Genutzt von der Client-Komponente EmailHtmlIframe (blocked-State via srcDoc)
// UND der Server-Route GET /api/emails/[id]/body (loaded-State, eigenes
// Dokument mit route-scoped CSP). Tailwind ist im sandboxed Iframe nicht
// verfuegbar (sandbox + srcDoc / eigene Origin), daher Basis-Styles inline.
// Single-Source, damit blocked- und loaded-State optisch identisch rendern.

export const EMAIL_FRAME_STYLES = `
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

/**
 * Baut ein vollstaendiges HTML-Dokument um bereits sanitisiertes Email-Body-HTML
 * (fuer iframe srcDoc oder als Route-Response-Body).
 */
export function buildEmailDocument(bodyHtml: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${EMAIL_FRAME_STYLES}</style></head><body>${bodyHtml}</body></html>`;
}
