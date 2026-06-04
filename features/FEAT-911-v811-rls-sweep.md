# FEAT-911 — V8.11 BS RLS-Sweep der 25 Zweittabellen

**Status:** in_progress
**Version:** V8.11
**Backlog:** BL-500
**Created:** 2026-06-04
**Requirements:** RPT-580 (2026-06-04)

## Problem

Nach V7-RLS-Switch (MIG-035, SLC-704) wurden 8 Kerntabellen + `profiles` + `teams` auf Owner-/Team-aware RLS umgestellt. Die restlichen Zweittabellen stehen weiter auf der V1-Policy `authenticated_full_access` (`FOR ALL TO authenticated USING (true)`). Jeder authenticated User kann Read+Update+Delete auf allen Rows dieser Tabellen — egal welchem owner_user_id oder team_id sie gehoeren.

**Live-DB Realitaets-Check 2026-06-04 (in /architecture-Session):** SEC-006 listete ~25 Tabellen — die Live-Coolify-DB zeigt **41 Tabellen** mit `*_full_access`-Pattern. Die 16 zusaetzlichen Tabellen (automation_runs, cadence_enrollments, campaign_link_clicks, campaign_links, campaigns, deal_products, documents-PUBLIC-Tabelle (nicht Storage-Bucket), email_tracking_events, fit_assessments, handoffs, pipeline_stages, pipelines, products, referrals) waren in SEC-006 Sub-Slice-Vorschau nicht enthalten. R-V8.11-5 → High eskaliert.

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

**Pflicht-Migration aller 41 Zweittabellen** (Live-DB-Realitaet 2026-06-04, korrigiert von 25) auf Owner-/Team-aware RLS analog zum V7-MIG-035-Pattern. Pro Tabelle:
- Drop der alten `authenticated_full_access`-Policy
- Neue 4 CRUD-Policies (`<table>_select`, `_insert`, `_update`, `_delete`) basierend auf einem von 4 Klassen-Templates
- RLS-Test-Matrix-Erweiterung (mind. 2 Tests pro Tabelle: same-owner sees / foreign-owner blocked)
- Vitest gegen Coolify-DB-Sidecar (node:22 im business-net) GREEN
- Pflicht-MT pro Sub-Slice: Cron-Code-Audit der betroffenen Tabellen

**Policy-Klassen (post-/architecture re-baseline auf Live-DB-Realitaet, 5 Sub-Slices SLC-901..905):**

Klassen-Templates ausfuehrlich dokumentiert in `docs/ARCHITECTURE.md` V8.11-Section + DECs DEC-265..274.

### SLC-901 — Klasse A: Per-User-Stammdaten (4 Tabellen)
- Tabellen: `user_settings`, `kpi_snapshots`, `goals`, `activity_kpi_targets`
- Spalte: alle haben `user_id`
- Policy (DEC-270): `user_id = auth.uid() OR is_admin()` fuer SELECT + Mutate
- Aufwand: ~3-4h, MIG-045

### SLC-902 — Klasse B: Team-Templates (11 Tabellen)
- Tabellen: `branding_settings`, `email_templates`, `payment_terms_templates`, `compliance_templates`, `vat_id_validations`, `pipelines`, `pipeline_stages`, `products`, `automation_rules`, `cadences`, `cadence_steps`
- Spalte: kein Owner (Templates ohne user-Bezug)
- Policy (DEC-271): SELECT all authenticated, INSERT/UPDATE/DELETE Admin-only
- Multi-Tenant-V9-forward-compatible (team_id-Filter spaeter ergaenzbar)
- Aufwand: ~5-6h, MIG-046 inkl. Sec-Audit-Helper-Function (DEC-274)

### SLC-903 — Klasse C: Parent-FK-JOIN (24 Tabellen)
- Tabellen: `tasks`, `signals`, `calendar_events`, `email_attachments`, `proposal_items`, `proposal_payment_milestones`, `cadence_executions`, `cadence_enrollments`, `automation_runs`, `deal_products`, `handoffs`, `referrals`, `fit_assessments`, `ai_action_queue`, `ai_feedback`, `auto_winloss_runs`, `email_threads`, `email_sync_state`, `campaigns`, `campaign_links`, `campaign_link_clicks`, `documents` (Tabelle, nicht Bucket!), `email_tracking_events`, `emails` (V7-direct wegen eigener owner_user_id-Spalte)
- Pattern (DEC-272): `EXISTS (SELECT 1 FROM <parent> WHERE <parent>.id = <child>.<fk> AND can_see_owner(<parent>.owner_user_id))`
- Multi-Parent: OR-Verkettung (z.B. signals mit deal_id + contact_id + company_id + activity_id)
- OQ-V8.11-arch-5 (in /slice-planning): kein-Parent-FK-Tabellen (email_tracking_events, campaign_link_clicks, automation_runs, cadence_enrollments, fit_assessments) → pro Tabelle entscheiden ob mittelbarer FK / Schema-ALTER / Admin-only-SELECT
- Aufwand: ~10-13h, MIG-047 in 3 atomaren Migration-Schritten (8+8+8 Tabellen)

