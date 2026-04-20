# SLC-609 — Tages-Aktivitaets-KPIs

## Slice Info
- Feature: FEAT-603
- Priority: High
- Estimated Effort: 1 Tag
- Dependencies: SLC-601 (Schema)

## Goal

Definierbare Tages-Sollwerte fuer Aktivitaeten. Automatische IST-Berechnung aus bestehenden DB-Daten (activities, meetings, deals). Kein manuelles Tracking.

## Scope

- DB: activity_kpi_targets Tabelle (user_id, kpi_key, daily_target, active)
- Vordefinierte KPI-Keys: calls, meetings, deals_moved, deals_created, deals_stagnant
- Server Actions: CRUD fuer Targets + IST-Berechnung pro Tag
- Settings-UI: /settings/activity-kpis oder Section auf /performance/goals
- IST-Queries gegen bestehende Tabellen:
  - calls: activities WHERE type='call' AND created_at=today
  - meetings: meetings WHERE date=today AND status!='cancelled'
  - deals_moved: deals mit stage_id Aenderung heute (via activities oder updated_at)
  - deals_created: deals WHERE created_at=today
  - deals_stagnant: deals WHERE status='active' AND letzte Activity > X Tage

## Out of Scope

- E-Mail-Tracking als KPI (User will das nicht)
- Automatische Ziel-Empfehlung basierend auf historischen Daten (spaeter)

## Acceptance Criteria

1. activity_kpi_targets Tabelle existiert mit RLS + GRANTs
2. User kann Tages-Sollwerte definieren (z.B. 5 Telefonate, 2 Meetings, 10 Deal-Bewegungen)
3. getDailyActivityKpis() liefert Soll + IST pro KPI-Key fuer heute
4. getWeeklyActivityKpis() liefert aggregierte Wochen-Werte
5. IST-Werte kommen automatisch aus bestehenden Tabellen
6. npm run build gruen
