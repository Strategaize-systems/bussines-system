# SLC-902 — V8.11 RLS-Sweep Klasse B (Team-Templates, SELECT all + Admin-mutate)

**Status:** planned
**Version:** V8.11
**Feature:** FEAT-911
**Backlog:** BL-500-902
**Created:** 2026-06-04
**Architecture:** docs/ARCHITECTURE.md V8.11-Addendum (Klasse B) + DEC-271 + DEC-274
**Slice-Reihenfolge (DEC-265):** Sub-Slice 2 von 5 — baut auf SLC-901-Pipeline auf, deployed Sec-Audit-Helper-Function
**Aufwand-Schaetzung:** ~5-6h Code-Side
**Migration:** MIG-046 (+ Sec-Audit-Helper-Function)
**Worktree:** `v8-11-rls-sweep` (cumulative)

## Goal

11 Team-Templates-Tabellen ohne Owner-Spalte werden auf das Klasse-B-Pattern umgestellt: SELECT all authenticated, INSERT/UPDATE/DELETE Admin-only. Zusaetzlich wird die persistente `list_tables_with_authenticated_full_access()`-Sec-Audit-Helper-Function deployed (DEC-274) — ab hier Done-Gate-Check via Function-Call statt direkter `pg_policies`-Query.

## Tabellen (11)

| Tabelle | Zweck | Cron/Worker-Schreiber |
|---|---|---|
| `branding_settings` | Brand-Defaults pro Team | kein Cron — Admin-Server-Action |
| `email_templates` | E-Mail-Vorlagen | kein Cron — Admin + KI-Vorlagen-Generator (Admin-Pfad) |
| `payment_terms_templates` | Zahlungsbedingungen-Vorlagen | kein Cron |
| `compliance_templates` | DSE-Texte etc. | kein Cron |
| `vat_id_validations` | VIES-Result-Cache | `/api/cron/vies-revalidate` (falls existiert) |
| `pipelines` | Pipeline-Definitionen | kein Cron |
| `pipeline_stages` | Stages pro Pipeline | kein Cron |
| `products` | Produkt-Stammdaten | kein Cron |
| `automation_rules` | Workflow-Rule-Definitionen | kein Cron (Runner liest, schreibt nicht in `automation_rules`) |
| `cadences` | Cadence-Definitionen | kein Cron |
| `cadence_steps` | Steps pro Cadence | kein Cron |

**Multi-Tenant-V9-Forward-Compatibility:** Policy-Body bleibt `USING (true)` fuer SELECT — bei V9-Team-Pflicht wird `USING (team_id = get_my_team_id())` ergaenzt. Pattern bleibt 1:1.

## Policy-Template (DEC-271)

```sql
DROP POLICY IF EXISTS authenticated_full_access ON <table>;

CREATE POLICY <table>_select ON <table>
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY <table>_insert ON <table>
  FOR INSERT TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY <table>_update ON <table>
  FOR UPDATE TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY <table>_delete ON <table>
  FOR DELETE TO authenticated
  USING (is_admin());
```

**Wichtig:** `branding_settings` und `vat_id_validations` heissen in Live-DB `authenticated_full_access` und werden ueber das gemeinsame DROP `authenticated_full_access` erfasst. Andere wie `automation_rules` heissen `automation_rules_full_access` — pro Tabelle BEIDE DROP-Varianten ausfuehren (idempotent).

## Sec-Audit-Helper-Function (DEC-274) — Pflicht in dieser Migration

```sql
CREATE OR REPLACE FUNCTION list_tables_with_authenticated_full_access()
  RETURNS TABLE(schemaname TEXT, tablename TEXT, policyname TEXT)
  LANGUAGE SQL
  STABLE
  SECURITY DEFINER
  SET search_path = public
AS $$
  SELECT schemaname::TEXT, tablename::TEXT, policyname::TEXT
    FROM pg_policies
   WHERE schemaname = 'public'
     AND (policyname = 'authenticated_full_access'
          OR policyname LIKE '%_full_access');
$$;

GRANT EXECUTE ON FUNCTION list_tables_with_authenticated_full_access() TO authenticated;
```

Pflicht-Check post-Apply: `SELECT COUNT(*) FROM list_tables_with_authenticated_full_access()` = 26 (= 37 - 11).

## Acceptance Criteria