### SLC-904 — Klasse E: Audit-Spezial (1 Tabelle: audit_log)
- audit_log-SELECT-Policy (Q-V8.11-A entschieden, DEC-272-Verfeinerung): Admin-all + Actor-own-Rows (`is_admin() OR actor_id = auth.uid()`). DSGVO-Art-15-Self-Service
- audit_log-INSERT/UPDATE/DELETE: Service-Role-only (kein User-Mutate ueber API)
- Code-Audit `cockpit/src/lib/audit.ts` — alle Caller pruefen ob createAdminClient genutzt wird
- Aufwand: ~2-3h, MIG-048

### SLC-905 — Klasse D: Schema-Erweiterung + Backfill (1 Tabelle: knowledge_chunks)
- knowledge_chunks Schema-ALTER (DEC-273): ADD COLUMN owner_user_id UUID + team_id UUID + 2 Indexe
- SYNC-Backfill (DEC-267) innerhalb Migration: UPDATE...FROM Parent-Source pro source_type (meeting/email_message/activity/document)
- Policy: `can_see_owner(owner_user_id)` (direkter Owner-Filter statt JOIN, Performance-besser)
- search_knowledge_chunks SECURITY-DEFINER-Function-Erweiterung: WHERE-Filter Owner ergaenzen (schliesst SEC-007-Lese-Pfad-Teil)
- Embedding-Sync-Cron-Anpassung Pflicht-MT
- Aufwand: ~4-5h, MIG-049 (destructive ALTER + Backfill)

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

**R-V8.11-5 (HIGH — re-eskaliert 2026-06-04 in /architecture):** Vergessene Tabellen — Live-DB-Check zeigt 41 Tabellen, SEC-006 listete 25. Differenz +16 Tabellen (automation_runs, cadence_enrollments, campaign_link_clicks, campaign_links, campaigns, deal_products, documents-Tabelle, email_tracking_events, fit_assessments, handoffs, pipeline_stages, pipelines, products, referrals — alle in Live-DB mit `*_full_access`-Policy). Mitigation: persistente Sec-Audit-Helper-Function (DEC-274) deployed in SLC-902 als Done-Gate, Burn-In-Check 1-Sekunden-Query. Aufwand-Schaetzung +30-40% (von ~17-22h auf ~24-31h).

**A-V8.11-1:** V7-MIG-035 Helper-Functions (`is_admin`, `get_my_team_id`, `can_see_owner`) sind weiterhin korrekt + nicht modifiziert. Annahme verifiziert durch V7-Burn-In + V8.x-Burn-Ins.

**A-V8.11-2:** Alle 25 Tabellen haben entweder `owner_user_id`/`user_id` Spalte ODER Parent-FK auf eine V7-RLS-getragene Tabelle. Pre-/architecture-Realitaets-Check mit SQL muss das verifizieren.

## Success criteria

**Done-Kriterium (Q-V8.11-B entschieden — 100% Coverage, re-baselined auf Live-DB-Realitaet):**

1. **41/41 Tabellen** migriert auf Owner-/Team-aware RLS (per den 5 Klassen-Patterns, korrigiert von 25 nach Live-DB-Check 2026-06-04).
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

**Alle /architecture-OQs in /architecture-Session 2026-06-04 entschieden (DEC-265..268):**

- **OQ-V8.11-arch-1 → DEC-265:** Sub-Slice-Reihenfolge SLC-901 → 902 → 903 → 904 → 905 (steigende Komplexitaet, Pattern-Etablierung zuerst, destructive ALTER zuletzt)
- **OQ-V8.11-arch-2 → DEC-266:** EXPLAIN ANALYZE Hard-Threshold = max(100ms, 10x Pre-V8.11-Baseline)
- **OQ-V8.11-arch-3 → DEC-267:** knowledge_chunks Backfill SYNC innerhalb MIG-049 (Volumen <10k chunks)
- **OQ-V8.11-arch-4 → DEC-268:** V7-Test-Pattern wiederverwenden + neue Test-Files pro Sub-Slice

**OQ-V8.11-arch-5 + arch-6 entschieden in /slice-planning 2026-06-04 (Live-DB-Inspektion):**

