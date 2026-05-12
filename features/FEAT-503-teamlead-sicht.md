# FEAT-503 — Teamlead-Rolle mit Teamsicht (Aggregat + Drilldown)

## Status
planned

## Version
V7

## Abhaengig von
FEAT-502 (Rollen-Modell + Ownership + RLS-Foundation muss zuerst stehen).

## Problem
Sobald Member eigene Daten haben (FEAT-502), braucht der Teamlead eine Sicht ueber das Team:
- Wo steht jeder Member in seiner Pipeline?
- Wer hat Backlog/Underperformance?
- Welche Mitarbeiter brauchen Unterstuetzung?

Aktuelles V6.6-Cockpit ist Single-User. Es zeigt Pipeline-Sum, Aktivitaeten, KI-Workspace-Berichte fuer EINEN User. Teamlead braucht zwei orthogonale Sichten:
1. **Aggregat** — Roll-Up ueber das ganze Team (Sum/Avg/Count).
2. **Drilldown** — read-only-Sicht in das Member-Cockpit (was sieht Mitarbeiter X gerade in seinem Mein Tag?).

## Goal
Teamlead bekommt unter `/team` (neue Top-Level-Sektion in Sidebar) das Aggregat-Cockpit. Pro Member ist ein "Cockpit oeffnen"-Link da, der das individuelle Member-Cockpit read-only oeffnet (mit Sidebar-Indikator "Du siehst Member X").

## Users
- **Teamlead (primaer):** sieht `/team`-Aggregat + kann pro Member drillen.
- **Admin (sekundaer):** sieht `/team` ebenfalls (Default-Verhalten = wie Teamlead, Scope = alle Teams).
- **Member:** sieht `/team` NICHT (Sidebar-Eintrag rollen-konditional ausgeblendet).

## In Scope V1 (V7)

### `/team` — Aggregat-Cockpit (neue Page)
Layout analog `/cockpit` (KI-Analyse-Cockpit aus V6.6, FEAT-665), aber gefiltert auf Team-Scope:
- **KPI-Header:**
  - Team-Pipeline-Sum (Sum aller offenen Deal-Total-Gross ueber Team-Member).
  - Team-Aktivitaeten-Count (Faelligkeiten der Woche).
  - Team-Conversion-Rate (won/(won+lost) ueber letzte 30 Tage).
  - Team-Backlog-Indikator (Anzahl Member mit ueberfaelligen Aufgaben).
- **Mitglieder-Tabelle:**
  - Zeilen: alle Team-Member.
  - Spalten: Pipeline-Sum, offene Aktivitaeten, Letzter Login, Backlog-Count, "Cockpit oeffnen"-Link.
  - Sortierbar nach jeder Spalte.
- **KI-Workspace-Hybrid-Block (analog V6.6):**
  - Berichts-Buttons "Wer hat Underperformance?", "Wer brennt aus?", "Wo stocken Deals im Team?".
  - Frage-Eingabe in natuerlicher Sprache, antwortet auf Team-Daten (nicht Owner-eigene).

### Member-Drilldown (`/team/[user_id]/cockpit`)
- Routes alle bestehenden Workspaces als **read-only** mit `?as_member=<user_id>`-Modus:
  - `/team/[user_id]/mein-tag`
  - `/team/[user_id]/pipeline`
  - `/team/[user_id]/aktivitaeten`
- Banner oben: "Du siehst Member X (read-only) — zurueck zu deinem Cockpit".
- Alle Mutate-Buttons (Anlegen, Bearbeiten, Loeschen) sind disabled oder ausgeblendet.
- Audit-Log-Eintrag bei Drill-Down: `view_as`-Event mit `viewer_id` + `target_user_id`.

### Sidebar-Erweiterung (Teamlead/Admin)
- Neue Sektion **"TEAM"** in Sidebar (zwischen ANALYSE und ARBEITSBEREICHE) — nur Teamlead/Admin sichtbar:
  - "Team-Cockpit" → `/team`
  - "Team-Verwaltung" → `/settings/team` (aus FEAT-502)

### Aggregat-Performance
- Aggregat-Queries auf Team-Daten muessen unter 500ms bleiben fuer Teams bis 20 Member.
- Falls noetig: Materialized View `team_kpi_snapshot` mit Refresh nach jeder Insert/Update auf Kerntabellen (analog V6.6 ki_workspace_report).

