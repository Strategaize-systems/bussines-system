# SLC-903 — V8.11 RLS-Sweep Klasse C (Parent-FK-JOIN, 24 Tabellen in 3 atomaren Migration-Blocks)

**Status:** planned
**Version:** V8.11
**Feature:** FEAT-911
**Backlog:** BL-500-903
**Created:** 2026-06-04
**Architecture:** docs/ARCHITECTURE.md V8.11-Addendum (Klasse C) + DEC-272
**Slice-Reihenfolge (DEC-265):** Sub-Slice 3 von 5 — dominanter Aufwand (24 Tabellen), 3 atomare Blocks
**Aufwand-Schaetzung:** ~10-13h Code-Side
**Migration:** MIG-047 in 3 atomaren Migration-Files (047a/047b/047c)
**Worktree:** `v8-11-rls-sweep` (cumulative)

## Goal

24 Klasse-C-Tabellen werden auf das EXISTS-Subquery-Pattern umgestellt: `EXISTS (SELECT 1 FROM <parent> WHERE <parent>.id = <child>.<fk> AND can_see_owner(<parent>.owner_user_id))`. Multi-Parent-Tabellen nutzen OR-Verkettung. NULL-Parent erlaubt nur eigene `created_by`-Rows. `emails` hat eigene `owner_user_id`-Spalte → V7-Pattern direkt.

**5 Sonderfaelle aus OQ-V8.11-arch-5 entschieden (siehe FEAT-911 Decision-Block):**
- `email_tracking_events` → (a) mittelbarer FK via `emails.owner_user_id`
- `campaign_link_clicks` → (c) Admin-only SELECT + service_role-only mutate
- `automation_runs` → (c) Admin-only SELECT + service_role-only mutate
- `cadence_enrollments` → (a) Multi-Parent EXISTS via `deal_id OR contact_id OR created_by`
- `fit_assessments` → (a) Special-Case `assessed_by = auth.uid() OR is_admin()` (polymorph entity_type/_id fragil; assessed_by stabil)

**OQ-V8.11-arch-6 entschieden:** Policy-Naming-Praefix `documents_table_*` (Live-DB-Storage-Policies sind `documents_user_*` — Konflikt-frei).

## Tabellen (24 in 3 atomaren Blocks)

### Block 1 — Standard-Parent-FK (8 Tabellen, MIG-047a, ~3-4h)

| Tabelle | Parent-FK(s) | Pattern |
|---|---|---|
| `tasks` | deal_id | EXISTS deals + NULL-Parent created_by=auth.uid() |
| `signals` | deal_id OR contact_id OR company_id OR activity_id | Multi-Parent OR + created_by |
| `calendar_events` | deal_id OR contact_id OR company_id OR meeting_id | Multi-Parent OR + created_by |
| `email_threads` | contact_id OR company_id OR deal_id | Multi-Parent OR |
| `handoffs` | deal_id OR company_id | Multi-Parent OR + created_by |
| `deal_products` | deal_id | EXISTS deals |
| `auto_winloss_runs` | deal_id | EXISTS deals |
| `referrals` | deal_id OR referrer_id (contacts) OR referred_company_id | Multi-Parent OR |

### Block 2 — Proposal/Email/Cadence-FK (8 Tabellen, MIG-047b, ~3-4h)

| Tabelle | Parent-FK(s) | Pattern |
|---|---|---|
| `proposal_items` | proposal_id | EXISTS proposals |
| `proposal_payment_milestones` | proposal_id | EXISTS proposals |
| `email_attachments` | email_id OR proposal_id | Multi-Parent OR |
| `emails` | owner_user_id (direkt) | V7-Pattern direkt (analog companies/contacts/etc.) |
| `cadence_enrollments` | deal_id OR contact_id OR created_by | OQ-arch-5 (a) Multi-Parent + created_by |
| `cadence_executions` | enrollment_id → cadence_enrollments | EXISTS cadence_enrollments (transitiv) |
| `email_tracking_events` | email_id → emails.owner_user_id | OQ-arch-5 (a) mittelbarer FK |
| `ai_feedback` | action_queue_id → ai_action_queue | EXISTS ai_action_queue (transitiv) |

### Block 3 — Polymorph/Special-Cases (8 Tabellen, MIG-047c, ~3-4h)

