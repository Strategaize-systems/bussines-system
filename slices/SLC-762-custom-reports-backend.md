# SLC-762 — Custom-Reports Backend (FEAT-762 Backend)

## Metadata
- **Slice ID:** SLC-762
- **Version:** V7.6
- **Feature:** FEAT-762 Custom-Reports im KI-Workspace
- **Status:** planned
- **Priority:** High (Backend-Foundation fuer SLC-763 Frontend)
- **Created:** 2026-05-19
- **Estimated Effort:** ~3-5h Code + ~30 Min /qa + Live-DB-RLS-Verify = ~4-6h Gesamt-Session
- **Delivery Mode:** internal-tool
- **Worktree-Isolation:** optional (5 neue Server-Actions + 1 Runner + Migration, kein cross-Code-Touch ausser audit_log-Pattern-Reuse)
- **Pattern-Reuse:**
  - MIG-Procedure aus `sql-migration-hetzner.md` (SSH+base64 via postgres-User).
  - RLS-Grants-Pattern aus `feedback_migration_rls_needs_grants` (Lehre OP V7 SLC-134).
  - PostgREST-Reload aus `reference_postgrest_schema_reload`.
  - `audit_log`-Insert-Pattern aus V7.5 SLC-752 (`automation_rule.sculpt_attempt`).
  - `invokeBedrock()`-Region-Pin aus V7.5 DEC-211.
  - Test-Setup-Pattern aus `coolify-test-setup.md` (Vitest gegen Coolify-DB via node:20 + SAVEPOINT fuer expected RLS-Rejections).
- **Reihenfolge-Pflicht:** SLC-761 DONE als Voraussetzung. **MUSS vor SLC-763** abgeschlossen sein (Frontend setzt auf Server-Actions auf).

## Why

FEAT-762 Custom-Reports erlauben User-eigene KI-Antwort-Vorlagen im KI-Workspace. Das vermeidet "Button-Inflation" der Standard-Workspace-Buttons (V6.6-Direktive `feedback_ki_workspace_pattern`) und nutzt das in SLC-761 refactorierte Workspace als Foundation.

Architektur-Entscheidungen aus V7.6 /architecture (RPT-467):
- **MIG-037** PLANNED: `custom_reports`-Tabelle mit Owner-Scope-RLS, UNIQUE(owner_user_id, name), idempotent.
- **DEC-215** Bedrock-Context-Loader = Context-Type-Default (mein-tag = activities+tasks+deals, cockpit = pipeline-aggregate). KEIN NL-Sculpt-Daten-Selektion in V7.6.
- **DEC-216** Save-Trigger nach Bedrock-Result + Free-Form-Only (Frontend-Verantwortung in SLC-763).
- 4 neue `audit_log`-Action-Werte (`custom_report.created/executed/renamed/deleted`).

Dieser Slice ist Backend-Only (kein UI-Touch). Frontend folgt in SLC-763.

## Scope

**In Scope:**

- **MIG-037** ([sql/migrations/037_v76_custom_reports.sql](sql/migrations/037_v76_custom_reports.sql) NEU + applied auf Hetzner):
  - `custom_reports`-Tabelle (10 Spalten, siehe MIGRATIONS.md MIG-037).
  - 2 Indizes (Owner+Context-Type BTREE / Owner+Name UNIQUE).
  - RLS aktivieren + 4 Policies (SELECT/INSERT/UPDATE/DELETE alle `owner_user_id = auth.uid()`).
  - GRANTs auf `authenticated` + `service_role`.
  - `NOTIFY pgrst, 'reload schema';` als letzte Anweisung.
- **5 Server-Actions** unter `cockpit/src/lib/custom-reports/actions/`:
  - `save.ts` — `saveCustomReport({ name, prompt_template, context_type, description? })`
  - `list.ts` — `listCustomReports({ context_type })`
  - `run.ts` — `runCustomReport({ id, scope })`
  - `rename.ts` — `renameCustomReport({ id, name })`
  - `delete.ts` — `deleteCustomReport({ id })`
- **Custom-Report-Runner** ([cockpit/src/lib/ki-workspace/custom-report-runner.ts](cockpit/src/lib/ki-workspace/custom-report-runner.ts) NEU):
  - `runCustomReportCore({ promptTemplate, contextType, scope })` mit Context-Type-Switch zu Data-Loadern.
  - Loader-Datei `cockpit/src/lib/ki-workspace/loaders/mein-tag-context.ts` (NEU oder Refactor aus tagesanalyse.ts).
  - Loader-Datei `cockpit/src/lib/ki-workspace/loaders/cockpit-context.ts` (NEU oder Refactor aus pipeline-snapshot.ts).
  - System-Prompt-Datei `cockpit/src/lib/ki-workspace/custom-report-prompt.ts` (NEU, kurz + generisch).
