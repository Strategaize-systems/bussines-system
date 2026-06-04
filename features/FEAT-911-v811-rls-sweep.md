# FEAT-911 — V8.11 BS RLS-Sweep der 25 Zweittabellen

**Status:** in_progress
**Version:** V8.11
**Backlog:** BL-500
**Created:** 2026-06-04
**Requirements:** RPT-580 (2026-06-04)

## Problem

Nach V7-RLS-Switch (MIG-035, SLC-704) wurden 8 Kerntabellen + `profiles` + `teams` auf Owner-/Team-aware RLS umgestellt. Die restlichen ~25 Zweittabellen stehen weiter auf der V1-Policy `authenticated_full_access` (`FOR ALL TO authenticated USING (true)`). Jeder authenticated User kann Read+Update+Delete auf allen Rows dieser Tabellen — egal welchem owner_user_id oder team_id sie gehoeren.

**Im Internal-Test-Mode** (Admin = User Immo, keine Customer) keine Auswirkung. **Sobald ein 2. User dazu kommt** (Customer-Onboarding) sind das sofortige Cross-Tenant-Reads + Modifikationen.

**Konkrete Angriffsbeispiele aus SEC-006 (SECURITY_AUDIT_2026-05-30.md):**
- `UPDATE user_settings SET push_subscription = '<eigener Endpoint>' WHERE user_id = '<admin-uid>'` → Member uebernimmt Admin-Push-Notifications.
- `SELECT * FROM audit_log` → vollstaendiger Audit-Trail aller User sichtbar.
- `SELECT * FROM emails` → alle Outbound-Mails inkl. Body lesbar.
- `SELECT * FROM knowledge_chunks` → alle RAG-Embeddings inkl. extrahiertem Text aus Meetings/E-Mails/Dokumenten cross-tenant lesbar.

## Goal

BS ist nach V8.11 multi-tenant-tauglich. Customer-Onboarding kann starten ohne Cross-Tenant-Read-Risiko auf den 25 Zweittabellen.

## Primary User

Admin (User Immo) und kuenftiger Customer-User (Founder, Sales-Member, Teamlead, Admin). Indirekt auch alle Background-Cron-Jobs, die ueber service_role weiter RLS-bypass haben.

## V1 Scope

**Pflicht-Migration aller 25 Zweittabellen** auf Owner-/Team-aware RLS analog zum V7-MIG-035-Pattern. Pro Tabelle:
- Drop der alten `authenticated_full_access`-Policy
- Neue 4 CRUD-Policies (`<table>_select`, `_insert`, `_update`, `_delete`) basierend auf einem von 4 Klassen-Templates
- RLS-Test-Matrix-Erweiterung (mind. 2 Tests pro Tabelle: same-owner sees / foreign-owner blocked)
- Vitest gegen Coolify-DB-Sidecar (node:22 im business-net) GREEN
- Pflicht-MT pro Sub-Slice: Cron-Code-Audit der betroffenen Tabellen

**Policy-Klassen (analog BL-500-Vorschlag, in Sub-Slices gegliedert):**

### SLC-901 — Per-User-Stammdaten
- Tabellen: `user_settings`, `kpi_snapshots`, ggf. `goals`
- Policy: `user_id = auth.uid()` (simple Owner-Filter)
- Admin: `is_admin()` Bypass fuer SELECT (Read-only Cross-User Admin-Sicht)
- Mutate: nur Eigentuemer

### SLC-902 — Team-bezogene Konfiguration
- Tabellen: `branding_settings`, `email_templates`, `payment_terms_templates`, `automation_rules`, `compliance_templates`, `cadences`, `cadence_steps`
- Pattern: Admin-mutate (`is_admin()`), alle-Team-User-read (`team_id = get_my_team_id()`)
- Begruendung: Konfigurations-Daten sind Team-shared, aber nur Admin darf aendern

