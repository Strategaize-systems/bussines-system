# SLC-904 — V8.11 RLS-Sweep Klasse E (audit_log, Admin-all + Actor-own DSGVO-Art-15)

**Status:** planned
**Version:** V8.11
**Feature:** FEAT-911
**Backlog:** BL-500-904
**Created:** 2026-06-04
**Architecture:** docs/ARCHITECTURE.md V8.11-Addendum (Klasse E) + DEC-272 (Verfeinerung) + Q-V8.11-A
**Slice-Reihenfolge (DEC-265):** Sub-Slice 4 von 5 — klein und isoliert, vor dem destructiven SLC-905
**Aufwand-Schaetzung:** ~2-3h Code-Side
**Migration:** MIG-048
**Worktree:** `v8-11-rls-sweep` (cumulative)

## Goal

`audit_log` bekommt zwei separate Policies:
- **SELECT:** `is_admin() OR actor_id = auth.uid()` — Admin sieht alles (Forensik/Support), User sieht seine eigenen Eintraege (DSGVO-Art-15 Self-Service Right-of-Access).
- **INSERT/UPDATE/DELETE:** Service-Role-only via `USING (false) WITH CHECK (false)`. User darf NIE eigene Audit-Eintraege manipulieren (Compliance/Forensik). Cron + Server-Actions schreiben via `createAdminClient()`.

Plus: Code-Audit `cockpit/src/lib/audit.ts` — alle Caller pruefen, dass keine User-Session-Pfade `audit_log` direkt INSERTen.

## Tabelle (1)

| Tabelle | Schluesselspalten | Schreiber |
|---|---|---|
| `audit_log` | actor_id, entity_type, entity_id, changes (JSONB), created_at | `cockpit/src/lib/audit.ts` (Helper) + diverse Server-Actions + Cron-Endpoints |

## Policy-Template (DEC-272-Verfeinerung)

```sql
DROP POLICY IF EXISTS authenticated_full_access ON audit_log;
DROP POLICY IF EXISTS audit_log_select ON audit_log;
DROP POLICY IF EXISTS audit_log_insert ON audit_log;
DROP POLICY IF EXISTS audit_log_update ON audit_log;
DROP POLICY IF EXISTS audit_log_delete ON audit_log;

CREATE POLICY audit_log_select ON audit_log
  FOR SELECT TO authenticated
  USING (is_admin() OR actor_id = auth.uid());

CREATE POLICY audit_log_insert ON audit_log
  FOR INSERT TO authenticated
  WITH CHECK (false);  -- service_role bypassed RLS

CREATE POLICY audit_log_update ON audit_log
  FOR UPDATE TO authenticated
  USING (false)
  WITH CHECK (false);

CREATE POLICY audit_log_delete ON audit_log
  FOR DELETE TO authenticated
  USING (false);  -- auch Admin darf NICHT loeschen (Forensik-Schutz)
```

**Begruendung:** DSGVO-Art-15-Self-Service erlaubt User, eigene gespeicherte Daten einzusehen — Audit-Trail eigener Aktionen ist Teil davon. Admin braucht Vollzugriff fuer Forensik/Support. **Niemand** (auch nicht Admin via User-Session) darf Audit-Eintraege mutieren oder loeschen — sonst ist die Audit-Kette wertlos. Cron + Worker schreiben via service_role (BYPASSRLS=true), das ist designed-in (DEC-269).

**Sonderfall Admin-Delete:** Bewusst auf `false` gesetzt. Wenn ein Admin Audit-Eintraege loeschen muss (z.B. DSGVO-Loeschung eines Users), dann via service_role-Skript mit explizitem Audit-Log-Entry "audit_log_deleted_by_admin", nicht ueber User-Session.

## Acceptance Criteria

- **AC-904-1:** MIG-048 idempotent applied. Pre-Apply 2 Rows in Helper-Function, Post-Apply 1 Row (knowledge_chunks only).
- **AC-904-2:** 4 Policies vorhanden, davon 3 mit `USING (false)` / `WITH CHECK (false)` (INSERT/UPDATE/DELETE).
- **AC-904-3:** Vitest `cockpit/__tests__/rls/v8-11-slc-904-rls-matrix.test.ts` GREEN ~18 Tests:
  - admin SELECT all (PASS)
  - admin INSERT/UPDATE/DELETE (FAIL: RLS-Violation) — auch Admin via User-Session blockiert
  - actor-self (member-1) SELECT own actor_id-Rows (PASS — kann eigene Eintraege sehen)
  - actor-self (member-1) SELECT other-actor_id-Rows (0 Rows)
  - actor-self (member-1) INSERT/UPDATE/DELETE (FAIL: RLS-Violation)
  - service_role bypass test (separater Block mit `SET LOCAL ROLE service_role` — INSERT/UPDATE/DELETE alle PASS)