- **Audit-Log-Inserts** in allen 5 Server-Actions (`custom_report.created/executed/renamed/deleted` mit Metadata `name`, `context_type`, `cost_usd` etc.).
- **Vitest-Coverage:**
  - Unit-Tests fuer zod-Validate + Cost-Calc + UNIQUE-409-Mapping.
  - Live-DB-Tests via Coolify-Test-Setup-Pattern (`__tests__/custom-reports-rls.test.ts`): 4 RLS-Policies (Owner-Isolation), UNIQUE-Constraint, Cascade-Delete via auth.users-FK.
- **Doc-Hygiene:**
  - `cockpit/docs/AUDIT_SERVER_ACTIONS_V7.md` neue V7.6-Section mit 5 Server-Actions.
  - `cockpit/docs/MIGRATIONS.md` MIG-037-Status von PLANNED auf APPLIED + Verifikations-Log.

**Out of Scope:**

- Frontend (Save-Button, Modal, Dropdown, Rename/Delete-UI) — SLC-763.
- Custom-Reports auf `/deal-detail` oder `/team-cockpit` — Defer V7.7+.
- Team-Sharing — Defer V8.
- Versionierung von prompt_template (Edit-History) — Defer V7.7+ wenn benoetigt.
- NL-Sculpt-Daten-Selektion (DEC-215 Option B) — Defer V7.7+.

## Acceptance Criteria

- **AC1** MIG-037 idempotent applied auf Coolify-DB (`91.98.20.191`). `\d custom_reports` zeigt 10 Spalten + RLS=ENABLED + 4 Policies + 2 Indizes.
- **AC2** `SELECT polname, polcmd FROM pg_policy WHERE polrelid = 'custom_reports'::regclass;` liefert 4 Eintraege (`r`/`a`/`w`/`d` fuer SELECT/INSERT/UPDATE/DELETE).
- **AC3** `SELECT has_table_privilege('authenticated', 'custom_reports', 'INSERT');` returns `t`. Dito fuer `service_role` (alle 4 Privileges).
- **AC4** PostgREST-Smoke nach Apply: `curl -s -H "apikey: $ANON" https://<host>/rest/v1/custom_reports?limit=1` liefert HTTP 200 mit `[]` (RLS filtert leer, kein 404 = Schema-Cache aktiv).
- **AC5** `saveCustomReport({ name, prompt_template, context_type })`: zod-Validate fuer Length (name 2-80, prompt_template 10-2000, context_type whitelist `mein-tag|cockpit`). INSERT mit `owner_user_id = auth.uid()`. Bei UNIQUE-Violation `23505` → Return `{ ok: false, code: "duplicate_name", message: "Name bereits vergeben" }` (HTTP 409-Symmetrie). audit_log-Eintrag `custom_report.created`.
- **AC6** `listCustomReports({ context_type })`: SELECT mit RLS-Owner-Filter implicit, ORDER BY `last_used_at DESC NULLS LAST, created_at DESC`. Returns Array.
- **AC7** `runCustomReport({ id, scope })`: 4 Schritte: (1) SELECT custom_reports WHERE id=$1 (RLS-implicit), (2) `runCustomReportCore()` via Context-Loader, (3) UPDATE `usage_count = usage_count + 1, last_used_at = now()`, (4) audit_log `custom_report.executed` mit Cost-Metadaten. Returns `ReportResult { markdown, completedAt, model, refreshable: true }`.
- **AC8** `runCustomReportCore({ promptTemplate, contextType, scope })`: Loader-Switch auf `contextType`, Bedrock-Call via `invokeBedrock()`, Region-Pin (DEC-211) greift. Returns `ReportResult`.
- **AC9** `renameCustomReport({ id, name })`: zod-Validate + UPDATE + UNIQUE-Check (Catch 23505) + audit_log `custom_report.renamed` mit `old_name` + `new_name`.
- **AC10** `deleteCustomReport({ id })`: DELETE + audit_log `custom_report.deleted` mit `name`.
- **AC11** Vitest Live-DB-Test (`custom-reports-rls.test.ts`) PASS:
  - SAVEPOINT-Pattern fuer expected RLS-Rejections.
  - 4 RLS-Tests (User A kann nicht User B SELECT/INSERT/UPDATE/DELETE).
  - 1 UNIQUE-Constraint-Test (duplicate name wirft 23505).
  - 1 Cascade-Delete-Test (User-Delete → `custom_reports` rows weg).
