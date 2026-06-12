# SLC-912 — V8.14 Security-Hotfix Bundle (profiles.role-Lock + Login-Rate-Limit + DSE-XSS + Branding-Hardening + Log/Auth-Hygiene)

## Status

- Version: V8.14
- Feature: FEAT-924
- Backlog: BL-515
- Status: planned
- Priority: Blocker
- Created: 2026-06-11

## Purpose

Schliesst die 1 Blocker + 2 High + 2 Medium + 2 Low Security-Findings aus dem Out-of-Band Multi-Lens-Security-Audit 2026-06-07 (8 Lenses, 67 Subagents, Workflow `wf_2c908025-94f`), die den V8.11-RLS-Sweep + V8.12-Defense-in-Depth-Sprint ueberlebt haben. Primaer durch ein Column-Level-Protection-Gap (IMP-1200) und ein Auth-Hardening-Gap.

ISSUE-105 (Open-Redirect /api/track HMAC) ist bereits **resolved** als Pre-Slice-Hotfix (DEC-300, Commits `d2c9740` + `c0f8c61`, noch nicht gepusht) — nur die Coolify-ENV `TRACKING_HMAC_SECRET` muss vor Deploy gesetzt sein.

**Single-Slice-Bundle** (analog V8.12 SLC-906): alle 7 Findings sind security-thematisch kohaerent, Aufwand ~4-6h /backend + /qa. Single-Branch `main` direkt, kein Worktree (Internal-Test-Mode, Single-Founder, Defense-in-Depth-Closure ohne V8.11-Risk-Profil). Die einzige Schema-Aenderung (MIG-051) ist ein additiver Trigger mit klarem Rollback (`DROP TRIGGER`).

## Exploit-Chain (Pre-Customer-Live-Blocker — heute 0 Customer-Impact durch Single-Founder)

```
Chain 1 (Blocker):
1. Tenant-Member: PATCH /rest/v1/profiles?id=eq.<own-id> {"role":"admin"}  → Self-Promotion (ISSUE-098)
2. Frischer Admin: /settings/compliance/customer-dse → DSE-Markdown mit <script> editieren (ISSUE-100)
3. Public-Visitor /p/<slug>/datenschutz triggert Script → XSS feuert (CSP Report-Only Phase-A = kein Mitigant)

Chain 2:
ISSUE-101 (uploadLogo ohne Role-Check) + ISSUE-102 (SVG-MIME erlaubt) → Member ueberschreibt Logo mit malicious SVG → Stored XSS in Admin-Session beim Logo-Render
```

## In Scope

| MT | Issue | Sev | File(s) | Fix-Pattern |
|---|---|---|---|---|
| MT-1 | ISSUE-098 | **Blocker** | `sql/migrations/051_v814_slc912_profiles_role_protect.sql` (NEU) + Vitest | BEFORE-UPDATE-Trigger auf `profiles`: blockt role-Change wenn `current_user <> 'service_role'`. Column-Level-Protection (IMP-1200). |
| MT-2 | ISSUE-099 | High | `cockpit/src/app/(auth)/login/actions.ts` + Vitest | `checkRateLimit` (existing `lib/security/rate-limit.ts`) wiren (5 Fails/15min/Email+IP), generische Error-Message, Lockout-State. |
| MT-3 | ISSUE-100 | High | `cockpit/src/lib/legal/markdown.ts` + `cockpit/src/app/(app)/settings/compliance/customer-dse/actions.ts` + Vitest | `remark-html` `sanitize:true` ODER `rehype-sanitize`-Pipe + Server-Side-Validator der Raw-`<script>`/Event-Handler rejected. OWASP-XSS-Adversarial-Tests. |
| MT-4 | ISSUE-101 + ISSUE-102 | Medium | `cockpit/src/app/(app)/settings/branding/actions.ts` + `cockpit/src/app/api/branding/logo/route.ts` + Vitest | `assertRole(["admin"])` am Top von `uploadLogo`; `image/svg+xml` aus ALLOWED_MIME entfernen; `Content-Disposition: inline` + CSP-Header auf Logo-Response. |
| MT-5 | ISSUE-103 + ISSUE-104 | Low | `cockpit/src/app/api/cron/classify/route.ts` + `cockpit/src/lib/logger/index.ts` (DEFAULT_REDACT_KEYS) + `cockpit/src/lib/audit.ts` + Vitest | `logSafe('info', ...)` statt `console.log`; DEFAULT_REDACT_KEYS um `from_address`/`recipient`/`body_text`/`transcript`/`x-cron-secret` erweitern; `getCurrentUserRole` fail-closed (`return null`); `/audit-log`-Page explizit `if (role !== "admin") redirect`. |
| MT-6 | — | — | `docs/KNOWN_ISSUES.md`, `slices/INDEX.md`, `features/INDEX.md`, `planning/*.json`, `docs/STATE.md`, `docs/MIGRATIONS.md`, `docs/DECISIONS.md` | Records-Sync + 7 ISSUEs resolved + grep-Audit-Doc. |