### SLC-903 — Abgeleitete Records (JOIN auf Parent)
- Tabellen: `tasks`, `signals`, `calendar_events`, `email_attachments`, `proposal_items`, `proposal_payment_milestones`, `cadence_executions`, `ai_action_queue`, `ai_feedback`, `auto_winloss_runs`, `email_threads`, `email_sync_state`, `knowledge_chunks`, `vat_id_validations`, `activity_kpi_targets`
- Pattern: JOIN auf Parent-Owner-Tabelle (`meetings`/`deals`/`activities`/`email_messages`/`proposals`) mit `can_see_owner(parent.owner_user_id)`
- **knowledge_chunks Spezial-Pfad (Q-V8.11-C entschieden):** Schema-Erweiterung um `owner_user_id` + `team_id` Spalten + Backfill aus Parent-Source-Row. Direkter Owner-Filter statt JOIN. Embedding-Sync-Cron-Anpassung Pflicht-MT.

### SLC-904 — Audit/Logging
- Tabellen: `audit_log`, `emails` (Outbound)
- audit_log-SELECT-Policy (Q-V8.11-A entschieden): Admin-all + Actor-own-Rows (`is_admin() OR actor_id = auth.uid()`). Member sehen eigene Audit-Eintraege fuer DSGVO-Art-15-Self-Service.
- audit_log-INSERT/UPDATE/DELETE: Service-Role-only (kein User-Mutate ueber API).
- emails-Outbound: JOIN auf parent (deal/contact) mit can_see_owner — fallback in SLC-903 falls schema das traegt.

## Out of Scope

- **MFA-Pflicht** (eigener Sprint, vermutlich V8.12+)
- **Storage-Bucket-RLS** (SEC-008 bereits in V8.10 SLC-893 resolved fuer documents, andere Buckets sind low-risk)
- **search_knowledge_chunks-Function-Hardening (SEC-007)** — separat in V8.12 oder eigenem Hotfix
- **Performance-Hard-Test mit Production-Datenvolumen** — V8.11 enthaelt Smoke-Performance-Check (EXPLAIN ANALYZE pro Tabelle), echter Last-Test in V8.13+ oder Customer-Live-Pilot
- **Cron-Code-Refactoring weg von service_role** — Pflicht-MT pro Sub-Slice ist Audit/Verify, nicht Refactor (Q-V8.11-D entschieden)
- **OP V8.0.x + IS V1.5.x RLS-Sweep-Mirror** — V8.11 ist BS-only, Cross-Repo-Symmetrie ist separater Sprint
- **V8.7-B (BS→IS Verdichtungs-Cron, SLC-355)** — bleibt deferred bis nach V8.11 Customer-Live-Gate

## Core features

1. **MIG-045** SLC-901 per-User-Stammdaten RLS-Migration (~3 Tabellen) + Test-Matrix
2. **MIG-046** SLC-902 team-bezogene Konfiguration RLS-Migration (~7 Tabellen) + Test-Matrix
3. **MIG-047** SLC-903 abgeleitete Records RLS-Migration (~15 Tabellen, inkl. knowledge_chunks Schema-Erweiterung) + Test-Matrix
4. **MIG-048** SLC-904 Audit/Logging RLS-Migration (2 Tabellen mit Actor-own-Rows Pattern) + Test-Matrix
5. **Cron-Code-Audit pro Sub-Slice** — grep nach `createAdminClient()` in Cron/Worker-Code, verifizieren dass owner_user_id beim INSERT korrekt aus Parent gesetzt wird
6. **DEC-V8.11-1** Service-Role-Bypass-Architektur formal dokumentieren (in DECISIONS.md)
7. **Sec-Audit-Verifikation als Done-Gate (Q-V8.11-B entschieden):** Pattern-suchende Helper-Function listet alle Tables mit `authenticated_full_access`. Output muss leer sein.

## Constraints

