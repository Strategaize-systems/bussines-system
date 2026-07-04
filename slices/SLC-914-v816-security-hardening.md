# SLC-914 — V8.16 Security-Hardening Bundle (startMeeting-IDOR + Class-C WITH-CHECK + Low-Hygiene)

- Version: V8.16
- Feature: FEAT-926 / BL-518
- Status: planned
- Priority: High
- Created: 2026-07-04
- Branch: main (Single-Branch, Internal-Test-Mode — Precedent SLC-912/SLC-913)

## Purpose

Schliesst die 4 offenen, nicht-getrackt-doppelten Findings aus dem Fable-5 Re-Audit über den deployten V8.15-Stand (RPT-659, `c9efb41` — der Audit **konvergierte nicht**): ein neues High (ISSUE-131), ein neues Medium (ISSUE-132) und zwei neue Low (ISSUE-133/134). Beide Substanz-Findings sind **Nachbar-Lücken einer Pattern-Klasse**, die frühere Sweeps ausgelassen haben (createAdminClient-Ownership-Sweep V8.12/V8.15 bzw. Multi-Parent-RLS V8.11) — daher ist die Fix-Disziplin hier **pattern-weit**, nicht auf die audit-benannten Einzelstellen beschränkt (IMP-1394).

V8.16 bündelt zusätzlich den **Abschluss von SLC-910 (CSP Phase-B)** als eigene Slice-Completion (siehe unten) → bringt V8.12 auf 100%. Danach ist die Audit-Kette bereit für die externe Gegenprobe `/code-review ultra` vor dem Multi-User-Schritt (security-audit-fable5-standard.md, Founder-Closure-Kriterium).

**Cross-Repo (OP/IS/immoscheckheft) = separater Follow-up**, NICHT in diesem Slot (Founder-Entscheidung 2026-07-04). Der BS-Fix ist die kanonische Quelle; die Sibling-Sweeps laufen danach.

## Scope

IN:
- ISSUE-131 (High) — `startMeeting()` auf User-Client umstellen (RLS/`can_see_owner`-Gate vor jedem Read/Write).
- ISSUE-132 (Medium) — Multi-Parent-Class-C INSERT/UPDATE-`WITH CHECK` härten (additive Migration MIG-054), **pattern-weit über den vollständigen Multi-Parent-Satz**, nicht nur die 7 audit-benannten Tabellen.
- ISSUE-133 (Low) — `AnswerPane.tsx:274` inline-Regex → `safeExternalHref`.
- ISSUE-134 (Low) — `lib/export/rate-limit.ts` leftmost-XFF → gehärteter `extractClientIp`.

OUT:
- Cross-Repo-Verifikation ISSUE-131/132 in OP/IS/immoscheckheft → separater Follow-up.
- Bereits getrackte Lows ISSUE-123 (Webhook-Replay) / 125 (`.or()`-Injection) / 126 (transcribe-Limit) — re-bestätigt im Re-Audit, kein Status-Change, kein V8.16-Scope.
- BL-517 (followup_engine-UI) — unabhängig, Founder-Produktentscheidung.

## Micro-Tasks

### MT-1: ISSUE-131 — startMeeting() User-Client-Switch (High)
- Goal: `startMeeting` liest den Deal und die Kontakte RLS-scoped (User-Client) und schreibt Meeting/Activity nur nach Ownership-Gate; keine fremde Contact-PII, kein unaufgeforderter Mailversand über Owner-Grenzen hinweg.
- Files:
  - `cockpit/src/app/actions/meetings.ts` (Ownership-Gate + User-Client-Reads + Business-Writes via User-Client)
  - `cockpit/src/lib/meetings/consent-check.ts` (optionaler `client`-Parameter, backward-compat Default `createAdminClient()`)
  - `cockpit/src/app/actions/__tests__/meetings.test.ts` (neu/erweitert)