- **OQ-V8.11-arch-5 → entschieden pro Tabelle (umgesetzt in SLC-903 MIG-047c Block 3):**
  - `email_tracking_events` → **(a) mittelbarer FK via emails.owner_user_id** (emails hat owner_user_id; EXISTS-Subquery)
  - `campaign_link_clicks` → **(c) Admin-only SELECT + service_role-only mutate** (pure Tracking-Log ohne User-Bezug, ip_hash/referer nicht user-relevant)
  - `automation_runs` → **(c) Admin-only SELECT + service_role-only mutate** (rule_id→automation_rules ist Klasse-B Template ohne Owner; trigger_entity polymorph fragil; Workflow-Audit)
  - `cadence_enrollments` → **(a) Multi-Parent EXISTS via deal_id OR contact_id + created_by-Fallback** (beide FKs vorhanden)
  - `fit_assessments` → **(a) Special-Case `assessed_by = auth.uid() OR is_admin()`** (polymorph entity_type/_id fragil; assessed_by stabil + per-User-private Bewertung)
- **OQ-V8.11-arch-6 → entschieden (umgesetzt in SLC-903 MIG-047c):** Storage-Bucket-Policies sind in Live-DB `documents_user_select/insert/update/delete` (Live-Inspektion 2026-06-04). PUBLIC-`documents`-Tabelle nutzt **`documents_table_*`-Praefix** (`documents_table_select/insert/update/delete`). Konflikt-frei.

**Cross-Repo-Symmetrie (post-V8.11):**
- OP V8.0.x und IS V1.5.x haben aehnliche RLS-Sweep-Restbestaende? → eigene /requirements pro Repo nach V8.11 Customer-Live-Gate.

## Delivery mode

**SaaS-Mode** — V8.11 ist eine Pre-Live-Pflicht-Hardening fuer ein Multi-Tenant-SaaS-Produkt. Cumulative-Single-Branch-Worktree (`v8-11-rls-sweep`) analog V7-RLS-Switch. Pro Sub-Slice eigener Commit-Burst auf den Worktree-Branch, Master-Merge erst nach kompletter V8.11 + /qa Gesamt + /final-check + /go-live.

## Sub-Slices (post-/slice-planning 2026-06-04, mit Backlog-Sub-Items)

| Sub-Slice | Klasse | Tabellen | Aufwand | Migration | Backlog | Spec |
|-----------|--------|----------|---------|-----------|---------|------|
| SLC-901 | A — per-User-Stammdaten (user_id-Spalte) | 4 | ~3-4h | MIG-045 | BL-508 | slices/SLC-901-rls-sweep-klasse-a-user-id.md |
| SLC-902 | B — Team-Templates (kein owner) | 11 | ~5-6h | MIG-046 (+ Sec-Audit-Helper-Function DEC-274) | BL-509 | slices/SLC-902-rls-sweep-klasse-b-team-templates.md |
| SLC-903 | C — Parent-FK-JOIN (3 atomare Blocks 047a/b/c) | 24 | ~10-13h | MIG-047a/b/c | BL-510 | slices/SLC-903-rls-sweep-klasse-c-parent-fk-join.md |
| SLC-904 | E — Audit-Spezial (Actor-own-Rows) | 1 (audit_log) | ~2-3h | MIG-048 | BL-511 | slices/SLC-904-rls-sweep-klasse-e-audit-log.md |
| SLC-905 | D — Schema-Erweiterung + Backfill + Function-Erweiterung | 1 (knowledge_chunks) | ~4-5h | MIG-049 + search_knowledge_chunks-Function-Erweiterung | BL-512 | slices/SLC-905-rls-sweep-klasse-d-knowledge-chunks.md |

Gesamt: 4+11+24+1+1 = **41 Tabellen**. Gesamt-Aufwand: **~24-31h Code-Side** ueber ~1.5-2 Wochen verteilt, Single-Dev. Plus /qa pro Sub-Slice + /qa Gesamt V8.11 + /final-check + /go-live + /post-launch.

**Test-Volumen:** ~605+ Vitest-RLS-Tests gegen Coolify-DB ueber alle 5 Slices (48 + 132 + 288 + 18 + 20 = 506 RLS-Matrix + Schema/Function-Tests + Embedding-Cron-Unit-Test).

**Done-Gate (Q-V8.11-B 100% Coverage):** `SELECT COUNT(*) FROM list_tables_with_authenticated_full_access()` muss strikt monoton fallen: 41 → 37 (SLC-901) → 26 (SLC-902) → 2 (SLC-903) → 1 (SLC-904) → **0 (SLC-905)**.

## Related

- BL-500 (Backlog-Eintrag)
- SEC-006 in `docs/SECURITY_AUDIT_2026-05-30.md`
- V7 MIG-035 (`sql/migrations/035_v7_rls_switch.sql`) — Pattern-Quelle
- Rule `sql-migration-hetzner.md` — Migration-Pattern
- Rule `coolify-test-setup.md` — Test-Pattern
- `feedback_module_access_test_setup_explicit_user_module_access` (Memory) — RLS-Test-Lehre aus immoscheckheft V3.2 SLC-323 MT-8
- V8.13 SLC-894 + SLC-895 — Pre-Condition (ISSUE-088 + ISSUE-089 resolved)
- V8.7-B (FEAT-872) — bleibt deferred bis nach V8.11 + Anwalts-Sign-off
