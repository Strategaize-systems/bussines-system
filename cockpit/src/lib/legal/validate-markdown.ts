// V8.14 SLC-912 MT-3 (ISSUE-100) — Server-Side Write-Path-Validator fuer Legal-Markdown.
//
// Defense-in-Depth zusaetzlich zum Render-Sanitizer (renderLegalMarkdown ->
// sanitizeEmailHtml). Der Render-Sanitizer ist die echte Sicherheitsschicht; dieser
// Validator rejected offensichtliche XSS-Payloads bereits beim Speichern, damit
// gefaehrlicher Markup gar nicht erst persistiert wird (+ klares User-Feedback).
//
// Cross-Repo-Origin-Pattern "Public-Markdown/Legal-DSE Stored-XSS-Sanitize"
// (siehe .claude/rules/strategaize-pattern-reuse.md). Reuse-Ziel: jedes Repo mit
// Public-Markdown-Render (DSE/Impressum/Help).

/** Klar gefaehrliche Markup-Muster, die in legitimem Legal-Markdown nichts zu suchen haben. */
const UNSAFE_PATTERNS: ReadonlyArray<{ re: RegExp; reason: string }> = [
  { re: /<script\b/i, reason: "<script>-Tag" },
  {
    re: /<\/?(iframe|object|embed|svg|style|form|link|meta|base|input|button)\b/i,
    reason: "nicht erlaubtes HTML-Tag (iframe/object/embed/svg/style/form/...)",
  },
  // Event-Handler-Attribute (onerror, onload, onclick, ...). Fuehrendes
  // Whitespace reduziert False-Positives auf Prosa-Woerter ("Information on").
  { re: /\son\w+\s*=/i, reason: "Inline-Event-Handler (on*=)" },
  { re: /javascript:/i, reason: "javascript:-URL" },
  { re: /vbscript:/i, reason: "vbscript:-URL" },
  { re: /data:text\/html/i, reason: "data:text/html-URL" },
];

/**
 * Returnt eine Begruendung, wenn `markdown` gefaehrlichen Markup enthaelt, sonst `null`.
 * Pure-Function — ohne Seiteneffekte, einzeln testbar.
 */
export function findUnsafeMarkup(markdown: string): string | null {
  for (const { re, reason } of UNSAFE_PATTERNS) {
    if (re.test(markdown)) return reason;
  }
  return null;
}