## Out of Scope

- Container-Upgrade GoTrue v2.186 / Storage v1.44.2 (eigener Sprint, Schema-Migration-Audit)
- ISSUE-105 (bereits resolved als Pre-Slice-Hotfix DEC-300 — nur Coolify-ENV-Action im Deploy)
- ISSUE-095/096/097 (operational/stability/cost-cap, pre-existing, Internal-Test-Mode-konform)
- SLC-910 Phase-B CSP strict-Switch (separater V8.12-Burn-In-Folgeschritt)
- Multi-Instance-faehiger Persistent-Rate-Limit-Store (In-Memory reicht im Single-Container-Internal-Test-Mode; Redis Post-Customer-Live-Slot)

## Acceptance Criteria

- AC-912-1 (ISSUE-098): Nach MIG-051 wirft `PATCH /rest/v1/profiles {role:...}` als `authenticated` einen Fehler; `changeRole` via `createAdminClient()` (service_role) funktioniert unveraendert; `last_login_at`-Update via user-client funktioniert unveraendert (kein Kollateral-Block auf andere Spalten).
- AC-912-2 (ISSUE-099): Login wirft nach 5 Fehlversuchen (Email+IP) innerhalb 15min generisch `"E-Mail oder Passwort ungueltig"` + Lockout; kein verbatim `error.message`-Leak (keine User-Enumeration).
- AC-912-3 (ISSUE-100): DSE-Markdown mit `<script>`, `<img onerror>`, `<svg onload>`, `javascript:`-URL wird sanitized gerendert UND vom Server-Side-Validator in `updateCustomerDse` rejected; OWASP-XSS-Adversarial-Vitest GREEN.
- AC-912-4 (ISSUE-101): `uploadLogo` wirft fuer non-admin (`assertRole(["admin"])`); Member-Logo-Upload schlaegt fehl.
- AC-912-5 (ISSUE-102): `image/svg+xml` nicht mehr in ALLOWED_MIME; SVG-Upload rejected; Logo-Route liefert `Content-Disposition: inline` + restriktive CSP.
- AC-912-6 (ISSUE-103): `cron/classify/route.ts` nutzt `logSafe`; keine rohe PII-Interpolation; DEFAULT_REDACT_KEYS um BS-Domain-PII erweitert.
- AC-912-7 (ISSUE-104): `getCurrentUserRole` returnt `null` bei null-user/missing-profile/catch (kein fail-open `'admin'`); `/audit-log`-Page hat expliziten `role !== "admin"`-Redirect.
- AC-912-8: 7 Issues in `docs/KNOWN_ISSUES.md` auf `Status: resolved` mit Resolution-Note (ISSUE-098..104; ISSUE-105 schon resolved).
- AC-912-9: TSC=0, ESLint=0 (keine V8.14-Regression ggue Baseline), Full-Vitest-Suite jsdom GREEN.
- AC-912-10 (Live, post-Deploy): MIG-051 auf Coolify-DB applied (sql-migration-hetzner.md); Founder-ENV `TRACKING_HMAC_SECRET` + `GOTRUE_RATE_LIMIT_*` gesetzt; Live-Smoke Self-Promotion-Attempt blockiert + changeRole funktional.

## Risks

