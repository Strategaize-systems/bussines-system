# SLC-705 — Team-Aggregat-Cockpit (/team Page mit KPIs + Mitglieder-Tabelle + KI-Workspace-Hybrid)

## Metadata
- **Slice ID:** SLC-705
- **Version:** V7
- **Feature:** FEAT-503 (Teamlead-Rolle mit Teamsicht)
- **Status:** planned
- **Priority:** High
- **Created:** 2026-05-12
- **Estimated Effort:** ~4-6h
- **Delivery Mode:** internal-tool
- **Worktree-Isolation:** skipped
- **Architecture:** DEC-187 (direkter JOIN, kein Materialized View V7-Start), DEC-185 (KI-Workspace team-shared)
- **Reihenfolge-Pflicht:** **nach SLC-701/702/704** — Aggregat-Query nutzt RLS-Helper-Functions + Sidebar-TEAM-Sektion + owner-wired Records. Vor SLC-706 (Drilldown-Links zeigen auf SLC-706-Routes).

## Goal

Teamlead bekommt `/team`-Page als Aggregat-Cockpit ueber das eigene Team. KPI-Header (Pipeline-Sum, Aktivitaeten-Count, Conversion-Rate, Backlog-Indikator). Sortierbare Mitglieder-Tabelle. KI-Workspace-Hybrid-Block mit Team-Scope-Berichten ("Wer hat Underperformance?", "Wer brennt aus?", "Wo stocken Deals im Team?"). Plus Performance-Smoke gegen 5-Member-Test-Team aus Seed-Script — Echtmessung vor Release entscheidet ueber Materialized-View-Fallback.

## Scope

**In Scope:**
- `cockpit/src/app/(authenticated)/team/page.tsx` (NEU) — Server-Component, `assertRole(['admin','teamlead'])`, lädt Team-Aggregat-Daten
- `cockpit/src/app/(authenticated)/team/team-kpi-header.tsx` (NEU) — 4 KPI-Cards (Pipeline-Sum, Aktivitaeten-Count, Conversion-Rate, Backlog-Indikator)
- `cockpit/src/app/(authenticated)/team/team-members-aggregat-table.tsx` (NEU) — Sortierbare Mitglieder-Tabelle mit Pipeline-Sum + Open-Activities + Last-Login + Backlog + Cockpit-Oeffnen-Link
- `cockpit/src/app/(authenticated)/team/team-ki-workspace.tsx` (NEU) — KI-Workspace-Hybrid-Wrapper mit Team-Scope-Reports (3-5 Berichts-Buttons)
- `cockpit/src/lib/team/aggregate-queries.ts` (NEU) — SQL-Query-Helpers fuer Team-KPIs + Mitglieder-Liste + Bedrock-Context-Builder
- `cockpit/src/lib/ki-workspace/reports/team-*.ts` (NEU) — Server-Action-Files fuer 3-5 Team-Berichte
- `cockpit/scripts/aggregate-perf-smoke.ts` (NEU) — Performance-Smoke-Script gegen Seed-Daten, misst p95
- `cockpit/__tests__/team/aggregate-queries.test.ts` (NEU) — Vitest fuer Aggregat-Query-Korrektheit
- `cockpit/__tests__/playwright/team-cockpit.spec.ts` (NEU) — Browser-Smoke: Teamlead sieht /team, Member sieht Redirect

**Out of Scope:**
- Drilldown-Routes selbst → SLC-706 (Cockpit-Oeffnen-Link ist Stub auf /team/[user_id]/mein-tag der erst SLC-706 implementiert)
- Bulk-Reassign-Werkzeug → SLC-707
- Materialized View team_kpi_snapshot — NICHT in V7-Start (DEC-187), nur Fallback-Vorbereitung dokumentiert wenn Performance verletzt
- Comparative-Reports (Member A vs. B) → V7.5

## Acceptance Criteria