| Tabelle | Strategie | Pattern |
|---|---|---|
| `ai_action_queue` | entity_type+entity_id polymorph | Multi-Parent OR (deals/contacts/companies/proposals via CASE entity_type) ODER created_by-Fallback. Falls polymorph zu fragil: created_by-only. **MT-Decision in MT-3c.** |
| `campaigns` | created_by only | Klasse-A-Stil: `created_by = auth.uid() OR is_admin()` |
| `campaign_links` | campaign_id → campaigns | EXISTS campaigns (transitiv via created_by) |
| `campaign_link_clicks` | link_id → campaign_links | OQ-arch-5 (c) Admin-only SELECT + service_role mutate |
| `automation_runs` | rule_id (Klasse-B Templates, kein Owner) | OQ-arch-5 (c) Admin-only SELECT + service_role mutate |
| `fit_assessments` | assessed_by | OQ-arch-5 (a) Special: `assessed_by = auth.uid() OR is_admin()` |
| `documents` | contact_id OR company_id OR deal_id OR created_by | Multi-Parent OR + created_by. **Policy-Naming `documents_table_*`** (Konflikt-frei zu Storage `documents_user_*`). |
| `email_sync_state` | kein FK | (c) Admin-only SELECT + service_role mutate |

## Policy-Templates (DEC-272)

### Standard Single-Parent (Block 1 Tabellen wie tasks → deals):

```sql
DROP POLICY IF EXISTS authenticated_full_access ON tasks;
DROP POLICY IF EXISTS tasks_full_access ON tasks;

CREATE POLICY tasks_select ON tasks
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM deals d WHERE d.id = tasks.deal_id AND can_see_owner(d.owner_user_id))
    OR (tasks.deal_id IS NULL AND tasks.created_by = auth.uid())
    OR is_admin()
  );
-- INSERT/UPDATE/DELETE: identisches Pattern (USING + WITH CHECK)
```

### Multi-Parent OR (Block 1 signals → multi):

```sql
CREATE POLICY signals_select ON signals
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM deals     d  WHERE d.id  = signals.deal_id     AND can_see_owner(d.owner_user_id))
    OR EXISTS (SELECT 1 FROM contacts  c  WHERE c.id  = signals.contact_id  AND can_see_owner(c.owner_user_id))
    OR EXISTS (SELECT 1 FROM companies co WHERE co.id = signals.company_id  AND can_see_owner(co.owner_user_id))
    OR EXISTS (SELECT 1 FROM activities a WHERE a.id  = signals.activity_id AND can_see_owner(a.owner_user_id))
    OR (signals.created_by = auth.uid())
    OR is_admin()
  );
```

### V7-Direct (Block 2 emails):

```sql
CREATE POLICY emails_select ON emails
  FOR SELECT TO authenticated
  USING (can_see_owner(owner_user_id));
-- INSERT/UPDATE/DELETE analog mit WITH CHECK (owner_user_id = auth.uid() OR is_admin())
```

### Transitive-Parent (Block 2 cadence_executions):

```sql
CREATE POLICY cadence_executions_select ON cadence_executions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM cadence_enrollments ce
       WHERE ce.id = cadence_executions.enrollment_id
         AND (
              EXISTS (SELECT 1 FROM deals d WHERE d.id = ce.deal_id AND can_see_owner(d.owner_user_id))
           OR EXISTS (SELECT 1 FROM contacts c WHERE c.id = ce.contact_id AND can_see_owner(c.owner_user_id))
           OR ce.created_by = auth.uid()
         )
    )
    OR is_admin()
  );
```

### Admin-Only (Block 3 campaign_link_clicks / automation_runs / email_sync_state):

```sql
CREATE POLICY campaign_link_clicks_select ON campaign_link_clicks
  FOR SELECT TO authenticated
  USING (is_admin());

CREATE POLICY campaign_link_clicks_insert ON campaign_link_clicks
  FOR INSERT TO authenticated
  WITH CHECK (false);  -- service_role bypassed RLS; authenticated mutate verboten

CREATE POLICY campaign_link_clicks_update ON campaign_link_clicks
  FOR UPDATE TO authenticated
  USING (false) WITH CHECK (false);

CREATE POLICY campaign_link_clicks_delete ON campaign_link_clicks
  FOR DELETE TO authenticated
  USING (is_admin());  -- Admin darf DSGVO-Cleanup
```

### Special created_by (Block 3 campaigns / fit_assessments):

```sql
CREATE POLICY campaigns_select ON campaigns
  FOR SELECT TO authenticated
  USING (created_by = auth.uid() OR is_admin());
-- Mutate analog

CREATE POLICY fit_assessments_select ON fit_assessments
  FOR SELECT TO authenticated
  USING (assessed_by = auth.uid() OR is_admin());
-- Mutate analog
```

### Documents-Table mit _table_-Praefix (Block 3 documents):