- Expected behavior:
  1. Deal-Read via `createClient()` (RLS) → `"Deal nicht gefunden"` wenn nicht sichtbar (kein Admin-Read mehr).
  2. contactIds gegen die **sichtbare** Kontakt-Menge validieren (User-Client-SELECT); enthält die Anfrage nicht-sichtbare IDs → fail-closed (Fehler oder Filter auf sichtbare Teilmenge — /backend wählt konsistent zur analogen deal-products/insight-actions-Semantik).
  3. `checkConsentStatus` bekommt den User-Client durchgereicht (Client-Pass-Through, analog `applier.ts` ISSUE-117).
  4. `meetings`- + `activities`-INSERT via User-Client (Class-C-RLS greift, `owner_user_id = user.id` bleibt).
  5. `audit_log`-INSERT bleibt service-role/Admin **nach** dem Gate (append-only, per feedback_audit_helper_admin_client_pattern — kein Downgrade auf User-Client, das würde die Audit-INSERT-RLS brechen).
- Verification: neue Vitest-Cases (fremder Deal → Fehler, fremde contactId → gefiltert/abgelehnt, eigener Deal → unverändert grün); TSC=0; ESLint geänderte Files=0; Full-Vitest-jsdom GREEN (IMP-1108).
- Dependencies: none.

### MT-2: ISSUE-132 — Class-C Multi-Parent WITH-CHECK Härtung + MIG-054 (Medium)
- Goal: Jeder gesetzte (non-NULL) Parent-FK muss sichtbar sein — schließt die cross-tenant Row-Injection über den nicht-geprüften FK-Zweig. SELECT/UPDATE-USING/DELETE behalten die OR-Logik (Read ist nicht bypassbar).
- Files:
  - `sql/migrations/054_v816_slc914_class_c_withcheck_harden.sql` (MIG-054, additiv, idempotent DROP+CREATE)
  - `cockpit/__tests__/migrations/054-v816-class-c-withcheck.test.ts` (DB-Verify, läuft im /deploy gegen die Coolify-DB, node:20-Sidecar + SAVEPOINT)
- Expected behavior:
  - **Schritt 0 (BLOCKING, pattern-weit):** Live-Ableitung des vollständigen Multi-Parent-Satzes aus `pg_policies` (INSERT/UPDATE-`WITH CHECK` mit ≥2 Parent-FK-EXISTS-OR-Zweigen). Bekannte Kandidaten aus MIG-047a/b/c: `tasks, signals, calendar_events, email_threads, handoffs, referrals` (047a) + `documents, email_attachments, cadence_enrollments` (audit-benannt) + weitere ≥2-FK-Tabellen (z.B. `emails, email_tracking_events, ai_action_queue, ai_feedback, fit_assessments` — **live bestätigen**, nur genuin Multi-FK-Policies anfassen). Single-Parent-Tabellen (`deal_products, auto_winloss_runs, proposal_items, campaign_links, …`) haben **keinen** Gap → ausgeschlossen.
  - Neue `WITH CHECK` je Multi-Parent-Tabelle: `((<fk_a> IS NULL OR EXISTS(...can_see_owner)) AND (<fk_b> IS NULL OR EXISTS(...)) AND ...) AND (<mind. 1 FK non-NULL> OR (<alle FK NULL> AND created_by = auth.uid())) OR is_admin()`.
  - Tabellen **ohne** `created_by` (z.B. `email_threads`): all-NULL-Zweig entfällt → all-NULL-Row nur via `is_admin()` (Orphan-Semantik wie Bestand).
  - `USING`-Klauseln (SELECT/UPDATE/DELETE) bleiben unverändert OR-Logik.
- Verification (DB-Verify-Test, negativ+positiv):
  - Negativ: `INSERT signals {deal_id:<eigener>, contact_id:<fremd>}` → RLS-Reject (SAVEPOINT).
  - Positiv: `INSERT signals {deal_id:<eigener>, contact_id:<eigener>}` → ok; all-NULL + `created_by=self` → ok (bei Tabellen mit created_by).
  - Admin-Bypass unverändert.
  - MIG-054 idempotent re-applybar (2× Apply → gleicher Zustand).