**AC1 (Aggregat-Query Korrektheit):** `getTeamAggregat()` returnt fuer Teamlead-Session:
- KPIs: Sum(deal.total_gross WHERE status='open' AND owner IN team-member-ids), Count(activities WHERE due_at < tomorrow AND status='open' AND owner IN team), Conversion-Rate (won/(won+lost) ueber letzte 30d), Backlog-Count (Member mit overdue_activities > 0)
- Pro Mitglied: pipeline_sum, open_deals, open_activities, last_login_at, overdue_count, user_id, display_name, role

Vitest mit Seed-Daten verifiziert Sums + Counts.

**AC2 (Performance <500ms p95 fuer 5-Member-Team):** `aggregate-perf-smoke.ts` misst Aggregat-Query-Dauer ueber 100 Iterationen gegen Seed-Daten (5 Member × 100 Deals × 500 Activities). p95 muss <500ms sein.
- Falls VERLETZT: Slice geht in /qa als "needs-rework" → Materialized-View-Fallback-Implementierung in einem zusaetzlichen MT (SLC-705b) oder als Hotfix.
- Falls OK: dokumentiert in RPT mit konkretem Messwert.

**AC3 (Page-Render Teamlead):** Teamlead loggt ein, navigiert zu `/team`, sieht KPI-Header + Mitglieder-Tabelle + KI-Workspace-Block. Member-Session auf `/team` redirected zu `/mein-tag` (dank SLC-702 middleware).

**AC4 (Sortierung Mitglieder-Tabelle):** Tabelle sortierbar nach jeder Spalte (Pipeline-Sum, Open-Deals, Open-Activities, Last-Login). Default-Sort: pipeline_sum DESC. Sortierung clientseitig (kein Re-Fetch). Vitest fuer Sort-Logik.

**AC5 (KI-Workspace-Hybrid Team-Scope):** Block mit 3 Berichts-Buttons (gem. FEAT-503):
- "Wer hat Underperformance?" → Bedrock-Call mit Team-Daten-Snapshot, returnt strukturierter Markdown
- "Wer brennt aus?" → Bedrock-Call mit overdue-counts pro Member
- "Wo stocken Deals im Team?" → Bedrock-Call mit stale-Deals-Liste

Plus Frage-Input fuer freie NL-Anfrage. Bedrock-Prompt enthält Team-Member-Liste mit aggregierten Metriken (nicht Owner-eigene Sicht). 5-Min-Cache analog V6.6.

**AC6 (Empty-State):** Teamlead in leerem Team (keine Member zugeordnet) sieht Empty-State-Card "Noch keine Team-Mitglieder. Lade jemanden ein in [Team-Verwaltung]." mit Link zu /settings/team.

**AC7 (Drilldown-Stub-Link):** Pro Mitglied-Row ist ein "Cockpit oeffnen"-Link auf `/team/[user_id]/mein-tag`. In SLC-705 ist Ziel-Route noch nicht implementiert (404-Stub erwartet bis SLC-706). Link funktional, nur Ziel-Page ist Placeholder.

**AC8 (Style Guide V2):** Brand-Tokens fuer alle Komponenten. KPI-Cards-Pattern aus V6.6 Cockpit (FEAT-665) wiederverwenden. Tabelle-Pattern aus /settings/team (SLC-703).

**AC9 (TSC + Vitest + Build + Lint):** Alle Outputs clean. Bestehende + V7-Foundation-Tests bleiben gruen.

**AC10 (Live-Smoke nach Coolify-Redeploy):** Teamlead-Test-User (`seed-teamlead@test`) loggt ein, sieht /team mit 5 Mitgliedern + KPIs gem. Seed-Daten. Klick auf KI-Bericht "Wer hat Underperformance?" returnt nicht-leere Bedrock-Antwort innerhalb 10s. Member-Session-Direkt-URL `/team` redirected. Performance-Smoke-Script-Run gegen Hetzner: p95 dokumentiert.

## Reuse

- KI-Workspace-Foundation aus V6.6 (FEAT-661 — `KIWorkspace.tsx`, `reports/registry.ts`, `cache.ts`)
- KPI-Card-Pattern aus V6.6 Cockpit (FEAT-665)
- Brand-Tokens aus V6.5 Theming-Foundation
- SQL-Helper-Functions aus SLC-701 (`get_my_team_id()`)
- shadcn `<Table>` mit Sort-Header-Pattern
- Bedrock-Client aus V3 (`cockpit/src/lib/bedrock/client.ts`)

