# FEAT-641 — System-Stabilitaet & DSGVO-Hygiene

**Status:** planned
**Version:** V6.4
**Created:** 2026-05-07
**Sources:** RPT-331 Post-Launch-Review + V5.2 COMPLIANCE.md + V6.2 Slice-Plan RPT-310

## Purpose

Schliesst zwei konkrete Luecken die im Post-Launch-Review V6.2+V6.3 (RPT-331) sichtbar wurden und die vor erstem produktivem Sales-Flow geschlossen sein muessen.

## Scope

### Teil 1: ISSUE-057 FollowupEngine-Bug-Fix

**Symptom:** Cron-Log `[FollowupEngine] Open proposals query failed: column proposals.value does not exist` 3x in 16h Container-Logs.

**Root-Cause:** Schema-Drift seit V5.5/MIG-026 (2026-04-29). Engine-Code aus SLC-405 (V4) selektiert + sortiert auf `value`. Tatsaechliche Spalten sind `subtotal_net`, `tax_amount`, `total_gross`.

**Fix:**
- `cockpit/src/lib/ai/followup-engine.ts:194-208`: `value` -> `total_gross` an 2 Stellen (Select-String + order-Spalte).
- Vitest-Erweiterung: Pure-Function-Test fuer den Query-Builder mit Mock-Supabase-Client, oder Coverage ueber bestehende FollowupEngine-Tests falls vorhanden.
- Live-Smoke nach Deploy: Followup-Cron triggern, Container-Log inspizieren — kein "column proposals.value" mehr.

**Aufwand:** ~30 Minuten Code, ~1h mit Vitest + Smoke.

### Teil 2: BL-423 Click-Log-Cleanup-Cron

**Symptom:** `campaign_link_clicks`-Tabelle waechst seit V6.2-Release unbegrenzt. Geplante 90-Tage-Retention (DSGVO konsistent zu V5.2 COMPLIANCE.md, Pattern wie email_message-Retention) wurde im V6.2-Slice-Plan dokumentiert (BL-423), aber nie implementiert.

**Implementation:**
- Neuer Cron-Endpoint `cockpit/src/app/api/cron/click-log-cleanup/route.ts`
- POST mit `verifyCronSecret` (Pattern wie `expire-proposals` V5.5)
- DELETE FROM campaign_link_clicks WHERE created_at < NOW() - INTERVAL '90 days'
- Audit-Log-Eintrag bei jedem Lauf: `action='click_log_cleanup'`, `changes={ deleted_count, oldest_kept }`
- Idempotent: kein Failure wenn 0 Rows geloescht
- Coolify-Cron-Konfiguration: alle 24h um 03:00 UTC

**Aufwand:** ~1-2h inkl. Cron-Setup auf Coolify.

## Acceptance Criteria

**AC1:** `proposals.value` ist aus `followup-engine.ts` entfernt; `total_gross` wird stattdessen verwendet.

**AC2:** Container-Log nach Deploy zeigt keine `column proposals.value does not exist`-Fehler mehr in 24h Beobachtungs-Fenster.

**AC3:** Vitest-Suite enthaelt mindestens einen Test der die FollowupEngine-Open-Proposals-Query auf das richtige Feld prueft.

**AC4:** `/api/cron/click-log-cleanup` existiert und reagiert auf POST mit `Authorization: Bearer $CRON_SECRET`.

**AC5:** Endpoint loescht `campaign_link_clicks`-Eintraege aelter 90 Tage und schreibt Audit-Log-Zeile.

**AC6:** Endpoint ist idempotent — 0-Row-Lauf erzeugt kein Error.

**AC7:** Coolify-Cron-Eintrag ist aktiv (User-Setup) — mind. 1 erfolgreicher Lauf in Coolify-Cron-Log oder Container-Log nach 24h sichtbar.

**AC8:** Vitest 393/393 (oder mehr) PASS nach allen Aenderungen.

## Out of Scope

- Hard-Delete vs. Soft-Delete-Diskussion: V6.4 nutzt Hard-Delete weil Retention klar 90 Tage ist und kein Recovery-Pfad noetig.
- Retention-Konfiguration ueber UI: 90-Tage-Wert ist Code-Konstante, kein Settings-Feld.
- Andere AI-Engines mit Schema-Drift (Briefing, Signal-Extract) — wenn vorhanden, dann als FEAT-642 Befund.
- Multi-Tenant-Retention — V6.4 ist Single-User Internal-Test-Mode.

## References

- ISSUE-057 in `/docs/KNOWN_ISSUES.md`
- BL-423 in `/planning/backlog.json`
- V5.2 COMPLIANCE.md fuer Retention-Pattern
- V5.5 `cockpit/src/app/api/cron/expire-proposals/route.ts` als Implementation-Template
- RPT-331 Post-Launch-Review fuer Diagnose-Kontext
