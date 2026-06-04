# SLC-901 Performance-Baseline — Pre-V8.11 vs Post-MIG-045

**Datum:** 2026-06-04
**Test-DB:** Coolify-Supabase 91.98.20.191 (`supabase-db-k9f5pn5upfq7etoefb5ukbcg-*`)
**Test-UUID:** `96322a0a-be2d-49e1-ba0d-03c4de1f1440` (Founder Admin)
**DEC-266 Threshold:** `max(100ms absolut, 10x Pre-V8.11-Baseline)`

## Pre-Check Schema (MT-1)

```sql
SELECT table_name, column_name, is_nullable FROM information_schema.columns
 WHERE table_schema='public' AND table_name IN
   ('user_settings','kpi_snapshots','goals','activity_kpi_targets')
   AND column_name='user_id';
```

| Table | Column | Nullable |
|---|---|---|
| activity_kpi_targets | user_id | NO |
| goals | user_id | NO |
| kpi_snapshots | user_id | NO |
| user_settings | user_id | NO |

**goals.user_id NULL-Count:** trivial 0 (NOT NULL constraint). AC-901-1 erfuellt — keine Team-Goals existieren in V8.11. Klassifizierung Klasse A bleibt korrekt.

**Row-Counts (Cardinality-Kontext):**

| Table | Rows |
|---|---|
| user_settings | 8 |
| kpi_snapshots | 315 |
| goals | 3 |
| activity_kpi_targets | 5 |

## Pre-V8.11-Baseline (MT-1, vor MIG-045)

| # | Query | Execution Time | Plan |
|---|---|---|---|
| Q1 | `SELECT * FROM user_settings WHERE user_id = <test-uuid>` | **0.073 ms** | Index Scan using `user_settings_pkey` |
| Q2 | `SELECT * FROM kpi_snapshots WHERE user_id = <test-uuid> ORDER BY snapshot_date DESC LIMIT 30` | **0.074 ms** | Index Scan using `idx_kpi_snapshots_date`, Filter on user_id |
| Q3 | `SELECT * FROM goals WHERE user_id = <test-uuid> AND status = 'active'` | **0.802 ms** | Bitmap Heap Scan, Bitmap Index Scan on `idx_goals_status` |
| Q4 | `SELECT * FROM activity_kpi_targets WHERE user_id = <test-uuid>` | **0.156 ms** | Bitmap Heap Scan, Bitmap Index Scan on `idx_activity_kpi_targets_unique` |
| Q5 | `SELECT COUNT(*) FROM kpi_snapshots WHERE created_at >= NOW() - INTERVAL '30 days'` | **0.345 ms** | Seq Scan (181 rows estimated, 315 total) |

**Notes:**
- Alle 4 Tabellen haben passende user_id-Indizes (PK oder dedizierter Index). Q5 ist Seq Scan (kein created_at-Index, akzeptabel bei N=315).
- Pre-V8.11-Policy `authenticated_full_access` ist `USING(true)` und filtert nichts (Plan zeigt keinen Policy-Overhead).
- DEC-266 Thresholds pro Query absolut:
  - Q1: max(100ms, 0.73ms) = 100ms
  - Q2: max(100ms, 0.74ms) = 100ms
  - Q3: max(100ms, 8.02ms) = 100ms
  - Q4: max(100ms, 1.56ms) = 100ms
  - Q5: max(100ms, 3.45ms) = 100ms

Faktisch ist die 100ms-Untergrenze in allen 5 Faellen bindend.

## Post-V8.11 Re-Run (MT-5, nach MIG-045-Apply)

_Wird in MT-5 nach Migration-Apply ergaenzt._

## Threshold-Verdict

_Wird in MT-5 entschieden. Bei Violation: Index-Audit + Index-DDL als Patch ans Ende MIG-045 anhaengen + Re-Apply._