## Risks

- **R1 — Aggregat-Performance bei groesseren Teams:** Wenn echtes Kunden-Team >20 Member, koennte Query lahmen. **Mitigation:** AC2 misst gegen 5-Member-Seed (Production-Reality fuer Pre-Seed-Pilots). Falls Production-Team >20: Materialized-View-Fallback (V7.x).
- **R2 — Bedrock-Prompt Team-Context-Size:** Wenn Team-Daten-Snapshot in Prompt-Length-Limit (200k Tokens) sprengt, fehlt Context. **Mitigation:** Aggregat-Summary statt Raw-Rows in Prompt. KI-Prompt-Template-Test mit 20-Member-Mock.
- **R3 — Sortier-Drift:** Wenn Sort-Logik clientseitig falsch implementiert, koennen Spalten Inkonsistenz zeigen. **Mitigation:** Vitest fuer Sort-Vergleicher mit Edge-Cases (NULL-Values).
- **R4 — Empty-State Member-Count = 0:** Edge-Case wenn neuer Teamlead noch keine Mitglieder hat. **Mitigation:** AC6 explizit + Vitest-Case.
- **R5 — KI-Workspace-Cache-Drift bei Owner-Aenderung:** Team-Cache wird nicht invalidiert bei Bulk-Reassign. **Mitigation:** Akzeptiert (5-Min-TTL), Bulk-Reassign-Werkzeug in SLC-707 kann `revalidatePath('/team')` aufrufen.

## Verification Strategy

- **Pre:** Verifizieren dass Seed-Script (SLC-701) eingespielt ist. `getTeamAggregat`-SQL-Snippet manuell gegen TEST_DATABASE_URL pruefen.
- **Per-MT:** siehe Micro-Tasks
- **Slice-Level:** TSC + Build + Lint + Vitest + Playwright + Performance-Smoke + Live-Smoke Teamlead-Session
- **QA-Pflicht:** /qa nach Slice — verifiziert AC1..AC10, Performance-Messung dokumentiert, KI-Workspace-Antwort-Smoke

---

## Micro-Tasks

### MT-1: Aggregate-Query-Helpers
- Goal: SQL-Query-Layer fuer Team-Daten.
- Files: `cockpit/src/lib/team/aggregate-queries.ts` (NEU), `cockpit/__tests__/team/aggregate-queries.test.ts` (NEU)
- Expected behavior: `getTeamKPIs()`, `getTeamMembers()`, `getTeamBedrockContext()` als async Functions. Nutzen RLS-implicit-filter (Teamlead-Session sieht via RLS nur eigene Team-Daten ohne explicit team_id-Filter im SQL).
- Verification: Vitest mit Seed-Daten verifiziert Sums + Counts.
- Dependencies: SLC-701 abgeschlossen (Seed-Daten verfuegbar)

### MT-2: /team Page Server-Component + KPI-Header
- Goal: Page-Skeleton + KPI-Cards.
- Files: `cockpit/src/app/(authenticated)/team/page.tsx` (NEU), `cockpit/src/app/(authenticated)/team/team-kpi-header.tsx` (NEU)
- Expected behavior: `await assertRole(['admin','teamlead'])` first line. KPI-Header rendert 4 Karten mit `getTeamKPIs()`-Daten.
- Verification: Manueller Render mit Teamlead-Test-Session zeigt 4 KPIs.
- Dependencies: MT-1

### MT-3: Mitglieder-Tabelle (sortierbar)
- Goal: Sortierbare Tabelle.
- Files: `cockpit/src/app/(authenticated)/team/team-members-aggregat-table.tsx` (NEU)
- Expected behavior: Client-Component mit `useMemo`-Sort-Logik. Sort-Header-Click toggelt asc/desc/none. Default pipeline_sum DESC.
- Verification: Vitest fuer Sort-Logik + Browser-Render-Test.
- Dependencies: MT-2