- **AC12** `cockpit/docs/AUDIT_SERVER_ACTIONS_V7.md` enthaelt V7.6-Section mit 5 Server-Actions + 4 audit_log-Actions.
- **AC13** `cockpit/docs/MIGRATIONS.md` MIG-037-Block hat `Date: 2026-05-XX (applied ...)` statt PLANNED, plus Verifikations-Log.
- **AC14** Vitest gruen: `npm run test:all` 1078+/1078+ + V7.6-neue-Tests PASS.
- **AC15** TSC + Lint + Build clean.

## Micro-Tasks

#### MT-1: MIG-037 Apply auf Coolify-DB

- Goal: `custom_reports`-Tabelle ist live auf Hetzner-DB, RLS+Indizes+GRANTs verifiziert, PostgREST-Schema-Cache neu geladen.
- Files:
  - `sql/migrations/037_v76_custom_reports.sql` (NEU)
- Expected behavior:
  - SQL-Datei enthaelt CREATE TABLE IF NOT EXISTS + 2 CREATE INDEX IF NOT EXISTS + ALTER TABLE ENABLE RLS + 4 DROP POLICY IF EXISTS + 4 CREATE POLICY + 2 GRANTs + NOTIFY pgrst (1:1 wie MIGRATIONS.md MIG-037 PLANNED).
  - Apply per SSH+base64 als `postgres`-User (`sql-migration-hetzner.md` Procedure).
- Verification:
  - `docker exec <supabase-db-container> psql -U postgres -d postgres -c "\\d custom_reports"` zeigt 10 Spalten + RLS=true.
  - `SELECT polname, polcmd FROM pg_policy WHERE polrelid = 'custom_reports'::regclass;` 4 Eintraege.
  - `SELECT has_table_privilege('authenticated', 'custom_reports', 'INSERT');` returns `t`.
  - PostgREST-Smoke: `curl -s -H "apikey: $ANON" https://business.strategaizetransition.com/rest/v1/custom_reports?limit=1` HTTP 200.
- Dependencies: none (kann parallel zu MT-2 Code-Anlage laufen, aber Tests in MT-3+ brauchen die Tabelle)

#### MT-2: saveCustomReport + listCustomReports Server-Actions + Unit-Tests

- Goal: Save + List Server-Actions implementiert + Unit-Tests fuer zod-Validate + UNIQUE-409-Mapping.
- Files:
  - `cockpit/src/lib/custom-reports/actions/save.ts` (NEU)
  - `cockpit/src/lib/custom-reports/actions/list.ts` (NEU)
  - `cockpit/src/lib/custom-reports/__tests__/save.test.ts` (NEU)
  - `cockpit/src/lib/custom-reports/__tests__/list.test.ts` (NEU)
- Expected behavior:
  - `save.ts`: `"use server"`, async function `saveCustomReport({ name, prompt_template, context_type, description? })`. zod-Schema mit length-Checks. INSERT via `createServerClient()`. Catch on Postgres-Error-Code `23505` → return `{ ok: false, code: "duplicate_name", message: "..." }`. Bei Success → audit_log INSERT `custom_report.created` + return `{ ok: true, id }`.
  - `list.ts`: `"use server"`, async function `listCustomReports({ context_type })`. SELECT mit RLS-implicit Owner-Filter, ORDER BY clauses.
  - Unit-Tests mit `vi.mock` fuer Supabase-Client. Mock UNIQUE-Error → Result `{ ok: false, code: "duplicate_name" }` assertet.
- Verification:
  - Vitest `npm run test -- save list` PASS.
  - TSC clean.
- Dependencies: MT-1 (Tabelle muss existieren falls Unit-Tests reine Mock-Tests sind reicht das nicht, aber Live-Smoke in MT-6 braucht es)

#### MT-3: runCustomReport + custom-report-runner.ts + Context-Loader

