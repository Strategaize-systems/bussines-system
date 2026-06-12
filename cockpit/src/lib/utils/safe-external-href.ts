// V8.15 SLC-913 MT-3 (ISSUE-113 + ISSUE-114): Shared href-Scheme-Guard.
//
// Pattern aus components/ki-workspace/AnswerPane.tsx:274 (inline-Regex
// `^(https?:|mailto:|\/)`) als wiederverwendbaren Helper extrahiert und
// gehaertet:
//  - protocol-relative URLs (`//evil.com`) zusaetzlich geblockt
//  - scheme-lose Hosts (`www.example.com`) werden mit `https://` prefixed
//    statt zu `#` degradiert (R-913-4, analog meeting_link-Guard in
//    contacts/[id]/page.tsx)
//
// Cross-Repo-Reuse-Quelle (strategaize-pattern-reuse.md): jede Stelle, die
// user-/extern-beeinflusste URLs in `href`/`src` rendert.

/** Erkennt scheme-lose Hostnamen wie "www.example.com" oder "example.de/pfad". */
const SCHEMELESS_HOST = /^[a-z0-9äöü-]+(\.[a-z0-9äöü-]+)+([/?#]|$)/i;

/** Whitelist: http(s), mailto oder app-relative Pfade (KEIN protocol-relative `//`). */
const SAFE_SCHEME = /^(https?:|mailto:|\/(?!\/))/i;

/**
 * Liefert eine klick-sichere href fuer extern-/user-beeinflusste URLs.
 *
 * - `https://…`, `http://…`, `mailto:…`, `/relativ` → unveraendert
 * - `www.example.com` (scheme-los) → `https://www.example.com`
 * - alles andere (`javascript:`, `data:`, `vbscript:`, `//evil`, Muell) → `#`
 */
export function safeExternalHref(url: string | null | undefined): string {
  if (!url) return "#";
  const trimmed = url.trim();
  if (!trimmed) return "#";
  if (SAFE_SCHEME.test(trimmed)) return trimmed;
  if (SCHEMELESS_HOST.test(trimmed)) return `https://${trimmed}`;
  return "#";
}

/**
 * Write-Path-Variante: ist der Wert als externe URL speicherbar?
 * Leere Werte sind ok (Feld optional) — nur aktiv-unsichere Werte rejecten.
 */
export function isSafeExternalUrlInput(url: string | null | undefined): boolean {
  if (!url || !url.trim()) return true;
  return safeExternalHref(url) !== "#";
}