- **R-912-1 (kritisch, MT-1)**: Naiver `BEFORE UPDATE … NOT is_admin()`-Trigger (wie im Audit-Memo vorgeschlagen) wuerde `changeRole` brechen — `changeRole` ([cockpit/src/lib/team/actions.ts:144-166](../cockpit/src/lib/team/actions.ts)) updatet `profiles.role` via `createAdminClient()` (service_role), und `is_admin()` evaluiert im service_role-Kontext zu `false` (keine `auth.uid()`/Profil). **Mitigation**: Trigger MUSS den service_role-Pfad erlauben — Bedingung `current_user <> 'service_role'` (oder `current_setting('request.jwt.claims',true)::json->>'role' <> 'service_role'`). QA verifiziert beide Pfade: Attack blockiert + `changeRole` funktional. **Decision-Point fuer /backend**: Trigger-Ansatz (robust ggue Schema-Drift, empfohlen) vs. `REVOKE UPDATE ON profiles FROM authenticated; GRANT UPDATE (<alle Spalten ausser role>) …` (erfordert Spalten-Enumeration, brittle). Empfehlung: **Trigger**.
- **R-912-2 (MT-3)**: DSE-Markdown-Sanitize koennte legitime Formatierung (Tabellen, Links) zerstoeren wenn die Safelist zu strikt ist. **Mitigation**: `rehype-sanitize` mit Default-GitHub-Safelist (erlaubt Standard-Markdown-HTML, blockt script/event-handler) statt Hard-`sanitize:true`-Strip; Vitest mit legitimem Markdown + Attack-Payloads.
- **R-912-3 (MT-5)**: `getCurrentUserRole` fail-closed (`null` statt `'admin'`) koennte eine bisher fail-open-getragene Code-Pfad-Annahme brechen. **Mitigation**: grep alle Caller von `getCurrentUserRole`; das `/audit-log`-Layout-Gate schirmt heute bereits ab (ISSUE-104 ist Defense-in-Depth, nicht end-to-end exploitable) — Vitest deckt beide Pfade.
- **R-912-4 (MT-2)**: In-Memory-Rate-Limit-State survivt Container-Restart/Multi-Instance nicht. **Mitigation**: akzeptiert im Single-Container-Internal-Test-Mode; GoTrue-`GOTRUE_RATE_LIMIT_*` als zweite Bremse via Coolify-ENV; Persistent-Store als Post-Customer-Live-Slot dokumentiert.
- **R-912-5 (MT-1, Deploy)**: MIG-051 muss auf Coolify-DB via `sql-migration-hetzner.md` (postgres-Superuser, base64) appliziert werden — Reihenfolge: Code-Push + Migration im selben /deploy-Fenster, sonst PostgREST-Schema-Cache-Drift. **Mitigation**: `NOTIFY pgrst, 'reload schema'` am Ende der Migration; Rollback = `DROP TRIGGER`.

## Dependencies

- V8.12 STABLE (Pre-Condition: /post-launch T+24h-PASS ~2026-06-11 16:31 UTC). **Bei FAIL: V8.14 deferred bis V8.12 stable.**
- ISSUE-105-Pre-Slice-Hotfix-Commits (`d2c9740` + `c0f8c61`) gegen `origin/main` Pre-Merge-Re-Check (V8.12-Master-Merge-Konflikt-frei).
- Existing Reuse-Quellen verifiziert: `checkRateLimit` (`lib/security/rate-limit.ts`), `assertRole` (`lib/auth/assert-role.ts`, V5+), `logSafe`/`redactSecrets` (`lib/logger/index.ts`, V8.12 SLC-907), OWASP-XSS-Test-Vorlage (`lib/email/sanitize-email-html.test.ts`, V8.10 SLC-892).

## Micro-Tasks

