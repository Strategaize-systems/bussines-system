# SLC-902 — V8.11 Klasse B RLS-Performance Baseline

**Status:** Pre-V8.11 Baseline gemessen (MT-1). Post-MIG-046 Werte folgen in MT-5.
**Version:** V8.11 SLC-902
**Datum:** 2026-06-05
**DB:** Coolify-Postgres `supabase-db-k9f5pn5upfq7etoefb5ukbcg-065643061649` (Server 91.98.20.191)
**Pattern-Quelle:** `qa/SLC-901-perf-baseline.md` (SLC-901 Klasse A).
**Threshold (DEC-266):** `max(100ms, 10x-Baseline)` — Verletzung -> Index-Audit.

## Schema-Verify

Pre-Apply-Pflicht-Check: Keine `owner_user_id` / `user_id`-Spalte auf den 11 Klasse-B-Tabellen.

```sql
SELECT table_name, column_name FROM information_schema.columns
 WHERE table_schema='public'
   AND table_name = ANY(ARRAY['branding_settings','email_templates','payment_terms_templates',
                              'compliance_templates','vat_id_validations','pipelines',
                              'pipeline_stages','products','automation_rules',
                              'cadences','cadence_steps'])
   AND column_name IN ('owner_user_id','user_id');
-- (0 rows)
```

Verdict: **0 Rows** — alle 11 Tabellen sind Owner-less. Klasse-B-Annahme (SELECT all, Admin-mutate per DEC-271) bestaetigt.

## Pre-Apply Policy-Inventur (11 Klasse-B-Tabellen)

```sql
SELECT tablename, policyname FROM pg_policies
 WHERE schemaname='public'
   AND tablename = ANY(ARRAY[..11 Tabellen..])
 ORDER BY tablename, policyname;
```

| tablename | policyname |
|---|---|
| `automation_rules` | `automation_rules_full_access` |
| `branding_settings` | `authenticated_full_access` |
| `cadence_steps` | `authenticated_full_access` |
| `cadences` | `authenticated_full_access` |
| `compliance_templates` | `authenticated_full_access` |
| `email_templates` | `authenticated_full_access` |
| `payment_terms_templates` | `authenticated_full_access` |
| `pipeline_stages` | `authenticated_full_access` |
| `pipelines` | `authenticated_full_access` |
| `products` | `authenticated_full_access` |
| `vat_id_validations` | `authenticated_full_access` |

= 11 alte Policies (10 `authenticated_full_access` + 1 `automation_rules_full_access`).

**Pre-Apply Done-Gate loose** (`policyname LIKE '%_full_access' OR policyname='authenticated_full_access'`): **37 Rows** (von 37 nach MIG-045 — V8.11 startet V8.11-Drop-Pipeline mit 41 Pre-V8.11-Rows, davon -4 SLC-901, -11 SLC-902 → 26 nach MIG-046).

**Sec-Audit-Helper-Function `list_tables_with_authenticated_full_access()`**: NICHT vorhanden (Pre-Apply). Wird in MIG-046 deployed (DEC-274).

## Baseline-Queries (Pre-MIG-046)

Pro Query: `EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)`, `as postgres`-Rolle (BYPASSRLS — Seq-Scan dominiert wegen Mini-Datenmenge).

### Q1 — email_templates SELECT all

```sql
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT) SELECT * FROM email_templates;
```

- Plan: `Seq Scan on email_templates`
- rows=12 (geplante 190 — Statistik-Drift)
- Buffers: `shared hit=1`
- Planning Time: **0.933 ms**
- **Execution Time: 0.170 ms**

### Q2 — pipelines ORDER BY sort_order

```sql
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT) SELECT * FROM pipelines ORDER BY sort_order;
```

- Plan: `Sort -> Seq Scan on pipelines`
- rows=2
- Sort Method: `quicksort  Memory: 25kB`
- Planning Time: 0.510 ms
- **Execution Time: 0.158 ms**

### Q3 — products SELECT all

```sql
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT) SELECT * FROM products;
```

- Plan: `Seq Scan on products`
- rows=1
- Planning Time: 0.259 ms
- **Execution Time: 0.050 ms**

### Q4 — automation_rules WHERE status='active'

```sql
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT) SELECT * FROM automation_rules WHERE status = 'active';
```

- Plan: `Seq Scan on automation_rules  Filter: status='active'`
- rows=2 (geplant 1)
- Partial Index `idx_automation_rules_active` existiert (`btree(trigger_event, status) WHERE status='active'`), wird hier wegen Mini-Dataset NICHT gewaehlt (Planner waehlt Seq-Scan, kein Performance-Defekt)
- Planning Time: 2.462 ms
- **Execution Time: 0.409 ms**

### Q5 — cadence_steps JOIN cadences

```sql
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT) SELECT cs.* FROM cadence_steps cs JOIN cadences c ON cs.cadence_id = c.id;
```

- Plan: `Hash Join -> Seq Scan(cadence_steps) + Hash(Seq Scan(cadences))`
- rows=3
- Planning Time: 1.847 ms
- **Execution Time: 0.482 ms**

## Baseline-Tabelle (Pre-V8.11)

| ID | Query | Exec ms | Threshold (DEC-266) |
|---|---|---|---|
| Q1 | `SELECT * FROM email_templates` | **0.170** | max(100, 1.70) = 100ms |
| Q2 | `SELECT * FROM pipelines ORDER BY sort_order` | **0.158** | max(100, 1.58) = 100ms |
| Q3 | `SELECT * FROM products` | **0.050** | max(100, 0.50) = 100ms |
| Q4 | `SELECT * FROM automation_rules WHERE status='active'` | **0.409** | max(100, 4.09) = 100ms |
| Q5 | `SELECT cs.* FROM cadence_steps cs JOIN cadences c ON cs.cadence_id=c.id` | **0.482** | max(100, 4.82) = 100ms |

Wegen Mini-Datenmenge (1-12 Rows) ist die 100ms-Untergrenze maßgeblich. RLS-Policy-Overhead muss unter 100ms bleiben pro Query.

## Erwartung Post-MIG-046

- Plan-Hash kann sich aendern (USING(true)-Policy ist gleich teuer, INSERT/UPDATE/DELETE Plan bleibt unveraendert mit With-Check, da kein Filter im SELECT-Pfad).
- Execution-Time soll im selben Bereich bleiben (0.05 - 0.5 ms). Wenn ueber 100ms: Index-Audit (SLC-902 MT-5 Verdict).

## Verifizierung (MT-1 Done-Marker)

- [x] 11 Tabellen Owner-less verifiziert (0 owner_user_id / user_id Spalten)
- [x] Pre-Apply Policy-Inventur 11 Rows (10 `authenticated_full_access` + 1 `automation_rules_full_access`)
- [x] Pre-Apply Done-Gate loose: 37 (entspricht Spec)
- [x] 5 Baseline-Queries mit Exec-Times dokumentiert
- [x] Threshold-Berechnung pro Query gemacht
- [x] Sec-Audit-Helper-Function noch nicht deployed (wird MIG-046 erledigen)

**AC-902-7 PASS** (Pre-V8.11-Baseline gemessen + dokumentiert).