- **PostgreSQL 15** (Coolify-Supabase aktuelle Version)
- **V7-Helper-Functions** (`is_admin()`, `get_my_team_id()`, `can_see_owner(target_owner UUID)`) sind die Single-Source-of-Truth — keine neuen Helper, nur Wiederverwendung
- **Migration-Pattern** muss `sql-migration-hetzner.md` folgen (SSH+base64+psql als postgres-Superuser, idempotent, mit Rollback-Notes)
- **Test-Pattern** muss `coolify-test-setup.md` folgen (node:22 im business-net, SAVEPOINT um expected RLS-Rejections, TEST_DATABASE_URL via ENV)
- **Pre-Live-Pflicht:** V8.11 muss durch sein bevor erster Customer (2. User) live geht
- **Cron-Service-Role-Bypass** bleibt erhalten — Background-Jobs schreiben weiter ohne RLS-Filter. Sub-Slice-Cron-Audit verifiziert dass owner_user_id beim INSERT korrekt gesetzt wird.

## Risks / assumptions

**R-V8.11-1 (High):** Performance-Drop bei JOIN-basierten Policies (SLC-903) bei steigendem Datenvolumen. Mitigation: EXPLAIN ANALYZE pro Tabelle als Smoke-Performance-Check, Index-Strategie pro Parent-FK (z.B. `tasks.deal_id`).

**R-V8.11-2 (High):** Migration-Drift waehrend Burn-In. Wenn V8.11 ueber 1-2 Wochen laeuft und parallel V8.12 oder Bugfixes neue Tabellen einfuehren, koennen die wieder auf `authenticated_full_access` landen. Mitigation: Sec-Audit-Verifikation-Helper-Function nach jedem Sub-Slice + Pre-Customer-Live-Gate.

**R-V8.11-3 (Medium):** Cron-Code-Bugs werden durch Service-Role-Bypass maskiert. Wenn z.B. embedding-sync-cron `owner_user_id = NULL` schreibt, sieht der User in der UI nichts, obwohl der Embedding-Eintrag in der DB liegt. Mitigation: Pflicht-MT Cron-Code-Audit pro Sub-Slice (Q-V8.11-D).

**R-V8.11-4 (Medium):** knowledge_chunks Schema-Migration ist destructive (Backfill aller bestehenden chunks). Wenn Backfill fehlschlaegt, sind RAG-Embeddings cross-tenant geleakt oder unzugaenglich. Mitigation: Idempotenter Backfill mit Pre-Apply-Audit, Test-Daten in Smoke-DB.

**R-V8.11-5 (Low):** Vergessene Tabellen — Realitaets-Check ergibt, dass die SEC-006-Liste (~25 Tabellen) nicht mehr aktuell ist. Pre-/architecture muss SQL-Helper-Function aufrufen die LIVE alle authenticated_full_access-Tabellen listet.

**A-V8.11-1:** V7-MIG-035 Helper-Functions (`is_admin`, `get_my_team_id`, `can_see_owner`) sind weiterhin korrekt + nicht modifiziert. Annahme verifiziert durch V7-Burn-In + V8.x-Burn-Ins.

**A-V8.11-2:** Alle 25 Tabellen haben entweder `owner_user_id`/`user_id` Spalte ODER Parent-FK auf eine V7-RLS-getragene Tabelle. Pre-/architecture-Realitaets-Check mit SQL muss das verifizieren.

## Success criteria

**Done-Kriterium (Q-V8.11-B entschieden — 100% Coverage):**

1. **25/25 Tabellen** migriert auf Owner-/Team-aware RLS (per den 4 Klassen-Patterns).
2. **RLS-Test-Matrix erweitert** um mindestens 2 Vitest pro Tabelle (same-owner sees / foreign-owner blocked), insgesamt mind. 50 neue Tests. Alle GREEN gegen Coolify-DB-Sidecar.
3. **Sec-Audit-Helper-Function** `list_tables_with_authenticated_full_access()` liefert leeren Result-Set.
4. **EXPLAIN ANALYZE** auf 5 typischen Queries (z.B. `SELECT * FROM tasks WHERE deal_id = $1`) zeigt akzeptable Cost (<10x Pre-V8.11 Baseline) — Hard-Threshold in /architecture festlegen.
5. **Cron-Code-Audit** pro Sub-Slice abgeschlossen, alle createAdminClient()-Pfade in Worker/Cron schreiben owner_user_id korrekt aus Parent.
6. **DEC-V8.11-1** Service-Role-Bypass-Architektur in DECISIONS.md dokumentiert.
7. **Live-Smoke** auf Coolify-DB: SELECT als USER_A auf USER_B-Rows → 0 Rows zurueck fuer alle 25 Tabellen.
8. **V8.11 RELEASED + STABLE-Bestaetigung** durch /post-launch T+24h Full-Check.
9. **Pre-Customer-Live-Gate erfuellt** — V8.11 ist die letzte Pre-Live-Pflicht-Hardening fuer BS.