### MT-4: KI-Workspace-Wrapper mit Team-Scope-Reports
- Goal: KI-Workspace + 3 Berichts-Server-Actions.
- Files: `cockpit/src/app/(authenticated)/team/team-ki-workspace.tsx` (NEU), `cockpit/src/lib/ki-workspace/reports/team-underperformance.ts` (NEU), `team-burnout.ts` (NEU), `team-stale-deals.ts` (NEU)
- Expected behavior: Wrapper-Component um `<KIWorkspace>` mit context `team-cockpit`, 3 Reports im Registry. Server-Actions bauen Bedrock-Prompt mit Team-Context, callen Bedrock, returnt Markdown.
- Verification: Vitest fuer Prompt-Builder. Manueller Smoke mit Test-Bedrock-Call.
- Dependencies: MT-1, MT-2

### MT-5: Empty-State + Drilldown-Stub-Link
- Goal: Empty-Case + Cockpit-Oeffnen-Link.
- Files: `cockpit/src/app/(authenticated)/team/team-members-aggregat-table.tsx` (MOD)
- Expected behavior: Wenn keine Mitglieder: `<EmptyState>` mit Link zu /settings/team. Wenn Mitglieder: pro Row Cockpit-Oeffnen-Link auf `/team/[user_id]/mein-tag`.
- Verification: Vitest Empty-State-Render-Test.
- Dependencies: MT-3

### MT-6: Performance-Smoke-Script
- Goal: p95-Messung.
- Files: `cockpit/scripts/aggregate-perf-smoke.ts` (NEU)
- Expected behavior: Script connected gegen TEST_DATABASE_URL, fuehrt `getTeamKPIs()` 100x aus, misst Dauer, druckt p50/p95/p99 + Mean. Output: "Aggregate p95: 234ms (target <500ms)".
- Verification: Script-Run gegen Seed-Daten zeigt Messwert. Dokumentiert in Slice-RPT.
- Dependencies: MT-1

### MT-7: Playwright Browser-Smoke
- Goal: E2E-Smoke 2 Cases.
- Files: `cockpit/__tests__/playwright/team-cockpit.spec.ts` (NEU)
- Expected behavior: 
  - Teamlead loggt ein → /team → 4 KPIs sichtbar + Tabelle mit 5 Members
  - Member loggt ein → /team → Redirect zu /mein-tag (URL-Check)
- Verification: 2/2 PASS.
- Dependencies: MT-1..MT-5

### MT-8: TSC + Build + Lint + Test + Live-Smoke
- Goal: Slice-Closing.
- Files: keine neuen
- Expected behavior: Alle Outputs clean. User-Coolify-Redeploy. Live-Smoke Teamlead-Session + Performance-Messung gegen Hetzner (gegen Seed-Daten falls eingespielt, sonst gegen Production-Daten von User Immo).
- Verification: Slice-RPT dokumentiert Performance-Wert + 3 Browser-Smoke-Ergebnisse.
- Dependencies: MT-1..MT-7

---

## Open Technical Questions Answered

- **OTQ 1 (Performance-Smoke ohne Production-Daten):** Seed-Script aus SLC-701 + Performance-Smoke-Script (MT-6). 5-Member-Test-Team fuer V7-Pre-Seed-Pilot-Realitaet.
- **(Architecture Open Q1 Materialized View):** Per DEC-187 direkter JOIN als V7-Start. Fallback nur wenn AC2 verletzt — dann SLC-705b oder Hotfix nach /qa.

## QA-Fokus

- Aggregat-Query-Korrektheit gegen Seed-Daten
- Performance p95 <500ms dokumentiert
- 3 KI-Workspace-Reports liefern strukturierte Antworten
- Empty-State sauber
- Member-Redirect funktioniert
- TSC + Build + Lint clean

## Recommended Next Step nach SLC-705

**/qa SLC-705** — verifiziert AC1..AC10. Bei PASS: User-Coolify-Redeploy. Bei Live-PASS: weiter mit **/frontend SLC-706** (Drilldown-Routes).