- Dependencies: none (unabhängig von MT-1). Live-Apply + DB-Verify erfolgen im **/deploy** (Precedent MIG-051/052/053), NICHT im /backend.

### MT-3: ISSUE-133 + ISSUE-134 — Low-Hygiene-Bundle
- Goal: Same-Release-Konsistenz mit den V8.15-Härtungen herstellen (kein neuer Angriffsvektor, Defense-in-Depth).
- Files:
  - `cockpit/src/components/ki-workspace/AnswerPane.tsx` (Zeile 274: `const safeHref = /^(https?:|mailto:|\/)/.test(linkHref) ? linkHref : "#";` → `const safeHref = safeExternalHref(linkHref);` + Import aus `@/lib/utils/safe-external-href`)
  - `cockpit/src/lib/export/rate-limit.ts` (`checkRateLimit`: leftmost-`x-forwarded-for`-Split → `extractClientIp(request.headers)` aus `@/lib/security/ip-hash`)
  - Tests: bestehende `safe-external-href.test.ts` deckt `//evil.com`→`#` bereits ab; ggf. AnswerPane-Render-Test + rate-limit-Test-Ergänzung.
- Expected behavior: `//evil.com` in AnswerPane-Link → `#`; Rate-Limit-Bucket keyed auf die reale (rechte-Offset) IP statt den client-kontrollierten leftmost-Eintrag.
- Verification: TSC=0; ESLint geänderte Files=0; Full-Vitest-jsdom GREEN.
- Dependencies: none.

### MT-4: Records + Resolution
- Goal: Projekt-Records + Cross-Repo-Reuse-Doku aktualisieren.
- Files: `docs/KNOWN_ISSUES.md` (ISSUE-131/132/133/134 → resolved mit Notes), `slices/INDEX.md`, `features/INDEX.md`, `planning/backlog.json`, `planning/roadmap.json`, `docs/STATE.md`, `docs/MIGRATIONS.md` (MIG-054), `docs/DECISIONS.md` (DEC-305), `reports/RPT-66x`.
- Expected behavior: Records konsistent; MIG-054 dokumentiert; DEC-305 (WITH-CHECK-Conjunction-Härtung) accepted.
- Verification: Cockpit-Konsistenz-Check (Slice/Feature/BL-Counts stimmen).
- Dependencies: MT-1..MT-3 + SLC-910-Phase-B abgeschlossen.

## SLC-910 Phase-B (CSP strict) — im V8.16-Slot geschlossen

Eigene Slice-Completion (SLC-910 ist bereits scaffolded, Status `in_progress` seit V8.12). Phase-A Report-Only läuft seit V8.12-Deploy (~3,5 Wo Burn-In, Fenster abgelaufen).
- File: `cockpit/next.config.ts` (Zeile 18: Header-Key `Content-Security-Policy-Report-Only` → `Content-Security-Policy` = enforced; report-uri-Verhalten beibehalten/optional).
- **`buildCSP` bleibt unverändert** — `script-src` enthält bereits `'unsafe-inline'` (Next.js-15+-RSC-Hydration-Pflicht, immoscheckheft V3.3 ISSUE-026-Lehre). Der Switch entfernt KEINE Direktive, er schaltet nur Report-Only → enforce.
- Live-Verification-Plan (BLOCKING, security-headers-live-smoke.md): nach Deploy `node tests/_probe/csp-check.mjs https://business.strategaizetransition.com` → Done-Gate **0 Console-CSP-Errors + hasReactProps=true + hasReactFiber=true + onSubmitAttached=true**. Bei FAIL: Hotfix-Path (Coolify-ENV-Redeploy / Direktive nachziehen) dokumentieren.
- Bei PASS: SLC-910 → `done`, V8.12 → 100%.

## Risks