## Open questions

Alle 4 Founder-OQs sind in /requirements-Session 2026-06-04 entschieden (Q-V8.11-A bis Q-V8.11-D, siehe oben).

**Offene /architecture-OQs (Founder-Input nicht zwingend):**

- **OQ-V8.11-arch-1:** Sub-Slice-Reihenfolge — SLC-901 (per-User-Stammdaten, einfachste Pattern) zuerst als Pattern-Etablierung, oder SLC-903 (groesster Brocken, ~15 Tabellen) zuerst um den dominanten Aufwand fruh zu bewaeltigen?
- **OQ-V8.11-arch-2:** EXPLAIN ANALYZE Hard-Threshold — was ist "akzeptable Cost"? 10x V7-Baseline? Absolut <100ms pro Query?
- **OQ-V8.11-arch-3:** knowledge_chunks Backfill — Sync (Migration-Time) oder Async (Background-Cron mit Status='pending' Spalte)?
- **OQ-V8.11-arch-4:** RLS-Test-Pattern — wiederverwenden Coolify-Test-Setup von V7 (cockpit/__tests__/rls/v7-*) oder eigene v8-11-rls-Test-Suite?

**Cross-Repo-Symmetrie (post-V8.11):**
- OP V8.0.x und IS V1.5.x haben aehnliche RLS-Sweep-Restbestaende? → eigene /requirements pro Repo nach V8.11 Customer-Live-Gate.

## Delivery mode

**SaaS-Mode** — V8.11 ist eine Pre-Live-Pflicht-Hardening fuer ein Multi-Tenant-SaaS-Produkt. Cumulative-Single-Branch-Worktree (`v8-11-rls-sweep`) analog V7-RLS-Switch. Pro Sub-Slice eigener Commit-Burst auf den Worktree-Branch, Master-Merge erst nach kompletter V8.11 + /qa Gesamt + /final-check + /go-live.

## Sub-Slice-Vorschau (Detail in /slice-planning)

| Sub-Slice | Klasse | Tabellen | Aufwand | Migration |
|-----------|--------|----------|---------|-----------|
| SLC-901 | per-User-Stammdaten | ~3 (user_settings, kpi_snapshots, ggf goals) | ~3-4h | MIG-045 |
| SLC-902 | team-bezogene Konfiguration | ~7 | ~4-5h | MIG-046 |
| SLC-903 | abgeleitete Records (inkl. knowledge_chunks Schema-Erw.) | ~15 | ~8-10h | MIG-047 |
| SLC-904 | Audit/Logging | 2 | ~2-3h | MIG-048 |

Gesamt-Aufwand: **~17-22h Code-Side** ueber ~1-2 Wochen verteilt, Single-Dev. Plus /qa pro Sub-Slice + /qa Gesamt + /final-check + /go-live + /post-launch.

## Related

- BL-500 (Backlog-Eintrag)
- SEC-006 in `docs/SECURITY_AUDIT_2026-05-30.md`
- V7 MIG-035 (`sql/migrations/035_v7_rls_switch.sql`) — Pattern-Quelle
- Rule `sql-migration-hetzner.md` — Migration-Pattern
- Rule `coolify-test-setup.md` — Test-Pattern
- `feedback_module_access_test_setup_explicit_user_module_access` (Memory) — RLS-Test-Lehre aus immoscheckheft V3.2 SLC-323 MT-8
- V8.13 SLC-894 + SLC-895 — Pre-Condition (ISSUE-088 + ISSUE-089 resolved)
- V8.7-B (FEAT-872) — bleibt deferred bis nach V8.11 + Anwalts-Sign-off