```sql
DROP POLICY IF EXISTS authenticated_full_access ON documents;

CREATE POLICY documents_table_select ON documents
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM contacts  c  WHERE c.id  = documents.contact_id  AND can_see_owner(c.owner_user_id))
    OR EXISTS (SELECT 1 FROM companies co WHERE co.id = documents.company_id  AND can_see_owner(co.owner_user_id))
    OR EXISTS (SELECT 1 FROM deals     d  WHERE d.id  = documents.deal_id     AND can_see_owner(d.owner_user_id))
    OR (documents.created_by = auth.uid())
    OR is_admin()
  );
-- Mutate analog mit _table_-Praefix (documents_table_insert/update/delete)
```

## Acceptance Criteria

- **AC-903-1:** MIG-047a/b/c idempotent applied. Pre-Apply 26 Rows, Post-Apply 2 Rows (audit_log + knowledge_chunks) in Helper-Function.
- **AC-903-2:** 24 Tabellen × 4 Policies = 96 neue Policies. Verifikation per `pg_policies`-Inventur.
- **AC-903-3:** Vitest in 3 Test-Files GREEN (Block-Split wegen Test-Cap 24 × 12 = 288 Tests):
  - `v8-11-slc-903a-rls-matrix.test.ts` — 8 Tabellen × 3 Rollen × 4 Ops = 96 Tests
  - `v8-11-slc-903b-rls-matrix.test.ts` — 8 Tabellen × 3 Rollen × 4 Ops = 96 Tests
  - `v8-11-slc-903c-rls-matrix.test.ts` — 8 Tabellen × 3 Rollen × 4 Ops = 96 Tests
  - **Expected-Matrix pro Klasse-C-Tabelle:** admin allowed, teamlead-with-Parent-in-Team allowed, member-2 (foreign-Parent) denied. **Special-Cases:** Admin-only-Tabellen (campaign_link_clicks/automation_runs/email_sync_state) → teamlead+member denied.
- **AC-903-4:** Cron-Code-Audit `/api/cron/signal-extract`, `/api/cron/automation-runner`, `/api/cron/cadence-execute`, `/api/cron/click-log-cleanup`, `/api/cron/embedding-sync`. Doku in `docs/AUDIT_CRON_V811.md` Section "Klasse C".
- **AC-903-5:** EXPLAIN ANALYZE pro Block 5 Queries (insgesamt 15 Queries) in `qa/SLC-903-perf-baseline.md`. DEC-266-Threshold. Index-Audit: alle Parent-FKs (tasks.deal_id, signals.deal_id, etc.) muessen indexiert sein. MT-1 verifiziert per `\d <table>` pro Tabelle. Bei fehlendem Index: `CREATE INDEX` im selben Migration-Block.
- **AC-903-6:** Live-Smoke 3 Pfade auf business.strategaizetransition.com PASS:
  - admin: SELECT tasks/signals/calendar_events (alle) PASS, SELECT documents (alle) PASS
  - teamlead: SELECT tasks fuer team-deal (allowed), SELECT tasks fuer foreign-deal (denied), SELECT emails (team-owned PASS, foreign 0)
  - member-2 (different owner): SELECT tasks own (PASS), SELECT tasks fuer member-1-deal (0), INSERT tasks mit member-1-deal_id (RLS-Violation)
- **AC-903-7:** Records-Sync: SLC-903 done, BL-500-903 done, STATE.md Focus → "V8.11 SLC-904 audit_log", MIGRATIONS.md MIG-047a/b/c, RPT-587..589 (Block-Reports), RPT-590 (Gesamt-Live-Smoke).
- **AC-903-8:** Done-Gate via `list_tables_with_authenticated_full_access()` = 2 Rows verbleibend (audit_log + knowledge_chunks).

## Micro-Tasks

### MT-1: Pre-Check Schema-Verify + Index-Audit + Pre-V8.11-Baseline (alle 24 Tabellen)
- **Goal:** Pro Tabelle: Parent-FK-Spalte vorhanden? Index auf Parent-FK vorhanden? + 15 Baseline-Queries (5 pro Block).
- **Files:** `qa/SLC-903-perf-baseline.md` (neu).
- **Expected behavior:** SQL-Inspection via SSH pro Tabelle. Index-Liste dokumentieren. Bei fehlendem Index: in MT-2/3/4 als CREATE INDEX ergaenzen.
- **Verification:** `qa/SLC-903-perf-baseline.md` enthaelt Pre-V8.11-Baseline + Index-Audit-Liste.
- **Dependencies:** SLC-902 done