## Out of Scope V1 (V7)
- **Team-Targets / Quoten** (Soll-Pipeline-Sum pro Member, Forecast-Funnel) — V7.5 oder V8.
- **Comparative Reports** (Member A vs. Member B vis-a-vis) — V7.5.
- **Direkte Aktionen auf Member-Daten** durch Teamlead (z.B. "Aktivitaet fuer Member erstellen") — V7-Member-Drilldown ist read-only.
- **Team-Chat / Team-Notes** — V8+.
- **Team-Goal-Setting** mit historischen Trends — V7.5.

## Constraints
- **Read-only-Garantie:** Drilldown darf KEINEN Mutate-Pfad oeffnen. Server Actions im read-only-Mode muessen 403 antworten.
- **RLS-Conformance:** Aggregat-Query nutzt `auth.uid()`-Owner-Lookup ueber Team-Member-Set; KEINE service-role-Bypass-Hacks.
- **DSGVO:** `view_as`-Audit-Log macht jeden Teamlead-Einblick in Member-Daten nachvollziehbar.
- **Style Guide V2:** alle neuen Pages folgen Brand-Tokens (V6.5 Theming-Foundation).

## Risks / Assumptions
- **R1 — Aggregat-Performance:** Bei Mitarbeiter-Counts >20 koennte naive Aggregat-Query lahmen. Materialized View als Fallback.
- **R2 — Read-only-Bypass:** Bestehende Server Actions muessen einen einheitlichen `assertNotReadOnlyMode()`-Guard bekommen. Audit-Pfad notwendig.
- **R3 — KI-Workspace-Hybrid:** Team-Scope-Berichte muessen anderen Bedrock-Prompt nutzen als Member-eigene Berichte. Prompts duplizieren oder parametrisieren.
- **A1 — Drilldown via URL-Path ist sauberer als Session-Switching:** keine "Switch User"-Funktion noetig, weil `/team/[user_id]/...` direkt routet.

## Success Criteria
- Teamlead-Session unter `/team` zeigt Aggregat-KPIs ueber alle Team-Member innerhalb von <500ms (Cold-Hit).
- Member-Tabelle ist sortierbar, Drilldown-Link funktioniert.
- Drilldown `/team/[user_id]/mein-tag` zeigt Member-Sicht read-only mit Banner, Mutate-Buttons sichtbar disabled.
- Member-Session unter `/team` liefert 404 (Sidebar-Eintrag versteckt, Route geschuetzt).
- Audit-Log enthaelt `view_as`-Eintraege fuer jeden Drilldown.
- KI-Workspace-Hybrid auf `/team` antwortet auf Team-Daten, nicht auf Owner-eigene.
- Vitest-Suite + Browser-Smoke fuer Teamlead-Sicht + Member-Drilldown PASS.

## Open Questions (fuer /architecture)
- Q1 — Aggregat-Query ueber `deals JOIN profiles ON owner_user_id = profile.id WHERE profile.team_id = ?` reicht oder braucht Materialized View?
- Q2 — Drilldown-Mode: Server-side via `searchParams.as_member` oder Client-side via Context-Provider?
- Q3 — Mutate-Lockdown: zentraler Middleware-Guard oder pro Server Action ein `assertNotReadOnlyMode(ctx)`?
- Q4 — Win/Loss-Auto-Trigger (V6.6 FEAT-666): bleibt pro Owner oder team-aware?
- Q5 — Cockpit (V6.6 FEAT-665) bekommt Toggle "eigene Sicht / Team-Sicht" oder bleibt strikt eigene Sicht + separate `/team`-Page?
- Q6 — Was sieht ein Teamlead, dessen Team leer ist (keine Member zugeordnet)? Empty-State-Design.

## Acceptance
- `/team`-Page live mit KPI-Header + Mitglieder-Tabelle + KI-Workspace-Hybrid.
- Drilldown read-only auf 3 Member-Pages (Mein Tag, Pipeline, Aktivitaeten).
- Sidebar-Sektion "TEAM" rollen-konditional sichtbar.
- view_as-Audit-Trail aktiv.
- Performance <500ms fuer Teams bis 20 Member.