- **AC-902-1:** MIG-046 idempotent applied. Pre-Apply 37 Rows, Post-Apply 26 Rows in `*_full_access`-Inventur.
- **AC-902-2:** Pro Tabelle 4 Policies vorhanden. Verifikation per `SELECT COUNT(*) FROM pg_policies WHERE tablename = ANY(...) AND schemaname='public'` = 44 (11 × 4).
- **AC-902-3:** Sec-Audit-Helper-Function `list_tables_with_authenticated_full_access()` exists, GRANTed auf authenticated, returns 26 Rows post-MIG-046.
- **AC-902-4:** Vitest `cockpit/__tests__/rls/v8-11-slc-902-rls-matrix.test.ts` GREEN: 11 Tabellen × 3 Rollen × 4 Ops = **132 Tests**.
  - admin: alle 44 Ops allowed
  - teamlead: SELECT allowed (44 / 4 = 11), INSERT/UPDATE/DELETE denied (33) — Admin-mutate-Pattern
  - member: SELECT allowed (11), INSERT/UPDATE/DELETE denied (33)
- **AC-902-5:** Cron-Code-Audit Klasse-B-Tabellen (Admin-mutate-Schreiber + KI-Vorlagen-Generator). Doku im bestehenden `docs/AUDIT_CRON_V811.md` Section "Klasse B".
- **AC-902-6:** EXPLAIN ANALYZE 5 Queries (siehe `qa/SLC-902-perf-baseline.md`) erfuellt DEC-266-Threshold.
- **AC-902-7:** Pre-V8.11-Baseline pro Query gemessen vor MIG-046 und dokumentiert.
- **AC-902-8:** Live-Smoke 3 Pfade auf business.strategaizetransition.com PASS:
  - admin: CREATE email_template (PASS), UPDATE pipelines (PASS), DELETE products (PASS)
  - teamlead: SELECT email_templates (PASS), CREATE email_template (FAIL: RLS-Violation), UPDATE pipelines (0 affected)
  - member: SELECT pipelines (PASS Lese), CREATE pipeline (FAIL: RLS-Violation)
- **AC-902-9:** Records-Sync: SLC-902 done, BL-500-902 done, STATE.md Focus → "V8.11 SLC-903 Klasse C", MIGRATIONS.md MIG-046, RPT-585 (Code-Side) + RPT-586 (Live-Smoke).
- **AC-902-10:** Done-Gate-Check via `list_tables_with_authenticated_full_access()` = 26 Rows.

## Micro-Tasks

### MT-1: Pre-Check Schema-Verify + Pre-V8.11-Baseline
- **Goal:** Verifizieren dass alle 11 Tabellen keine `owner_user_id` oder `user_id`-Spalte haben (Klasse-B-Annahme) + 5 Queries pre-Migration messen.
- **Files:** `qa/SLC-902-perf-baseline.md` (neu).
- **Expected behavior:**
  ```sql
  SELECT table_name, column_name FROM information_schema.columns
   WHERE table_schema='public'
     AND table_name = ANY(ARRAY['branding_settings','email_templates','payment_terms_templates','compliance_templates','vat_id_validations','pipelines','pipeline_stages','products','automation_rules','cadences','cadence_steps'])
     AND column_name IN ('owner_user_id','user_id');
  -- expected: 0 rows
  ```
  Plus 5 Baseline-Queries (z.B. `SELECT * FROM email_templates WHERE category='quote'`, `SELECT * FROM pipelines WHERE deleted_at IS NULL`).
- **Verification:** `qa/SLC-902-perf-baseline.md` enthaelt 5 Pre-V8.11-Baseline-Werte. Schema-Pruefung dokumentiert "0 owner-Spalten" als bestaetigt.
- **Dependencies:** SLC-901 done

### MT-2: MIG-046 Migration mit DO-Loop + Sec-Audit-Helper-Function-Deploy
- **Goal:** Idempotente Migration mit DO-Block (analog SLC-901) plus Sec-Audit-Helper-Function (DEC-274).
- **Files:** `sql/migrations/046_v8_11_slc_902_klasse_b.sql` (neu).
- **Expected behavior:** Migration-Body enthaelt:
  1. Helper-Existenz-Guard (wie SLC-901 MT-2)
  2. DO-Loop ueber 11 Tabellen mit DROP `authenticated_full_access` + DROP `<table>_full_access` + 4 CREATE POLICY (per DEC-271-Template)
  3. CREATE OR REPLACE FUNCTION + GRANT (Sec-Audit-Helper)
- **Verification:** Re-Apply idempotent. Post-Apply: 26 in Helper-Function, 44 Policies in `pg_policies` fuer die 11 Tabellen.
- **Dependencies:** MT-1

### MT-3: Vitest RLS-Matrix-File (11×3×4 = 132 Tests)
- **Goal:** Test-File analog SLC-901-Pattern, aber Expected-Matrix angepasst:
  - SELECT: admin+teamlead+member alle allowed
  - INSERT/UPDATE/DELETE: nur admin allowed