- **AC-904-4:** Code-Audit `cockpit/src/lib/audit.ts`: alle Caller-Pfade pruefen, dass `createAdminClient()` genutzt wird, nicht `createServerClient()`. Doku in `docs/AUDIT_CRON_V811.md` Section "Klasse E (audit_log)".
- **AC-904-5:** EXPLAIN ANALYZE 2 Queries:
  - `SELECT * FROM audit_log WHERE actor_id = $1 ORDER BY created_at DESC LIMIT 50` (Index auf actor_id+created_at noetig)
  - `SELECT * FROM audit_log WHERE entity_type = $1 AND entity_id = $2 ORDER BY created_at DESC` (Index auf entity_type+entity_id+created_at)
  Threshold-Check pro DEC-266. Bei fehlendem Index: CREATE INDEX in Migration ergaenzen.
- **AC-904-6:** Live-Smoke 2 Pfade auf business.strategaizetransition.com PASS:
  - admin: oeffnet `/settings/audit-log` (oder Aequivalent), sieht alle Eintraege (>0)
  - member-2: oeffnet eigene Profile-Seite mit Audit-Trail (falls UI vorhanden) — sieht nur eigene Eintraege
- **AC-904-7:** Records-Sync: SLC-904 done, BL-500-904 done, STATE.md Focus → "V8.11 SLC-905 knowledge_chunks Schema-Erweiterung", MIGRATIONS.md MIG-048, RPT-591 + RPT-592.
- **AC-904-8:** Done-Gate Helper-Function returns 1 Row (knowledge_chunks).

## Micro-Tasks

### MT-1: Pre-Check Index-Audit + Pre-V8.11-Baseline
- **Goal:** Verifizieren Indexe auf `audit_log(actor_id, created_at DESC)` und `audit_log(entity_type, entity_id, created_at DESC)`. Falls fehlen: CREATE INDEX in MT-2 ergaenzen.
- **Files:** `qa/SLC-904-perf-baseline.md` (neu).
- **Expected behavior:** SSH-Inspection `\d audit_log`. Pre-V8.11-Baseline 2 Queries.
- **Verification:** Baseline + Index-Audit dokumentiert.
- **Dependencies:** SLC-903 done

### MT-2: MIG-048 Migration mit Policy-Setzung + ggf. CREATE INDEX
- **Goal:** Idempotente Migration mit Policy-Pattern aus Klasse E.
- **Files:** `sql/migrations/048_v8_11_slc_904_klasse_e_audit_log.sql`
- **Expected behavior:** Migration-Body enthaelt: Helper-Existenz-Guard, DROP old policies, CREATE 4 neue Policies, ggf. CREATE INDEX IF NOT EXISTS (idempotent).
- **Verification:** Re-Apply idempotent. Helper-Function 2 → 1.
- **Dependencies:** MT-1

### MT-3: Vitest RLS-Matrix-File mit service_role-Block
- **Goal:** Test-File analog SLC-901-Pattern + zusaetzlicher service_role-Test-Block.
- **Files:** `cockpit/__tests__/rls/v8-11-slc-904-rls-matrix.test.ts`
- **Expected behavior:**
  - 12 Tests Admin/Teamlead/Member × 4 Ops (mit angepassten Expectations)
  - 4 Tests service_role × 4 Ops (alle PASS via `SET LOCAL ROLE service_role`)
  - 2 DSGVO-Art-15-Tests: actor-self SELECT own-row PASS, actor-self SELECT other-actor 0 Rows
  - Total ~18 Tests
- **Verification:** Vitest GREEN 18/18 im Sidecar.
- **Dependencies:** MT-2