### MT-2: MIG-047a Block 1 (Standard-Parent-FK, 8 Tabellen)
- **Goal:** Migration-Datei `sql/migrations/047a_v8_11_slc_903_klasse_c_block1.sql` mit DO-Loop ueber 8 Tabellen-Spec-Array. Pro Tabelle: DROP old + 4 CREATE POLICY mit Parent-FK-Pattern.
- **Files:** `sql/migrations/047a_v8_11_slc_903_klasse_c_block1.sql`
- **Expected behavior:** Idempotent. Helper-Existenz-Guard. Multi-Parent-Tabellen (signals, calendar_events, email_threads, handoffs, referrals) bekommen explizite OR-Verkettung statt Loop (Tabellen-spezifisch).
- **Verification:** Re-Apply idempotent. 32 neue Policies (8×4).
- **Dependencies:** MT-1

### MT-3: MIG-047b Block 2 (Proposal/Email/Cadence-FK, 8 Tabellen)
- **Goal:** Migration-Datei `sql/migrations/047b_v8_11_slc_903_klasse_c_block2.sql`. Spezialfall `emails` mit V7-Pattern, Transitive-Parent `cadence_executions` + `ai_feedback`, OQ-arch-5 `cadence_enrollments` + `email_tracking_events`.
- **Files:** `sql/migrations/047b_v8_11_slc_903_klasse_c_block2.sql`
- **Expected behavior:** Idempotent. Pro Tabelle individuelle Policy-Definition (kein generischer Loop wegen Drift).
- **Verification:** Re-Apply idempotent. 32 neue Policies.
- **Dependencies:** MT-2

### MT-4: MIG-047c Block 3 (Polymorph/Special-Cases, 8 Tabellen) + OQ-arch-5/6 Final-Decisions umgesetzt
- **Goal:** Migration-Datei `sql/migrations/047c_v8_11_slc_903_klasse_c_block3.sql` mit allen 5 OQ-arch-5-Entscheidungen + OQ-arch-6-Naming (`documents_table_*`).
- **Files:** `sql/migrations/047c_v8_11_slc_903_klasse_c_block3.sql`
- **Expected behavior:**
  - `ai_action_queue`: MT-4-Sub-Entscheidung — polymorph CASE OR created_by-only? Default: **created_by + entity_type='deal' EXISTS deals + entity_type='proposal' EXISTS proposals** (begrenzt auf 2 Haupt-Trigger-Pfade). Bei Aufwand >2h: Fallback `created_by = auth.uid() OR decided_by = auth.uid() OR is_admin()`.
  - `documents` mit `documents_table_*`-Praefix.
  - 5 OQ-arch-5-Tabellen genau wie spezifiziert.
- **Verification:** Re-Apply idempotent. 32 neue Policies. Naming `documents_table_*` konfliktfrei zu Storage `documents_user_*`.
- **Dependencies:** MT-3

### MT-5: Vitest 3 Test-Files (3 × 96 = 288 Tests)
- **Goal:** Pro Migration-Block eigene Test-File analog SLC-901-Pattern.
- **Files:**
  - `cockpit/__tests__/rls/v8-11-slc-903a-rls-matrix.test.ts`
  - `cockpit/__tests__/rls/v8-11-slc-903b-rls-matrix.test.ts`
  - `cockpit/__tests__/rls/v8-11-slc-903c-rls-matrix.test.ts`
- **Expected behavior:** Seed-Pflicht: pro Tabelle Fixture-Row mit Parent-Row owner_user_id=TEST_MEMBER_1. Multi-Parent-Tabellen: 1 Fixture pro Parent-Variante. Special-Cases: Admin-only-Tabellen testen teamlead+member denied.
- **Verification:** Vitest GREEN 288/288 im Sidecar.
- **Dependencies:** MT-4

### MT-6: Cron-Code-Audit Klasse-C-Schreiber
- **Goal:** Audit aller Cron/Worker, die in Klasse-C-Tabellen schreiben.
- **Files:** `docs/AUDIT_CRON_V811.md` (Section "Klasse C").
- **Expected behavior:** Pro Cron-Endpoint: pruefen owner-Spalte-Set korrekt aus Parent.
  - `/api/cron/signal-extract` → signals (deal_id-Set korrekt aus Parent-Deal owner_user_id)
  - `/api/cron/automation-runner` → ai_action_queue + automation_runs (entity_type/_id polymorph — created_by Set?)
  - `/api/cron/cadence-execute` → cadence_executions + email-INSERT
  - `/api/cron/click-log-cleanup` → DELETE-only auf campaign_link_clicks + email_tracking_events (DSGVO-Retention)
  - `/api/cron/email-tracking-sync` (falls existiert) → email_tracking_events INSERT