- Goal: Run-Pfad ist komplett, Bedrock-Call funktioniert mit Context-Type-Default-Loader, Cost-Tracking persistiert.
- Files:
  - `cockpit/src/lib/custom-reports/actions/run.ts` (NEU)
  - `cockpit/src/lib/ki-workspace/custom-report-runner.ts` (NEU)
  - `cockpit/src/lib/ki-workspace/custom-report-prompt.ts` (NEU)
  - `cockpit/src/lib/ki-workspace/loaders/mein-tag-context.ts` (NEU — Refactor-Export aus tagesanalyse.ts oder eigene Aggregation)
  - `cockpit/src/lib/ki-workspace/loaders/cockpit-context.ts` (NEU — Refactor-Export aus pipeline-snapshot.ts)
  - `cockpit/src/lib/custom-reports/__tests__/run.test.ts` (NEU)
- Expected behavior:
  - `run.ts`: 4-Schritt-Pfad (Load + Run + Update + Audit). Cost wird aus Bedrock-Response berechnet (analog V7.5 sculptor-cost.ts-Pattern).
  - `custom-report-runner.ts`: Context-Type-Switch ruft passenden Loader auf, baut Prompt = `SYSTEM_PROMPT + dataContext + prompt_template`, ruft `invokeBedrock(prompt)`, returnt `ReportResult`.
  - `custom-report-prompt.ts`: kurzer System-Prompt ("Du bist ein KI-Assistent fuer ein deutsches B2B-CRM. Beantworte folgende Frage auf Basis der bereitgestellten Daten. Antwort auf Deutsch, kompakt, mit Markdown-Bullet-Liste wo sinnvoll.").
  - Loader-Files: re-exportieren bestehende Data-Loading-Logik aus tagesanalyse.ts/pipeline-snapshot.ts in wiederverwendbare Function-Form. Pruefen in MT-3 ob diese Loader-Logik heute schon ausgegliedert ist oder ob ein Mini-Refactor noetig ist.
  - Unit-Tests mit `vi.mock` fuer `invokeBedrock` + Loader → assert ReportResult-Struktur + usage_count-Update + audit_log-Insert-Args.
- Verification:
  - Vitest `npm run test -- run custom-report-runner` PASS.
  - TSC clean.
- Dependencies: MT-2

#### MT-4: renameCustomReport + deleteCustomReport + audit_log-Actions

- Goal: Rename + Delete sind implementiert, audit_log-Trail komplett fuer alle 4 V7.6-Actions.
- Files:
  - `cockpit/src/lib/custom-reports/actions/rename.ts` (NEU)
  - `cockpit/src/lib/custom-reports/actions/delete.ts` (NEU)
  - `cockpit/src/lib/custom-reports/__tests__/rename.test.ts` (NEU)
  - `cockpit/src/lib/custom-reports/__tests__/delete.test.ts` (NEU)
- Expected behavior:
  - `rename.ts`: zod-Validate (name 2-80) + UPDATE WHERE id=$1 (RLS-implicit) + UNIQUE-Catch 23505 + audit_log `custom_report.renamed` (`old_name`, `new_name`).
  - `delete.ts`: DELETE WHERE id=$1 (RLS-implicit) + audit_log `custom_report.deleted` (mit `name` aus Pre-SELECT).
  - Unit-Tests mit Mock-Supabase-Client.
- Verification:
  - Vitest PASS.
  - TSC clean.
- Dependencies: MT-2 (Save als Vorbild fuer Pattern)

#### MT-5: RLS-Live-DB-Tests via Coolify-Test-Setup-Pattern

- Goal: Live-DB-Tests beweisen RLS-Owner-Isolation + UNIQUE-Constraint + Cascade-Delete.
- Files:
  - `cockpit/__tests__/custom-reports-rls.test.ts` (NEU oder Repo-Root falls Mount-Konvention das vorgibt)
- Expected behavior:
  - Test-File nutzt `pg`-Client mit TEST_DATABASE_URL aus Coolify-DB.
  - SAVEPOINT-Pattern fuer expected Permission-Denials (`coolify-test-setup.md`).
  - 6 Tests:
    1. User A INSERT → User A kann SELECT eigene Row.
    2. User B SELECT fuer User A's Row → 0 Rows (RLS filtert).
    3. User B UPDATE User A's Row → wirft `row-level security` Error.
    4. User B DELETE User A's Row → wirft `row-level security` Error.
    5. Duplicate (owner_user_id, name) Insert → wirft `23505` UNIQUE-Constraint.
    6. DELETE auth.users User A → CASCADE loescht `custom_reports`-Rows.
  - JWT-Claims via `SET LOCAL request.jwt.claim.sub = '<user-uuid>'`.