### MT-4: Code-Audit cockpit/src/lib/audit.ts Caller
- **Goal:** Pruefen dass alle audit-Write-Pfade via createAdminClient laufen.
- **Files:** `docs/AUDIT_CRON_V811.md` (Section "Klasse E (audit_log)").
- **Expected behavior:**
  - `grep -rn "from('audit_log')" cockpit/src/` — Liste aller Caller
  - `grep -rn "logAuditEvent\|audit\.log\|insertAuditLog" cockpit/src/` — Helper-Caller
  - Pro Treffer: client-Variante (`createServerClient` vs `createAdminClient`) dokumentieren
  - Bei `createServerClient` als Schreiber: FIX-NEEDED mit kurzer Refactor-Skizze
- **Verification:** Section "Klasse E" mit Liste + OK/FIX-NEEDED. Bei FIX-NEEDED: Pflicht-Sub-MT in dieser Slice.
- **Dependencies:** MT-2

### MT-5: Post-MIG-048 EXPLAIN ANALYZE Re-Run + Done-Gate
- **Goal:** 2 Queries re-messen post-MIG-048. Done-Gate-Check.
- **Files:** `qa/SLC-904-perf-baseline.md` (Erweiterung Post-V8.11).
- **Expected behavior:** 2 Post-Werte ohne Threshold-Violation. Done-Gate-SQL: `list_tables_with_authenticated_full_access()` = 1 Row.
- **Verification:** Done-Gate = 1.
- **Dependencies:** MT-2, MT-3, MT-4

### MT-6: Records-Sync + Live-Smoke + RPT-591/RPT-592
- **Goal:** Records aktualisieren. Live-Smoke 2 Pfade. 2 Reports.
- **Files:** `slices/INDEX.md`, `planning/backlog.json`, `docs/STATE.md`, `docs/MIGRATIONS.md`, `reports/RPT-591.md`, `reports/RPT-592.md`
- **Verification:** Records updated. Live-Smoke 2/2 PASS-LIVE.
- **Dependencies:** alle vorherigen MTs

## Pre-Conditions

- SLC-903 done (Helper-Function deployed in SLC-902 + Klasse-C-Pattern etabliert)
- audit_log Seed-Daten vorhanden (mind. einige Rows mit `actor_id = TEST_MEMBER_1`, einige mit anderen actor_ids)

## Pattern-Reuse

- Migration-Pattern aus SLC-901..903
- Test-Pattern aus SLC-901 mit Erweiterung um service_role-Test-Block
- DSGVO-Art-15-Pattern aus Onboarding-Plattform (falls dort etabliert) — Cross-Repo-Check optional

## Risks / Assumptions

- **R-904-1 (Medium):** Bestehende Audit-Caller schreiben via `createServerClient()` (User-Session). Nach Apply schlaegt das mit RLS-Violation fehl. Mitigation: MT-4 Audit + ggf. Hotfix-Sub-MT mit Refactor zu `createAdminClient()`. Schwellwert: bei >3 Caller-Fixes wird das eigenes Slice SLC-904-fix.
- **R-904-2 (Medium):** Performance auf `WHERE actor_id = $1 ORDER BY created_at DESC` ohne Index auf `(actor_id, created_at DESC)` koennte Sequential-Scan werden. Mitigation: MT-1 Index-Audit. Bei fehlendem Index: CREATE INDEX in MIG-048.
- **R-904-3 (Low):** Audit-UI fuer DSGVO-Art-15 existiert ggf. noch nicht (RLS erlaubt Self-Read, aber UI muss noch gebaut werden). Aus Scope — V8.11 ist RLS-Sweep, nicht UI. V9 wuerde DSGVO-Self-Service-UI bauen.
- **A-904-1:** `cockpit/src/lib/audit.ts` existiert und ist die Single-Source-of-Truth fuer Audit-Inserts.

## Out of Scope

- DSGVO-Art-15-Self-Service-UI (V9-Thema)
- audit_log-Retention-Cron (separate Slice ggf. V8.12 oder V9)
- Audit-Search/Filter-Erweiterungen
- knowledge_chunks (SLC-905)

## Related

- `docs/ARCHITECTURE.md` V8.11-Addendum Klasse E
- `docs/DECISIONS.md` DEC-272-Verfeinerung, DEC-269, DEC-266
- `cockpit/src/lib/audit.ts` (Audit-Helper Source-of-Truth)
- Pattern-Quelle: SLC-901..903

## Next Slice

SLC-905 — Klasse D knowledge_chunks (Schema-ALTER + Backfill + Function-Erweiterung + 100% Coverage).