### MT-1: ISSUE-098 Blocker — profiles.role Column-Level-Lock (MIG-051)
- Goal: Verhindere PostgREST-`PATCH`-Self-Promotion auf `profiles.role` durch `authenticated`, ohne den legitimen service_role-`changeRole`-Pfad zu brechen.
- Files: `sql/migrations/051_v814_slc912_profiles_role_protect.sql` (NEU), `cockpit/__tests__/migrations/051-v814-profiles-role-protect.test.ts` (NEU)
- Expected behavior: BEFORE-UPDATE-Trigger `profiles_role_change_guard` raised Exception wenn `NEW.role IS DISTINCT FROM OLD.role AND current_user <> 'service_role'`. `changeRole` (service_role) + `last_login_at`-Update (user-client, role unangetastet) bleiben funktional.
- Verification: Vitest gegen Coolify-DB (node:20-Sidecar, SAVEPOINT-Pattern fuer erwartete Rejection per coolify-test-setup.md): (a) `SET ROLE authenticated; UPDATE profiles SET role='admin'` → Exception; (b) service_role `UPDATE … role` → success; (c) authenticated `UPDATE … last_login_at` → success. Migration idempotent (`DROP TRIGGER IF EXISTS` + `CREATE`).
- Dependencies: none

### MT-2: ISSUE-099 High — Login-Rate-Limit + generische Error-Message
- Goal: Brute-Force/Credential-Stuffing-Schutz auf `signInWithPassword`.
- Files: `cockpit/src/app/(auth)/login/actions.ts`, `cockpit/src/app/(auth)/login/__tests__/actions.test.ts` (NEU)
- Expected behavior: Vor `signInWithPassword` `checkRateLimit({key: email+ip, max:5, windowMs:15*60*1000})`; bei Ueberschreitung generische Fehlermeldung, kein DB-Call; bei Auth-Fail generisches `"E-Mail oder Passwort ungueltig"` statt verbatim `error.message`.
- Verification: Vitest — 6. Fehlversuch → Lockout-Message ohne Supabase-Touch; Auth-Fail → generische Message (kein Enumeration-Leak).
- Dependencies: none

### MT-3: ISSUE-100 High — DSE-Markdown XSS-Sanitize + Server-Validator
- Goal: Stored-XSS auf Public-DSE-Page unterbinden (Render + Write-Path).
- Files: `cockpit/src/lib/legal/markdown.ts`, `cockpit/src/app/(app)/settings/compliance/customer-dse/actions.ts`, `cockpit/src/lib/legal/__tests__/markdown.test.ts` (NEU/erweitert)
- Expected behavior: `markdown.ts` sanitized Output (rehype-sanitize Default-Safelist ODER `sanitize:true`); `updateCustomerDse` rejected Raw-`<script>`/Event-Handler/`javascript:`-URLs Server-Side bevor persistiert wird.
- Verification: OWASP-XSS-Adversarial-Vitest (Port aus `lib/email/sanitize-email-html.test.ts`): `<script>`, `<img onerror>`, `<svg onload>`, `javascript:`-Link, HTML-Entity-Encoding alle neutralisiert; legitimes Markdown (Headings, Listen, Tabellen, Links) bleibt erhalten.
- Dependencies: none

### MT-4: ISSUE-101 + ISSUE-102 Medium — Branding-uploadLogo Role-Check + SVG-MIME-Block
- Goal: Branding-Logo-Defacement/SVG-XSS-Chain schliessen.
- Files: `cockpit/src/app/(app)/settings/branding/actions.ts`, `cockpit/src/app/api/branding/logo/route.ts`, `cockpit/src/app/(app)/settings/branding/__tests__/actions.test.ts` (NEU/erweitert)
- Expected behavior: `await assertRole(["admin"])` als erste Zeile von `uploadLogo`; `image/svg+xml` aus ALLOWED_MIME entfernt; Logo-Route setzt `Content-Disposition: inline` + restriktive CSP/`X-Content-Type-Options: nosniff`.
- Verification: Vitest — non-admin `uploadLogo` wirft; SVG-Upload rejected (MIME nicht in Whitelist); admin PNG/JPG funktional.
- Dependencies: none (assertRole-Reuse aus V8.12 SLC-906)

