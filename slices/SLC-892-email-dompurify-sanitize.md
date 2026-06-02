# SLC-892 — V8.10 Email-HTML DOMPurify-Sanitize (Stored-XSS Defense)

- Feature: BL-498 (V8.10 Security Sprint 2 Slice 1)
- Status: planned
- Priority: High (PRE-LIVE PFLICHT)
- Created: 2026-06-02
- Estimated effort: ~3h Code + ~30 Min /qa
- Audit-Quelle: docs/SECURITY_AUDIT_2026-05-30.md SEC-005

## Goal

Schliesst Stored-XSS-Pfad in Inbound-Email-Rendering. Aktuelle 4-Zeilen-Regex in `cockpit/src/app/(app)/emails/email-detail.tsx:331-338` ist trivial umgehbar via `<svg onload>`, `<img onerror>`, HTML-Entity-Encoding, `data:text/html`-URLs. Jeder maliziose Inbound-Sender kann beliebigen JS-Code im BS-App-Context ausfuehren (Session-Cookies + LocalStorage + DOM).

Fix: `isomorphic-dompurify` mit strikter Tag-/Attr-Whitelist + iframe-Sandbox-Defense-in-Depth + OWASP-XSS-Cheatsheet-Vitest-Suite.

## Scope (In)

- Neue Sanitization-Layer `cockpit/src/lib/email/sanitize-email-html.ts` (Pure-Function, Server-Side via jsdom, Client-Side via window.DOMPurify)
- Migration `email-detail.tsx` aus dem 4-Zeilen-Regex auf den neuen Helper
- iframe-Sandbox-Wrapper als Rendering-Layer (Defense-in-Depth — auch wenn DOMPurify versagt, faengt der Browser-Sandbox-Layer ab)
- OWASP-XSS-Cheatsheet-Vitest-Suite mit mind. 20 Cases
- ALLOWED_TAGS-Whitelist: nur Basic-Email-HTML (p, br, hr, h1-h6, b, i, strong, em, u, ul, ol, li, blockquote, a, img, table, thead, tbody, tr, th, td, div, span)
- ALLOWED_ATTR-Whitelist: nur href, src, alt, title, target (target wird auf `_blank` + `rel="noopener noreferrer"` erzwungen)
- BLOCK explizit: script, iframe, object, embed, svg, link, style, meta, base, form, input, button, textarea, audio, video, source
- BLOCK URL-Schemes: javascript:, data: (ausser `data:image/*` fuer Email-Inline-Images, mit Whitelist)
- Live-Smoke gegen 3-5 echte IMAP-Mails (Render-Regression-Check)

## Scope (Out)

- Outbound-Email-Sanitization (out-of-scope — outbound HTML ist user-controlled, BS-eigen)
- Markdown-Renderer `renderLegalMarkdown` (V8.2/V8.8) — separater Pfad
- Help-Hotspot-Modal-Markdown (V8.8 BL-489 L-1 Risk akzeptiert)
- CSP-Headers — separat als V8.12 BL-501 (Defense-in-Depth-Layer)

## Acceptance Criteria

- **AC-892-1**: `isomorphic-dompurify` als prod-Dependency installed (npm install) + im `package.json` sichtbar
- **AC-892-2**: Pure-Function `sanitizeEmailHtml(html: string): string` in `cockpit/src/lib/email/sanitize-email-html.ts` rendert Whitelist-konformen HTML
- **AC-892-3**: ALLOWED_TAGS-Whitelist enthaelt nur Basic-Email-HTML, alle BLOCK-Tags werden entfernt (Vitest)
- **AC-892-4**: ALLOWED_ATTR-Whitelist enthaelt nur sichere Attribs, `on*` und `style` werden entfernt (Vitest)
- **AC-892-5**: `<a href>` mit `target="_blank"` bekommt automatisch `rel="noopener noreferrer"` (Vitest)
- **AC-892-6**: URL-Scheme-Filter blockiert `javascript:`, `data:text/html`, erlaubt `data:image/png|jpeg|gif|webp` (Vitest)
- **AC-892-7**: OWASP-XSS-Cheatsheet-Vitest mit mind. 20 Cases gruen (z.B. `<script>`, `<svg onload>`, `<img onerror>`, Entity-Encoded `&#x3c;script&#x3e;`, `data:text/html`, `javascript:alert(1)`, nested-tag-tricks, malformed-tags, CSS-expression-attacks)
- **AC-892-8**: `email-detail.tsx` ruft `sanitizeEmailHtml()` statt `sanitizeHtml()` (Pure-Helper-Wrapper aus Z.331-338 wird entfernt)
- **AC-892-9**: Email-HTML wird in iframe `sandbox=""` (ohne allow-*) gerendert — Defense-in-Depth, blockiert Inline-Scripts auch bei DOMPurify-Versagen
- **AC-892-10**: Live-Smoke gegen 3-5 echte IMAP-Mails — Render-Regression-Check (HTML-Mails von Gmail, Outlook, Newsletter — keine optische Regression in legitimen Inhalten)
- **AC-892-11**: Vitest mind. 20 neue Cases gruen, Full-Suite ohne Regression (Baseline V8.7-A 1204/1204)
- **AC-892-12**: Quality-Gates: TSC EXIT=0, ESLint EXACT V8.9-Baseline 142e/57w (0 neue Findings), Next-Build clean

