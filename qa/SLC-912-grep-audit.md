# SLC-912 V8.14 Security-Hotfix — Code-Level Closure grep-Audit

Stand: 2026-06-12, /backend SLC-912 done Code-Side. Belegt fuer jedes der 7 Findings
(ISSUE-098..104) die implementierte Code-Aenderung. Status-Flip auf `resolved` erfolgt
in /qa (Code-Side) bzw. /deploy (Live, AC-912-10). ISSUE-105 (Open-Redirect) war bereits
Pre-Slice resolved (DEC-300).

## Quality-Gates (Full)
- `npx tsc --noEmit` → EXIT 0
- `npx eslint <14 changed/new files>` → EXIT 0
- `npx vitest run` (jsdom, `src/**`) → **1485/1485 PASS, 162 Files** (~33 neue Tests in dieser Slice)
- MIG-051 DB-Verify (`__tests__/migrations/051-*.test.ts`) liegt ausserhalb `src/**` → laeuft NICHT im default-Run; explizit im /deploy gegen Coolify-DB (AC-912-10).

## ISSUE-098 (Blocker) — profiles.role Column-Level-Lock (MT-1)
- Datei (NEU): `sql/migrations/051_v814_slc912_profiles_role_protect.sql`
- Evidence: `grep -c "current_user <> 'service_role'"` → 3 (Kommentar + Guard-Bedingung).
- BEFORE-UPDATE-Trigger `profiles_role_change_guard`; RAISE bei `NEW.role IS DISTINCT FROM OLD.role AND current_user <> 'service_role'`. service_role-aware (DEC-301/R-912-1).
- DB-Verify-Test (NEU): `cockpit/__tests__/migrations/051-v814-profiles-role-protect.test.ts` — authenticated-block + postgres-block + service_role-allow + last_login_at-allow + Schema-Anwesenheit.
- **Live-Gate offen:** MIG-051 noch NICHT auf Coolify-DB appliziert (AC-912-10, /deploy).

## ISSUE-099 (High) — Login-Rate-Limit (MT-2)
- Dateien: `cockpit/src/lib/security/rate-limit.ts` (erweitert) + `cockpit/src/app/(auth)/login/actions.ts`
- Evidence: `grep -c "peekRateLimit\|LOGIN_GENERIC_ERROR"` login/actions.ts → 5.
- peek-before-signin Lockout (gesperrte 6. Anfrage ohne GoTrue-Touch), Fehlversuch-Zaehlung nur bei Fail, Clear bei Erfolg, generische Message (kein `error.message`-Leak). 4 Vitest GREEN.
- 2. Bremse GoTrue `GOTRUE_RATE_LIMIT_*` = Founder-Coolify-ENV (/deploy).

## ISSUE-100 (High) — DSE-Markdown XSS-Sanitize + Write-Validator (MT-3)
- Dateien: `cockpit/src/lib/legal/markdown.ts`, `cockpit/src/lib/legal/validate-markdown.ts` (NEU), `cockpit/src/app/(app)/settings/compliance/customer-dse/actions.ts`
- Evidence: `grep -c sanitizeEmailHtml markdown.ts` → 2 (import + call); `grep -c findUnsafeMarkup customer-dse/actions.ts` → 2 (import + call).
- Render-Path: `renderLegalMarkdown` → `sanitizeEmailHtml` (DOMPurify-Reuse V8.10 SLC-892). Write-Path: `findUnsafeMarkup` rejected `<script>`/Event-Handler/`javascript:`/iframe/svg/data:text/html. OWASP-Adversarial-Vitest GREEN (render + validator + legitimes Markdown bleibt).

## ISSUE-101 (Medium) — uploadLogo Role-Check (MT-4)
- Datei: `cockpit/src/app/(app)/settings/branding/actions.ts`
- Evidence: `grep -c assertRole` → 2 (import + call). `await assertRole(["admin"])` als erste Pruefung von `uploadLogo`, vor `createAdminClient()`.

## ISSUE-102 (Medium) — SVG-MIME-Block + Logo-Route-Headers (MT-4)
- Dateien: `cockpit/src/app/(app)/settings/branding/actions.ts`, `cockpit/src/app/api/branding/logo/route.ts`
- Evidence: `image/svg+xml` NICHT mehr in ALLOWED_MIME (Set = png/jpeg/webp). Route: `grep -c "nosniff\|Content-Disposition\|sandbox"` → 4. `Content-Disposition: inline` + `X-Content-Type-Options: nosniff` + `Content-Security-Policy: default-src 'none'; style-src 'unsafe-inline'; sandbox`.
- Hinweis: `extOf()` enthaelt noch den `image/svg+xml → "svg"`-Zweig (toter Pfad, da SVG MIME-gegated rejected wird) — bewusst belassen (surgical-changes), kein Sicherheitsrisiko.

## ISSUE-103 (Low) — Log-PII-Redaction im Cron (MT-5)
- Dateien: `cockpit/src/app/api/cron/classify/route.ts`, `cockpit/src/lib/logger/redact.ts`
- Evidence: `grep -c "console.log(" cron/classify/route.ts` → **0**. `grep -cE "from_address|body_text|x-cron-secret" redact.ts` → 3.
- Alle `console.log` → `logSafe`; PII-Zeile (from_address) als Objekt-Key (redacted). `DEFAULT_REDACT_KEYS` 12→17. `console.error` belassen (kein PII; redactSecrets wuerde Error-Properties verschlucken).

## ISSUE-104 (Low) — getCurrentUserRole fail-closed (MT-5)
- Datei: `cockpit/src/lib/audit.ts`
- Evidence: `grep -c 'return null' audit.ts` → 5; `grep -c 'return "admin"' audit.ts` → **0**.
- `getCurrentUserRole(): Promise<string|null>` returnt `null` bei null-user/missing-profile/catch. `/audit-log`-Page-Gate (`role !== "admin" → redirect`) existierte bereits. 4 Vitest GREEN.

## ISSUE-105 (High) — Open-Redirect — bereits resolved (Pre-Slice DEC-300)
- Kein SLC-912-Code-Touch. Nur Founder-ENV `TRACKING_HMAC_SECRET` vor Deploy (sonst Tracking-Click-Redirects fail-closed). DEC-300 retroaktiv in DECISIONS.md geschrieben (war referenziert ohne Heading).