- **Files:** `cockpit/__tests__/rls/v8-11-slc-902-rls-matrix.test.ts` (neu).
- **Expected behavior:** 132 Tests gegen Coolify-DB. Fixture-Pflicht: pro Tabelle mind. 1 Seed-Row (Default-Pipeline, Default-Email-Template existieren bereits seit V2/V5.3).
- **Verification:** Vitest GREEN 132/132 im Sidecar.
- **Dependencies:** MT-2

### MT-4: Cron-Code-Audit Klasse-B-Schreiber
- **Goal:** Verifizieren dass alle Admin-Pfade in Klasse-B-Tabellen via createAdminClient() schreiben.
- **Files:** `docs/AUDIT_CRON_V811.md` (Erweiterung Section "Klasse B").
- **Expected behavior:**
  - `grep -rn "from('branding_settings'|'email_templates'|...)" cockpit/src/app/(app)/settings/` — pruefen ob INSERT/UPDATE/DELETE via createAdminClient.
  - KI-Vorlagen-Generator (`/api/ai/generate-template/route.ts` o.ae.) — pruefen ob Admin-Check vor INSERT email_templates.
  - `/api/cron/vies-revalidate/route.ts` (falls existiert) — pruefen vat_id_validations-Schreiber.
- **Verification:** Section "Klasse B" in `docs/AUDIT_CRON_V811.md` mit Liste + OK/FIX-NEEDED.
- **Dependencies:** MT-2

### MT-5: Post-MIG-046 EXPLAIN ANALYZE Re-Run
- **Goal:** 5 Queries re-messen post-MIG-046. Threshold-Check.
- **Files:** `qa/SLC-902-perf-baseline.md` (Erweiterung "Post-V8.11").
- **Expected behavior:** Pro Query: ms + plan-Hash + Faktor. Bei Threshold-Verletzung Index-Audit.
- **Verification:** 5 Post-Werte ohne Threshold-Violation.
- **Dependencies:** MT-2, MT-3

### MT-6: Done-Gate-Check + Records-Sync + Live-Smoke + RPT-585/RPT-586
- **Goal:** Done-Gate via neuer Helper-Function. Records-Sync. Live-Smoke 3 Pfade. 2 Reports.
- **Files:**
  - `slices/INDEX.md`, `planning/backlog.json`, `docs/STATE.md`, `docs/MIGRATIONS.md`
  - `reports/RPT-585.md` (Code-Side)
  - `reports/RPT-586.md` (Live-Smoke)
- **Expected behavior:** Done-Gate-SQL: `SELECT COUNT(*) FROM list_tables_with_authenticated_full_access()` = 26. Live-Smoke per Playwright-MCP autonom.
- **Verification:** 26 verbleibend. Records updated. Live-Smoke 3/3 PASS-LIVE.
- **Dependencies:** MT-2..MT-5

## Pre-Conditions

- SLC-901 done (Pattern etabliert + RLS-Test-Sidecar laeuft)
- Wie SLC-901: V8.13 SLC-895 + V7-Helper + Seed-Script live

## Pattern-Reuse

- Migration-Pattern aus SLC-901 (DO-Loop) — Quellpfad-Header-Kommentar
- Test-Pattern aus SLC-901 — angepasste Expected-Matrix fuer Klasse-B (SELECT-all, Mutate-Admin)
- Sec-Audit-Helper-Function: V7-SECURITY-DEFINER-Pattern aus MIG-035

## Risks / Assumptions

- **R-902-1 (Low):** `pipelines` und `pipeline_stages` werden in V6.6+ von Member im UI verwaltet? Wenn doch User-CREATE existiert, ist Admin-only-mutate falsch. MT-4 Audit klaert.
- **R-902-2 (Medium):** Backfill der Default-Templates (V5.3) koennte fehlen bei neuen Teams — falls Member kein Email-Template lesen kann weil keine existieren, ist das ein Pre-Live-Bug aber kein RLS-Issue.
- **A-902-1:** KI-Vorlagen-Generator nutzt service_role oder Admin-Check vor INSERT email_templates.

## Out of Scope

- Multi-Tenant-V9 team_id-Filter
- Default-Template-Seed-Bug-Fix (falls in MT-4 entdeckt — als ISSUE-XXX in KNOWN_ISSUES, nicht in SLC-902-Scope)

## Related

- `docs/ARCHITECTURE.md` V8.11-Addendum Klasse B + Sec-Audit-Helper
- `docs/DECISIONS.md` DEC-271, DEC-274, DEC-265, DEC-266, DEC-268
- Pattern-Quelle: `sql/migrations/045_v8_11_slc_901_klasse_a.sql` (SLC-901 MT-2)
- Pattern-Quelle Test: `cockpit/__tests__/rls/v8-11-slc-901-rls-matrix.test.ts`

## Next Slice

SLC-903 — Klasse C Parent-FK-JOIN (24 Tabellen, 3 atomare Migration-Blocks).