- **R-914-1 (Med):** `checkConsentStatus`-Signaturänderung bricht andere Caller. Mitigation: optionaler `client`-Param mit Default `createAdminClient()` (backward-compat); vor Änderung `grep -r checkConsentStatus` über alle Caller (Meeting-Briefing-Cron / pending-consent-renewal).
- **R-914-2 (Med):** `audit_log`-INSERT via User-Client schlägt fehl (append-only-RLS). Mitigation: audit_log-Writes bleiben Admin/service-role **nach** dem Ownership-Gate (feedback_audit_helper_admin_client_pattern) — nur die authz-tragenden Reads + Business-Writes wechseln auf User-Client.
- **R-914-3 (Med):** MIG-054-Conjunction rejected legitime same-tenant Multi-Parent-Inserts. Mitigation: DB-Verify mit Positiv- UND Negativ-Cases pro betroffener Tabelle; `email_threads`-Orphan-Semantik (kein created_by) explizit testen.
- **R-914-4 (Med):** Pattern-weiter Sweep fasst mehr Tabellen an als die 7 audit-benannten. Mitigation: Live-Ableitung aus `pg_policies` (Schritt 0), nur genuin Multi-FK-`WITH CHECK`-Policies anfassen; Single-Parent explizit ausgeschlossen. Dies ist bewusste Scope-Wahl (IMP-1394 pattern-wide-sweep), nicht Scope-Creep.
- **R-914-5 (High-Impact/Low-Prob):** SLC-910 Phase-B enforce bricht Production-Hydration. Mitigation: `'unsafe-inline'` bleibt drin; funktionaler Browser-Smoke `csp-check.mjs` ist Done-Gate, nicht `curl -I`.

## Acceptance Criteria

- AC-914-1: `startMeeting` liest Deal+Kontakte RLS-scoped; fremder Deal → Fehler, fremde contactId → nicht verarbeitet; eigener Flow unverändert (Vitest).
- AC-914-2: MIG-054 code-korrekt + idempotent; DB-Verify (im /deploy) negativ+positiv PASS über den vollständigen Multi-Parent-Satz; `list_tables_with_authenticated_full_access()` bleibt 0.
- AC-914-3: `//evil.com`→`#` in AnswerPane; Rate-Limit keyed auf `extractClientIp`.
- AC-914-4: SLC-910 Phase-B enforced live + `csp-check.mjs` Done-Gate PASS → V8.12 100%.
- AC-914-5: Records konsistent (ISSUE-131..134 resolved, MIG-054 + DEC-305 dokumentiert).

## Parallel-Execution

| Slice | Parallel Group | MIG Reserved | File Touchpoints | Notes |
|---|---|---|---|---|
| SLC-914 MT-1 | — (sequential, single founder) | — | app/actions/meetings.ts, lib/meetings/consent-check.ts | app-layer, keine Migration |
| SLC-914 MT-2 | — | **MIG-054** | sql/migrations/054_*.sql, __tests__/migrations/054-*.test.ts | DB-layer, live-apply im /deploy |
| SLC-914 MT-3 | — | — | AnswerPane.tsx, lib/export/rate-limit.ts | 2 One-Liner |
| SLC-910 (Phase-B) | — | — | cockpit/next.config.ts | deploy-touching, Browser-Smoke-Gate |

Single-Branch main, kein Worktree (Internal-Test-Mode, Single-Founder — Precedent SLC-912/913). Reihenfolge: MT-1 → MT-2 → MT-3 → SLC-910 Phase-B (im /deploy) → MT-4 Records. Pro MT: TSC=0 + ESLint geänderte Files=0 + Full-Vitest-jsdom GREEN (IMP-1108).

## Pre-Conditions / Gates

- Pre-Condition: V8.15 deployed (`c9efb41`) — erfüllt. **Last Stable = V8.14** (V8.15 nie formal T+24h-STABLE, IMP-950).
- Per module-lifecycle-discipline + IMP-950: kein Customer-Live; NICHT released bis `/go-live`, NICHT stable bis `/post-launch` T+24h.
- Nach V8.16: `/code-review ultra` (extern, nur Founder-triggerbar) als Konvergenz-Gegenprobe vor Multi-User-Schritt.