### MT-5: ISSUE-103 + ISSUE-104 Low — Log-PII-Redaction + Auth-Fail-Closed
- Goal: PII-Log-Leak im Cron schliessen + invertiertes fail-open-Threat-Model in `getCurrentUserRole` umkehren.
- Files: `cockpit/src/app/api/cron/classify/route.ts`, `cockpit/src/lib/logger/index.ts`, `cockpit/src/lib/audit.ts`, `cockpit/src/lib/__tests__/audit.test.ts` (erweitert)
- Expected behavior: `cron/classify` nutzt `logSafe('info', ...)` statt roher `console.log`-PII-Interpolation; `DEFAULT_REDACT_KEYS` um `from_address`/`recipient`/`body_text`/`transcript`/`x-cron-secret` erweitert; `getCurrentUserRole` returnt `null` bei null-user/missing-profile/catch; `/audit-log`-Page expliziter `if (role !== "admin") redirect("/dashboard")`.
- Verification: Vitest — `getCurrentUserRole` null/error → `null` (nicht `'admin'`); redact maskiert neue Keys; grep `console.log` in `cron/classify/route.ts` = 0.
- Dependencies: MT-3-unabhaengig; nutzt `redactSecrets`-Keys aus V8.12 SLC-907

### MT-6: Records-Sync + grep-Audit-Doc
- Goal: Projekt-Records auf V8.14-Realitaet bringen.
- Files: `docs/KNOWN_ISSUES.md` (ISSUE-098..104 → resolved), `docs/MIGRATIONS.md` (MIG-051), `docs/DECISIONS.md` (DEC fuer Trigger-Ansatz), `slices/INDEX.md`, `features/INDEX.md`, `planning/backlog.json`, `planning/roadmap.json`, `docs/STATE.md`, `qa/SLC-912-grep-audit.md` (NEU)
- Expected behavior: Records konsistent, Cockpit zeigt V8.14 korrekt.
- Verification: Counts stimmen; grep-Audit-Doc belegt 0 verbleibende Findings.
- Dependencies: MT-1..MT-5 done

## Reihenfolge / Worktree / Migration

- **Reihenfolge**: MT-1 (Blocker, Migration + DB-Verify zuerst) → MT-2..MT-5 (parallel-faehig, Code-only, disjunkte Files) → MT-6 (zuletzt). Pro MT: TSC=0 + ESLint=0 + Full-Vitest-jsdom GREEN (per IMP-1108 BLOCKING).
- **Worktree**: Single-Branch `main` direkt (V8.12-Praezedenz, Internal-Test-Mode). Pre-Merge-Re-Check leicht (rebase + tests) da kein paralleler Slice in flight — ABER ISSUE-105-Pre-Slice-Commits (`d2c9740`+`c0f8c61`) muessen im selben Push mitgehen.
- **Migration**: MIG-051 additiv (Trigger). Apply auf Coolify-DB im /deploy via `sql-migration-hetzner.md` (postgres-Superuser, base64, `NOTIFY pgrst`). Rollback = `DROP TRIGGER profiles_role_change_guard ON profiles`. MIG-050 ist bewusst eine Luecke (war fuer SLC-909 LLM-Cost-Cap reserviert, entfiel per DEC-288 ohne dass je ein File entstand).

## Founder-Pre-Steps / Deploy-ENV-Actions (BLOCKING vor Deploy, kein Slice-Aufwand)

1. `TRACKING_HMAC_SECRET=$(openssl rand -hex 32)` in Coolify-BS-App-Resource-ENV (fuer bereits-resolved ISSUE-105 — sonst brechen Tracking-Click-Redirects fail-closed).
2. `GOTRUE_RATE_LIMIT_TOKEN_REFRESH` + `GOTRUE_RATE_LIMIT_EMAIL_SENT` in Coolify pinnen (zweite Bremse fuer ISSUE-099).
3. V8.12 /post-launch T+24h-PASS bestaetigt (V8.14 deferred bis V8.12 stable).

## Quelle

V8.13-Pre-Security-Audit 2026-06-07 (Workflow `wf_2c908025-94f`, 8 Lenses, 67 Subagents). Memory `project_bs_v813_security_audit_2026_06_07.md`. KNOWN_ISSUES ISSUE-098..105 Single-Source-of-Truth. Dev-System IMP-1200 (Column-Level-Protection) + IMP-1201 (Workflow-Verify-Rate-Limit). Versions-Nummer V8.14 (statt audit-bezeichnetem "V8.13") wegen Kollision mit released v8-13 Storage+Auth-Hotfix REL-045 — Founder-Entscheidung 2026-06-11.