- Verification:
  - `docker run --rm --network <coolify-network> -v /opt/business-system-test:/app -w /app -e TEST_DATABASE_URL=... node:20 npx vitest run custom-reports-rls` PASS (6/6).
- Dependencies: MT-1 (Tabelle live), MT-4 (Server-Actions als CRUD-Vorbild)

#### MT-6: Build + Test + Lint + Records-Sync + /qa-Live-Smoke

- Goal: Slice DONE nach Vitest-Suite + Live-DB-RLS-PASS + audit_log-Live-Smoke + Records-Final-Update.
- Files:
  - `cockpit/docs/STATE.md` (MOD — Current Focus "SLC-762 DONE, naechster Schritt /frontend SLC-763")
  - `cockpit/slices/INDEX.md` (MOD — SLC-762 Status → `done`)
  - `cockpit/features/INDEX.md` (MOD — FEAT-762 Status `planned` → `in_progress`)
  - `cockpit/planning/backlog.json` (MOD — BL-442 V7.6 bleibt `in_progress`, wird in SLC-763-Done auf `done`)
  - `cockpit/docs/AUDIT_SERVER_ACTIONS_V7.md` (MOD — V7.6-Section ergaenzen)
  - `cockpit/docs/MIGRATIONS.md` (MOD — MIG-037 PLANNED → APPLIED + Verifikations-Log)
  - `cockpit/reports/RPT-XXX.md` (NEU — /qa-Report mit Live-DB-Verifikations-Log + audit_log-Live-Smoke)
- Expected behavior:
  - `npm run build` clean.
  - `npm run lint` keine neuen Findings.
  - `npm run test:all` PASS (V7.5-Baseline + V7.6-Backend-Tests).
  - Live-Smoke (Coolify deployt, dann curl-based Smoke):
    - `curl -X POST .../api/custom-reports/save` mit gueltigem JWT → `{ ok: true, id }`.
    - `curl -X POST .../api/custom-reports/save` mit Duplicate-Name → `{ ok: false, code: "duplicate_name" }`.
    - `curl -X POST .../api/custom-reports/run` → ReportResult mit Bedrock-Markdown.
    - SQL-Verifikation: `SELECT * FROM audit_log WHERE action LIKE 'custom_report.%' ORDER BY created_at DESC LIMIT 5;` zeigt `created` + `executed`-Eintraege.
  - Cleanup-DELETE (`DELETE FROM custom_reports WHERE name LIKE 'SLC-762-smoke%';`).
- Verification:
  - Alle 4 Live-Smoke-Calls PASS.
  - audit_log-Trail komplett.
  - 0 Test-Pollution nach Cleanup.
- Dependencies: MT-5 PASS

## Risks & Mitigations

- **R1** MIG-037 koennte auf `auth.users(id)` FK scheitern wenn der Schema-Suffix differs (postgres search_path Issue, `reference_coolify_postgres_search_path`). **Mitigation:** Migration nutzt `auth.users(id)` explicit-prefixed.
- **R2** Daten-Loader aus `tagesanalyse.ts`/`pipeline-snapshot.ts` sind heute inline und nicht als pure Functions exportiert. **Mitigation:** MT-3 macht einen kleinen Refactor-Export der Loader-Logik in `lib/ki-workspace/loaders/*`. Falls Inline-Refactor zu invasiv: Loader-Logik in den neuen Loadern duplizieren mit Kommentar "Reuse-Backlog-Item V7.7+".
- **R3** UNIQUE-Constraint-23505-Mapping ist Postgres-spezifisch. Wenn Supabase JS-Client den Code anders maskiert: Mitigation via `error.code === "23505"`-Catch ODER `error.message.includes("duplicate key value violates unique constraint")` als Fallback.
- **R4** `runCustomReport` braucht JWT-Token im Bedrock-Pfad? Nein — Bedrock laeuft Server-Side mit AWS-Creds, kein User-Token noetig. audit_log-Insert nutzt `service_role`-Pfad (analog V7.5).
- **R5** PostgREST-Schema-Cache vergisst NOTIFY-Reload manchmal (~5min Delay). **Mitigation:** In MT-1 manuell verifizieren mit `curl /rest/v1/custom_reports?limit=1` direkt nach NOTIFY. Falls 404: erneutes NOTIFY oder PostgREST-Container-Restart als Notfall (`docker restart <postgrest-container>`).
- **R6** Coolify-Test-Setup mit dynamic container-name (`supabase-db-<uuid>-<timestamp-suffix>`, `reference_coolify_supabase_db_alias` resp. IMP-497) — Mitigation: zur Laufzeit per `docker ps` aufloesen, NIE Hardcoded-Name. Siehe `coolify-test-setup.md` Reference Container-Naming.
- **R7** Cost-Calc fuer `runCustomReport` braucht Bedrock-Pricing-Tabelle. V7.5 hat `sculptor-cost.ts` mit eu.anthropic.claude-sonnet-4-6 Pricing. **Mitigation:** Re-use von `cockpit/src/lib/automation/sculptor-cost.ts` oder Extraction der Pricing-Tabelle in `lib/llm/bedrock-pricing.ts` (Mini-Refactor).