- **Verification:** Section "Klasse C" mit Liste + OK/FIX-NEEDED.
- **Dependencies:** MT-2..MT-4

### MT-7: Post-MIG-047 EXPLAIN ANALYZE Re-Run pro Block (15 Queries)
- **Goal:** 15 Queries re-messen. Threshold-Check.
- **Files:** `qa/SLC-903-perf-baseline.md` (Erweiterung Post-V8.11).
- **Expected behavior:** Pro Query ms + Faktor. Bei Threshold-Verletzung Index-Audit. Risiko: signals Multi-Parent OR mit 4 EXISTS koennte langsam sein — Index auf jede FK-Spalte Pflicht.
- **Verification:** 15 Post-Werte. Keine Threshold-Violation.
- **Dependencies:** MT-2..MT-5

### MT-8: Done-Gate-Check + Records-Sync + Live-Smoke + RPT-587/588/589/590
- **Goal:** Done-Gate Helper-Function returns 2 Rows (audit_log+knowledge_chunks). 3 Block-Reports + 1 Gesamt-Live-Smoke.
- **Files:**
  - `slices/INDEX.md`, `planning/backlog.json`, `docs/STATE.md`, `docs/MIGRATIONS.md`
  - `reports/RPT-587.md` (Block 1 Code-Side)
  - `reports/RPT-588.md` (Block 2 Code-Side)
  - `reports/RPT-589.md` (Block 3 Code-Side)
  - `reports/RPT-590.md` (Live-Smoke)
- **Verification:** 2 verbleibend. Live-Smoke 3/3 PASS-LIVE.
- **Dependencies:** alle vorherigen MTs

## Pre-Conditions

- SLC-902 done (Sec-Audit-Helper-Function deployed)
- Seed-Script erweitert um Fixture-Rows fuer 24 Klasse-C-Tabellen (Reuse `npm run seed:multi-user` aus V7.2, ggf. Erweiterung in MT-5)

## Pattern-Reuse

- Migration-Pattern aus SLC-901 + SLC-902
- Test-Pattern aus SLC-901 (V7-Matrix-Adapter) — Klasse-C-Variante mit EXISTS-Pattern und Multi-Parent-Tests
- V7-MIG-035 als Vorlage fuer `emails`-Direct-Pattern

## Risks / Assumptions

- **R-903-1 (High):** Performance-Drop bei Multi-Parent OR (signals, calendar_events, email_threads). 4 EXISTS pro Row potenziell langsam. Mitigation: Index-Audit pro FK Pflicht. EXPLAIN ANALYZE post-Apply.
- **R-903-2 (High):** Test-Cap. 288 Tests in 3 Files. Seed-Pflicht-Aufwand erheblich. Mitigation: Reuse V7-Seed + erweitern um Klasse-C-Fixtures.
- **R-903-3 (Medium):** `ai_action_queue` polymorph entity_type/_id-Pattern fragil. Default: created_by + 2 EXISTS-Pfade (deal/proposal). Falls in MT-4 Drift: Fallback created_by-only mit Reason in DEC-XXX.
- **R-903-4 (Medium):** `documents`-Naming-Konflikt zwischen Storage-Bucket (`documents_user_*`) und PUBLIC-Tabelle (`documents_table_*`). Verifikation per Inventur-Query pro Schema (storage.objects vs public.documents).
- **A-903-1:** Cron-Code-Audit ergibt keine Pre-existing-Bugs in owner-Spalten-Set. Falls doch: Hotfix-Sub-MT in SLC-903.

## Out of Scope

- search_knowledge_chunks-Function-Erweiterung (SLC-905)
- knowledge_chunks Schema-ALTER + Backfill (SLC-905)
- audit_log-Policy (SLC-904)
- Multi-Tenant-V9 team_id-Filter

## Related

- `docs/ARCHITECTURE.md` V8.11-Addendum Klasse C + OQ-arch-5/6 (Carry-Over entschieden in dieser Slice-Spec)
- `docs/DECISIONS.md` DEC-272, DEC-269, DEC-266, DEC-268 + neue DEC-275 (OQ-arch-5 + OQ-arch-6 Entscheidungen — pre-Implementation MT-0 anlegen)
- Pattern-Quelle: SLC-901 + SLC-902 + V7-MIG-035
- Live-DB-Befund 2026-06-04 (in dieser Spec dokumentiert)

## Next Slice

SLC-904 — Klasse E audit_log (Admin-all + Actor-own DSGVO-Art-15).
