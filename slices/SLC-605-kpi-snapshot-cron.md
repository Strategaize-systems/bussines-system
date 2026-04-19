# SLC-605 — KPI-Snapshot-Cron

## Slice Info
- Feature: FEAT-604
- Priority: High
- Estimated Effort: 1 Tag
- Dependencies: SLC-601 (Schema)

## Goal

Taeglicher Cron-Job der KPI-Snapshots erstellt. Idempotent (UPSERT). Snapshot-Query-Funktionen fuer Performance-Cockpit.

## Scope

- API-Route: /api/cron/kpi-snapshot (POST, CRON_SECRET-Auth)
- KPI-Berechnung: 7 Basis-KPIs + Pro-Produkt-KPIs
- UPSERT-Logik (Idempotenz via Unique Index)
- Server Actions: getSnapshotTrend, getSnapshotComparison
- Cron-Job-Konfiguration (Dokumentation fuer Coolify)

## Out of Scope

- Cron-Job tatsaechlich in Coolify anlegen (User macht das manuell)
- Woechentliche/monatliche Aggregation als separate Tabelle (on-demand berechnet)

## Acceptance Criteria

1. /api/cron/kpi-snapshot erstellt Snapshots fuer alle KPI-Typen
2. Doppelter Aufruf am selben Tag → UPSERT, kein Duplikat
3. Pro-Produkt-KPIs werden erstellt wenn Produkt-Zuordnungen existieren
4. CRON_SECRET-Authentifizierung funktioniert
5. getSnapshotTrend liefert Trend-Daten fuer N Tage/Wochen/Monate
6. getSnapshotComparison liefert aktuelle vs. Vorperiode
7. `npm run build` gruen

## QA-Fokus

- Idempotenz: Zweimal aufrufen → gleiche Anzahl Rows
- Korrektheit: KPI-Werte manuell nachpruefen
- Edge Case: Keine Deals → Snapshots mit Wert 0
- Edge Case: Keine Produkt-Zuordnungen → keine Pro-Produkt-Snapshots

### Micro-Tasks

#### MT-1: KPI-Berechnungs-Queries
- Goal: SQL-Queries fuer alle 9 KPI-Typen
- Files: `lib/goals/kpi-queries.ts`
- Expected behavior: calculateRevenueWon, calculateDealCountWon, calculateWinRate, calculatePipelineWeighted, calculatePipelineUnweighted, calculateAvgDealValue, calculateActivityCount, calculateProductRevenue, calculateProductDealCount. Jede Funktion liefert einen numerischen Wert.
- Verification: `npm run build` gruen
- Dependencies: none

#### MT-2: Cron API-Route
- Goal: /api/cron/kpi-snapshot POST-Endpoint
- Files: `app/api/cron/kpi-snapshot/route.ts`
- Expected behavior: CRON_SECRET pruefen. Fuer jeden KPI-Typ: Wert berechnen, UPSERT in kpi_snapshots (ON CONFLICT DO UPDATE). Fuer jedes aktive Produkt: product_revenue + product_deal_count. Response: { snapshotsCreated: N, date: "YYYY-MM-DD" }.
- Verification: Manueller curl-Aufruf, DB pruefen
- Dependencies: MT-1

#### MT-3: Snapshot-Query Server Actions
- Goal: Trend- und Vergleichs-Queries fuer das Performance-Cockpit
- Files: `app/actions/kpi-snapshots.ts`
- Expected behavior: getSnapshotTrend(kpiType, days) → [{date, value}]. getSnapshotComparison(kpiType, currentPeriodStart, previousPeriodStart) → {current, previous, changePercent}.
- Verification: `npm run build` gruen
- Dependencies: MT-2