## Dependencies

- **SLC-761 DONE** als Voraussetzung (Workspace-Refactor steht).
- **V7.5 DEC-211** Bedrock-Region-Assertion bleibt aktiv.
- **V6.6 audit_log-Schema** unveraendert (additiv genutzt mit 4 neuen action-Werten).
- **V6.6 MEIN_TAG_REPORTS / COCKPIT_REPORTS-Datenkontexte** als Loader-Reuse-Quellen.

## Verification & Tests

- TSC + Lint + Build clean
- Vitest Unit-Tests PASS (Save + List + Run + Rename + Delete = 5 neue Test-Files)
- Vitest Live-DB-Test PASS (RLS + UNIQUE + Cascade-Delete = 6/6)
- Live-Smoke gegen Coolify-Deployment (Save + Duplicate-Reject + Run + audit_log-Verifikation)
- 0 Test-Pollution nach Cleanup

## Open Points

- RPT-Nummer fuer den Slice-Done-Report wird in MT-6 vergeben.
- Loader-Refactor-Granularitaet (R2): pruefen in MT-3-Start. Bei zu invasiv → Inline-Loader-Duplikation mit V7.7+-Backlog-Note.
- Cost-Calc-Reuse (R7): wenn `sculptor-cost.ts` in `automation/`-Modul gesperrt ist (Module-Boundaries), in MT-3 ggf. Extraction nach `lib/llm/bedrock-pricing.ts` (eigener Mini-Slice oder inline mit Backlog-Note).

## Files Reviewed (Slice-Planning)

- [features/FEAT-762-custom-reports.md](features/FEAT-762-custom-reports.md) — Requirements + 5 OQs
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) V7.6-Section — Schema + Components-Diagramm + DEC-215
- [docs/MIGRATIONS.md](docs/MIGRATIONS.md) MIG-037 PLANNED — SQL-Vorlage
- [docs/DECISIONS.md](docs/DECISIONS.md) DEC-215 + DEC-218 — Slice-Boundary-Definitionen
- [cockpit/src/lib/ki-workspace/reports/](cockpit/src/lib/ki-workspace/reports/) — bestehende Standard-Report-Logik als Loader-Reuse-Quellen (tagesanalyse.ts, pipeline-snapshot.ts)
- [cockpit/src/lib/automation/sculptor.ts](cockpit/src/lib/automation/sculptor.ts) — V7.5 Bedrock-Call-Pattern als Reuse-Vorbild
- [cockpit/src/lib/automation/sculptor-cost.ts](cockpit/src/lib/automation/sculptor-cost.ts) — Bedrock-Cost-Calc-Pattern
- [cockpit/src/lib/llm/bedrock-client.ts](cockpit/src/lib/llm/bedrock-client.ts) — `invokeBedrock` + Region-Assertion
- Rule `.claude/rules/sql-migration-hetzner.md` — Migration-Procedure
- Rule `.claude/rules/coolify-test-setup.md` — RLS-Live-Test-Pattern + SAVEPOINT
- Memory `feedback_migration_rls_needs_grants.md` — RLS-Grants-Pflicht
- Memory `reference_postgrest_schema_reload.md` — NOTIFY pgrst
- Memory `reference_coolify_supabase_db_alias.md` — stabiler `supabase-db`-DNS-Alias

## Recommended Implementation Skill

`/backend` MT-1 + MT-2 + MT-3 + MT-4 + MT-5 (Migration + 5 Server-Actions + Runner + Loader + Live-DB-Tests).
`/qa` MT-6 (Live-Smoke + Records-Sync + Slice-Done).
Nach MT-6: **SLC-762 DONE.** Naechster Schritt: `/frontend SLC-763` (Custom-Reports Frontend).