## Micro-Tasks

### MT-1: isomorphic-dompurify installieren + Pattern-Library-Entry
- Goal: Dependency hinzufuegen + Strategaize-Pattern-Library-Eintrag schreiben (kein OP/IS-Pattern existiert, neu)
- Files:
  - `cockpit/package.json` (Dep `isomorphic-dompurify`)
  - `c:/strategaize/strategaize-dev-system/docs/PATTERN_LIBRARY/11-html-sanitization.md` (neu — Cross-Repo-Pattern)
- Expected behavior: `npm install` clean, isomorphic-dompurify >=2.x als dependency
- Verification: `npm ls isomorphic-dompurify` zeigt installiert, `npm run build` clean
- Dependencies: none

### MT-2: Pure-Function sanitizeEmailHtml mit Whitelist
- Goal: Sanitization-Helper als Pure-Function
- Files:
  - `cockpit/src/lib/email/sanitize-email-html.ts` (neu)
  - `cockpit/src/lib/email/__tests__/sanitize-email-html.test.ts` (neu)
- Expected behavior:
  - `sanitizeEmailHtml(html: string): string` rendert Whitelist-konformen HTML
  - ALLOWED_TAGS + ALLOWED_ATTR-Constants exportiert
  - `target="_blank"` + `rel="noopener noreferrer"` erzwingung via HOOK_AFTER_SANITIZE
  - URL-Scheme-Filter integriert (javascript: + data:text/html blockiert, data:image/* whitelisted)
- Verification: Vitest mind. 20 OWASP-XSS-Cheatsheet-Cases gruen
- Dependencies: MT-1

### MT-3: iframe-Sandbox-Wrapper als Render-Layer
- Goal: Defense-in-Depth via Browser-Sandbox
- Files:
  - `cockpit/src/components/emails/email-html-iframe.tsx` (neu)
  - `cockpit/src/components/emails/__tests__/email-html-iframe.test.tsx` (neu)
- Expected behavior:
  - `<EmailHtmlIframe html={sanitizedHtml} />` rendert `<iframe sandbox="" srcDoc={html} />`
  - Auto-resize Height via postMessage von innen, robust per `useEffect`-onLoad
  - Konsistenter Style-Inject (Tailwind-Email-Defaults) via `<style>` im srcDoc
- Verification: Vitest 3-4 Cases (Rendering, Sandbox-Attribut, Height-Resize)
- Dependencies: MT-2

### MT-4: email-detail.tsx auf neuen Helper migrieren
- Goal: 4-Zeilen-Regex entfernen, Caller umstellen
- Files:
  - `cockpit/src/app/(app)/emails/email-detail.tsx` (modify Z. 232 + 331-338)
- Expected behavior:
  - Import `sanitizeEmailHtml` + `EmailHtmlIframe`
  - Z.232 dangerouslySetInnerHTML-Pattern wird zu `<EmailHtmlIframe html={sanitizeEmailHtml(message.body_html)} />`
  - Lokaler `sanitizeHtml`-Helper (Z. 331-338) wird entfernt
- Verification: TSC EXIT=0, Build clean, ESLint EXACT V8.9-Baseline
- Dependencies: MT-2, MT-3

### MT-5: Live-Smoke gegen 3-5 echte IMAP-Mails
- Goal: Render-Regression-Check
- Files:
  - `cockpit/qa/SLC-892-live-smoke.md` (neu)
- Expected behavior:
  - 3-5 Mail-Variationen (Gmail-Plain, Outlook-Newsletter-mit-Bildern, HTML-Signatur-mit-Tabelle, evtl. multipart-mit-Inline-Image)
  - Vorher-/Nachher-Screenshot dokumentiert
  - Keine optische Regression in legitimen Inhalten
- Verification: User-Browser-Smoke ODER Playwright-MCP autonomous-Smoke
- Dependencies: MT-4

### MT-6: Quality-Gates + Records-Sync
- Goal: Finalize
- Files:
  - `slices/INDEX.md` (Status update SLC-892 → done)
  - `features/INDEX.md` (BL-498-Feature → done)
  - `planning/backlog.json` (BL-498 → done)
  - `docs/KNOWN_ISSUES.md` (SEC-005 → resolved)
  - `docs/STATE.md` (Phase update)
- Expected behavior: Alle Quality-Gates gruen (TSC + ESLint + Vitest + Build), Records reflect SLC-892-Done-Stand
- Verification: `npm run test:tsc && npm run test && npm run lint && npm run build`
- Dependencies: MT-5

## Risks

- **R-1 (Medium) Whitelist-Drift im Production-Use**: Legitime Email-Templates nutzen oft `<style>`-Tag oder Inline-CSS. Whitelist wird `<style>` blockieren — Mails mit `<style>` verlieren CSS-Styling im Render. Mitigation: Live-Smoke MT-5 prueft das, falls Regression: `ALLOW_UNKNOWN_PROTOCOLS=false` mit gezielter `<style>`-Whitelist-Erweiterung dokumentieren als DEC.
- **R-2 (Low) Bundle-Size-Increase**: `isomorphic-dompurify` ist ~50KB minified. Akzeptabel fuer Security-Layer.
- **R-3 (Low) jsdom-Performance bei grossen Mails**: Server-Side-Sanitize ueber jsdom ist langsamer als nativ-DOMPurify im Browser. Mails sind typischerweise <100KB HTML, akzeptabel.
- **R-4 (Low) iframe-Sandbox Inline-Image-Inkompatibilitaet**: `data:image/*` URLs werden im Sandbox erlaubt, aber Cross-Origin-Loads (http://...) muessen via CSP separat freigegeben werden in V8.12. Bis dahin koennten externe Bilder broken sein im Sandbox. Mitigation: in MT-5 testen, ggf. Sandbox-`allow-same-origin` als bewusste Lockerung dokumentieren als DEC.

## Verification Plan

1. **TDD**: MT-2 Pure-Function vor Implementation Tests schreiben (OWASP-XSS-Cheatsheet als RED-Tests)
2. **Quality-Gates**: TSC + ESLint + Vitest + Build nach jedem MT
3. **Live-Smoke**: 3-5 echte IMAP-Mails (MT-5)
4. **Pattern-Library-Entry** in Dev-System (MT-1) als Cross-Repo-Reuse-Vorlage fuer OP + IS

## Pattern-Reuse-Audit (Result)

- **isomorphic-dompurify**: NICHT in OP/IS/BS aktiv installiert. Neu eingefuehrt + Pattern-Library-Entry `11-html-sanitization.md` als Cross-Repo-Vorlage.
- **iframe-Sandbox-Pattern**: NICHT in OP/IS/BS aktiv. Neu, Pattern-Library-Entry ergaenzen.
- **OWASP-XSS-Cheatsheet**: Standard-Referenz (https://owasp.org/www-community/xss-filter-evasion-cheatsheet), kein internes Pattern.

## DEC-Candidates (Implementation-Time)

- DEC-259 ALLOWED_TAGS-Whitelist-Inhalt (welche Tags konkret)
- DEC-260 iframe-Sandbox-Modus (`""` vs `"allow-same-origin"`)
- DEC-261 Cross-Origin-Image-Handling (in V8.10 oder deferred V8.12 mit CSP)

## Out-of-Scope (Future)

- CSP-Headers (V8.12 BL-501) — strukturelle Defense-in-Depth-Schicht
- Outbound-Email-HTML-Sanitize (BS-eigene Compose, nicht in V8.10)
- Markdown-Renderer-Hardening (V8.8 BL-489 L-1, separater Pfad)
